# Report on Handling of Arrays by C++ and C# in WASM

Three classes of approaches:
- Use a regular JavaScript array and pass C++ or C# function
- Force JavaScript to populate container defined in C++ or C# and use it
- Allocate from WASM native heaps, populate with JavaScript

_The last approach is only possible for Plain Old Data types like floats and integers. It is also not very practical due to having to hand-write what essentially amounts to serialization of a JS object to a WASM memory heap._

## Glossary of Acronyms

JS = JavaScript

POD = Plain Old Data (C++/C# built in types of fixed size)

TS = TypeScript

WASM = Web Assembly

## Our Conclusion

C# is not a viable target for a Library whose functions can accept objects larger than a few bytes.

Using a C# container with TS/JS bindings is an illusory solution as this moves the function call overhead from the C# function calls which accept the large object as an argument, to any and all manipulation of said object on the JS side.

Also the fact that C# throws exceptions when given an argument thats too large to serialize, is of grave concern.

## Results

|     Approach     | Initialization Time (us) | Execution Time (us) |
|  --------------  |  ----------------------  |  -----------------  |
| JS Array to C++  | 99202                    | 7421                |
| JS Array to C#   | 99202                    | 18 932 821          |
| JS populates C++ Container |                |                     |
| JS populates C# Container | 77 852 050      | 384 100             |
| JS populates HEAPF32, C++ |                 |                     |
| JS populates HEAPF32, C# |                  |                     |

**IMPORTANT: The "JS Array to C#" method caused a runtime exception when the input size >= 128MB. We suppose its because the JSON serialization uses up a non-trivial amount of WASM transient memory.**

### Methodology

We created a 4MB array of floats and passed them to a C++ or C# function which multiplied all elements by a constant. 

First a warmup loop of 40 iterations was executed before measuring the 1000 loops, we discarded the first run of the benchmark to account for V8 TurboFan optimizations.

Result is the average time taken to execute one call in the 1000 iteration loop.

## Discussion

The web WASM runtime cannot access any JavaScript object except those that live within the WASM module's runtime. This affects both C++ and C#.

**TL;DR:** WASM code ran in a browser behaves similarly to a Virtualized OS ran on a Host OS. JavaScript can manipulate objects within the WASM runtime, and WASM can _at most_ invoke JS functions.

This behaviour is the result of WASM not yet allowing for direct DOM manipulation, direct Web API usage, nor is aware of Garbage Collection of the JavaScript runtime. The latter would be required to access and manipulate JS objects without them getting relocated or freed, similar to how C++ and C# interop works with pinned handles.

### JavaScript arrays are "kind of" typed

TL;DR There are no "real" arrays to work with JavaScript, an array is always an array of pointers/references so there are _no contiguous_ arrays of non-POD types like in C.

_Of course there's stuff like `Float32Array` but this is what we mean by JS arrays being "typed" and refusing to call the others real arrays._

Because JS typeless, it means the type of any element in an array can mutate, ergo non-contiguity of storage and an indirect reference.

### Argument Passing

As a corollary of the above, there are only three ways to pass data between JS and WASM:
1. Accept JS Array as input and make a temporary copy of it into the WASM `ubyte` heap, then invoke the C++ or C# function with a pointer
2. Have JS create a C++ or C# container and invoke a C++ or C# method of said container to access one element at a time for initialization or readback
3. Have JS create a WASM heap/memory allocation, write directly to it (for non-POD it means serialization) reinterpret the offset of the allocation as a pointer and pass it to any C++ or C# function

Note: You might think that approach 2 suffers from the same "copy JS variable to WASM stack" issue as approach 1, however WebAssembly API actually passes POD arguments with no overhead.

### C#

Blazor (and Mono-WASM) support invoking methods only if the arguments are JSON-serializable, there's no other alternative.

Understandably serializing a 4MB object (an array) to JSON is insanity, hence why the JS Array approach is so slow on this platform.

As Handles/Pointers to C# objects are serializable to JSON as they're plain numbers, so this explains the speedup gained by passing a C# container to the execution method. However the overhead of JSON serialization just gets shifted to the function initializing the object. This way is also much slower.

Another large concern of using JSON serialization is the memory usage. At one point of time, the peak memory usage to pass the 4 MB array to .NET function reaches huge numbers as:
- the original array is stored in the memory (4MB)
- array serialized to a JSON string is stored on JS side (~ x5 the original memory)
- the json string is then copied to .NET memory (another ~x5)
- a .NET copy of the float array is created (4MB)

the 4.194.304 byte float array serialized to 19.277.814 bytes of JSON


### C++

Calling C++/wasm functions from JS

1. Expose generic C++ container type
   You can use embind to expose the constructor and a some methods of `std::vector<float>` such as push_back and then initialize it directly is JS, pusing the array elements into the vector.
   The idea is to expose the structure with `EMSCRIPTEN_BINDINGS` and pass a pointer to it as an argument when invoking the C++ function 



2. WASM Heaps 
   There exist heaps accessible from JS that only accept a few types: unsigned & signed ints 8-64 bit, and floats 32-64 bit. 
   You can write JS array directly onto wasm's heap if the type is one of the aforementioned.
   It is really fast but requires use of `Module["_malloc"]` and `Module["_free"]`
    ```
    var samples = new Float32Array(1024);
    var buffer = Module._malloc(1024*4); //4=sizeof(float)
    Module.HEAPF32.set(samples, buffer >> 2); (div ptr by sizeof(float) when using HEAPF32)
    Module._free(buffer);
    ```


5. CCALL
    The ccall is a function in JS that can call C/C++ functions with C wraps

    It has three args 
    a) function name (can be mangled)
    b) return type = [null, number, string, array (only byte arrays)]
    c) TUPLE
      - array of argument types [null, number, string, array (POD)]
      - array of argument values

    compile with `-s EXTRA_EXPORTED_RUNTIME_METHODS=['ccall','cwrap']` in order to have ccall exported to JS

    example usage
    ```
    const result = Module.ccall('Add',
    'number',
    ['number', 'number'],
    [1, 2]);
    ```


## Trivia

### Couple more ways to reach the goal in C++

1. If the size of the array is known beforehand (at compile time) it is possible to use embind to create a binding for a 
std::array of size N and then pass a JS of the same type and size into the argument of a bound method with that argument.
Every element of the array needs to have a declared indexer before hand so this is not viable for large structures

```
    // Register std::array<int, 2> because ArrayInStruct::field is interpreted as such
    value_array<std::array<int, 2>>("array_int_2")
        .element(index<0>())
        .element(index<1>())
        ;
```

There are overloads of `value_array::element` but they lack documentation. We have asked on emscriptens discord about how to use generic overloads in hopes of finding a way to define indexers for all elements at once but got no answers. 

2. There was an idea to use a npm js package to make using `ccall` easier 
   `npm install wasm-arrays`
but the code there is bound to not work should you use closure compiler that comes with optimization level 2 or above. The problems are
a)  the code uses `Module._malloc`, `Module.ccal` and other cpp functions with the `.` access operator and that in conjunction with name mangling from closure compiler yields undefined methods. The proper way of doing this is `Module["_malloc"]` according to emscripten documentation.
The funcs in C++ still required `extern "C"`
b) explicit exporting funtions with compile parameter `-s EXPORTED_RUNTIME_METHODS=[ccall,cwrap]`. This is not listed in the install manual of the package.
c) the example code from readme did not work due to a)  