# Report on Handling of Arrays by C++ and C# in WASM

Three classes of approaches:
1. Use a regular JavaScript array and pass C++ or C# function
2. Force JavaScript to populate container defined in C++ or C# and use it
3. Allocate from WASM native heaps, populate with JavaScript

_The last approach is only possible for Plain Old Data types such as structs made of floats and integers. It is also not very practical due to having to hand-write what essentially amounts to serialization of a JS object to a WASM memory heap._

## Glossary of Acronyms

AoT = Ahead of Time compilation (transpiling the C# IL to native, static linking and linktime optimizing it with the runtime's native code, as part of the build step or while running the JIT version to hotswap with later)

IL = Intermediate Language (can be interpreted by runtime)

JIT = Just In Time compilation (compiling the IL to native while loading the module or library containing it, or even during runtime while interpreting)

JS = JavaScript

GC = Garbage Collector (can be either the C# runtime's or JS runtime's)

POD = Plain Old Data (C++/C# built in types of fixed size)

TS = TypeScript

WASM = Web Assembly

## Our Conclusion (TL;DR)

#### DISCLAIMER: We sincerely hope for Mono-WASM's sake we did something wrong, its likely as our knowledge of C++ exceeds C# and JS

In our opinion C# is not a viable target for developing a WASM Library whose intended API usage results in bandwidth of more than a few _tens of kilobytes/s_ or a few thousand function calls per second. _There's a 1000-fold speed difference in the overhead for both function invocation and argument passing._

### Approach 1

The bandwidth attained during argument passing is abysmal (2.5 MB/s on a Ryzen 7 3800x, 235 KB/s on a Core i5 Ultra Low Power), this is due to JSON serialization.

**GRAVE CONCERN: The "JS Array to C#" method caused a runtime exception when the input size is in the low hundreds of megabytes. See our Invoking C# methods from JS section on argument passing for a possible explanation.**

### Approach 2

Using a C# container with TS/JS bindings (approach 2: pass reference to C# object as argument) is an illusory solution as this moves the overhead from the data processing C# function calls, to any and all manipulation of said object on the JS side, primarily the initialization. In our example the overhead incurred from fine grained element access is far greater than from batch serialization during argument passing.

### Approach 3

Using `HEAPF32` in C# basically amounts to working from a C-like `unsafe` pointer to an array, hence the similar performance to C++. Please note the key difference with approach 2, which is that almost the entire C# runtime is sidestepped for the passing of arguments with the sole exception being made to call the benchmark function's entry point.

In order to leverage this approach in production, one needs to write their own JS bindings (because invoking C# methods has too much overhead) that operate directly on the byte representations of C# objects in the WASM HEAP while the object memory location is pinned (so the GC does not move it halfway through) and a stable memory address can be obtained. As far as we know, no tool to automate this process exists and frankly we're of the opinion that such a tool should have been available in the first place as part of the Blazor framework's toolbox.

Furthermore we'd consider this approach to be practically identical to using C++ at that point, as one would lose most advantages of C# such as GC, use heaps of `unsafe` code and the whole process would resemble C# to unmanaged code interop with `GCHandle`.

Our only _sane_ recommendation to provide an environment to "implement object methods in C#", would be to "declare the Interface in C++ with Embind JS bindings, use SWIG with Directors, inherit and implement in C#". This is the only fully-automated, zero duplicate code maintenance solution for which tooling exists as of October 2022.

See our Analysis section for a discussion of possible reasons why this C# apprach is faster than both C# Native and C++ WASM only.

## Results

|     Approach     | Initialization Time (us) | Execution Time (us) |
|  --------------  |  ----------------------  |  -----------------  |
| C++ Native       | 249                      | 706                 |
| C# Native        | 1880                     | 2490                |
| C++ WASM only    | 1390                     | 1460                |
| C# WASM only     | 3620                     | 7400                |
| JS Array to C++  | 493                      | 2900                |
| JS Array to C#   | 493                      | 1680000             |
| JS populates C++ Container | 11900          | 1210                |
| JS populates C# Container | 83000000        | 1560                |
| JS populates HEAPF32, C++ | 1570            | 1690                |
| JS populates HEAPF32, C# | 1660             | 1170                |

## Building and Running (TODO)

The following VS2022 components need to be installed:
- .NET WebAssembly Build Tools
- ASP.NET and web development prerequisites
- Emscripten Build Support for Visual Studio 2022 (Extension by KamenokoSoft)

### Methodology

We created a 4MB array of floats and passed them to a C++ or C# function which multiplied all elements by a `(i+3)`. 

First we initialized the 4MB array with an `std::iota` like sequence, 1000 times over.

Secondly a warmup loop of a few iterations was executed before measuring the execution time of 1000 loops, we discarded the first run of the benchmark to account for V8 TurboFan cached AOT compilation optimizations.

Results are the average time taken to execute one initialization or execution call in the 1000 iteration loop.

The tests ran in order to obtain the above timings were on a machine with Ryzen 7 3800x and in the Chrome browser.

The C++ compiled code had SSE and O3 enabled both natively and in Emscripten.

The C# was build with all optimization flags available in VS2022, it targetted .Net 6.0 and hence AoT was available only for WASM target. Fully published builds were used for benchmarking.

## Analysis

### Differences between C++ and C# when running in Native

As we targeted .Net 6.0 and not 7.0, there's no AoT available for C# on x64, so our benchmark ran either interpreted or JITed straight from the `.dll` containing the IL. Because of the relative shortness of the benchmark, any on-line JIT while running the interpreted IL would not help.

The C# build did not show any signs of assignment tracking or loop analysis optimization. In C++ we had to put a `rand()%SIZE` readback of the array to fight the optimizer, otherwise the loops would get optimized out to take 0 seconds to complete. We should probably analyze the generated assembly to ensure all C++ compiler's attempts to optimize away loops have been thwarted. This is in stark contrast to C#'s behaviour.

Furthermore we did not find any flag or switch that would control the level of SIMD intrinsics emitted or autovectorization like in C++, the difference between the speed looks like a standard 3-4x difference from using SSE in iterating an array of 32 bit numbers and performing multiplication and addition.

The massive speed difference in intialization of the array could be explained by C++ applying "fast math" SIMD integer to float conversion intrinsics and C# using the precise version or assignment tracking by the optimizer.

Another possibility is loop unrolling which usually makes the job easy for an autovectorizer during codegen.

#### Passing the `float[]` by `ref` or `in` was 2x slower

We don't know why [this is the case, it would be nice if we got enlightened by someone who knows C# better](https://github.com/Devsh-Graphics-Programming/JS-WASM-interop-benchmark/blob/140a46a4654e654359e4fc7c37813ffdba2942bc/Benchmark/Benchmark.CS.Native/Program.cs#L22).

### Differences between C++ Native and WASM only

WASM Modules define their functions in terms of an IL which itself is never interpreted, but instead compiled to some form of native code.

To make the modules load "fast" the Chrome V8 Engine first JIT compiles them with very little optimization, followed by AoT in the background which is only cached if the resulting module surpasses 128kb, which our C++ benchmark does not surpass. This could be why the slowdown is more pronounced during the initialization loop.

Furthermore WASM has a very limited support of SSE intrinsics and probably can't trust any alignment declarations (like those given by `malloc` on almost all 64bit platforms) to of pointers a 16 byte boundary for security reasons such as possible CPU exploits, therefore Clang's autovectorizer will not do as good of a job as MSVC's. The slowdown looks similar to what we'd see when SSE register loads are being replaced with unaligned variants.

### Differences between C# Native and WASM only

This one appears very confusing given that the difference against Approach 3 is only in the data type being a `float[]` instead of a `float*` and the initialization of the array taking place in JS.

It might be that `operator[]` on a `float[]` performs some range checks or suffers some other overhead compared to an `unsafe` `float*`.

We're very baffled and would appreciate any explanation from anyone else.

### JavaScript arrays are "kind of" typed

**TL;DR** There are no "real" arrays to work with JS, an array is always an array of pointers/references so there are _no contiguous_ arrays of non-POD types like in C.

_Of course there's stuff like `Float32Array` but this is what we mean by JS arrays being "typed" and refusing to call the others real arrays._

Because JS is typeless, it means the type of any element in an array can mutate, ergo non-contiguity of storage and and resulting indirect reference.

### How the Browser WASM Runtime works and its limits

#### Pseudo-Virtualization

The any WASM code lives inside of a WASM Module object and can only access the objects created by the WASM Runtime APIs, with the only notable exception of being able to call a JS function, but only with arguments that come from WASM runtime. These APIs are JS APIs.

As both C++ and C# compile to WASM directly or indirectly via Emscripten (C#'s only WASM runtime is Mono-WASM that compiles with Emscripten), the above limitation concerns both of them.

**TL;DR:** WASM code ran in a browser behaves similarly to a Virtualized OS ran on a Host OS. JavaScript can manipulate objects within the WASM runtime, and WASM can _at most_ invoke JS functions.

This behaviour is the result of WASM not yet allowing for direct DOM manipulation, direct Web API usage, nor is it yet aware of the JS runtime's GC. The latter would be required to access and manipulate JS objects without them getting relocated or freed, similar to how C++ and C# interop works with pinned handles.

#### How can one pass an array argument to a WASM function?

As a corollary of the above, there are only three ways to pass our benchmark's data between JS and WASM:
1. Accept JS Array as input and make a temporary copy of it into the WASM heap, then invoke the WASM function with a "memory address" within the heap
2. Have JS create a C++ or C# container and invoke a C++ or C# method of this container to initialize or readback, accessing one element at a time
3. Have JS create a WASM heap/memory allocation, write directly to it (for non-POD it means serialization) then follow approach 1 for the rest

_Note: You might think that approach 2 suffers from the same "copy JS variable to WASM stack" issue for the container's methods as approach 1, however WebAssembly API can actually passes single POD arguments with no overhead._

**Important: Approach 2 does not actually save us any memory on temporary copies, because using `HEAP___.set` one value at a time is really slow compared to setting large parts of the heap at once from a regular JS array.**

#### There's no inlining or link-time optimization across the JS-WASM boundary

Naturally due to the fact that WASM Modules are manipulated from JS at runtime, and this manipulation means at least downloading (streamed), validating and compiling (JIT and AOT), link time optimization and inlining of function calls across the JS-WASM boundary is for now precluded.

### How C++ runs on the Web

#### Emscripten is the only feature complete WASM compiler for C and C++

Initially started as a project to transpile C++ to JS, it has evolved to target WASM as well.

However due to aformentioned DOM and WebAPI access limitations of WASM and the legacy of targetting JS directly, large parts of the standard library (and other libraries such as OpenGL ES) are implemented in JavaScript functions which have shim export C-API headers that invoke them and are imported by WASM.

#### WASM is a 32bit architecture

There's an `sMEMORY` switch in emscripten to disable the default `sizeof(void*)==4`, however using `sizeof(void*)==8` breaks most things and can't be used in production. There's also an option to "emulate 64 bits" by adding some instructions that cast pointers between 32bit and 64bit when leaving the module boundary.

#### Emscripten uses Clang as a C++ compiler backend

Emscripten basically only provides the C and C++ standard and some other "system" libraries and then does codegen from Clang's IR.

#### Invoking C++ functions from JS

Generally speaking the generated WASM is structurally similar to the contents of a Shared Library compiled for Native by Clang, the exported functions and methods follow the same name mangling scheme to deal with overloads and namespaces. There's also code resembling C++ C-API import libraries but in JS using their own pseudo `dlopen`.

If you think about how one would go about transpiling C++ to C, you pretty much get the idea of how C++ is compiled to WASM.

Generally speaking JS can invoke a WASM function passing only POD types as arguments, this includes pointers (an address within a WASM runtime's heap) as they're just integer offsets. Plain old C-API style.

When wishing to "push" JS objects across into a WASM function, they need to be serialized into a WASM Heap and deserialized out of it, in the case of C/C++ this becomes a simple copy as the prelude and postlude to a function invocation and the object reference is simply an offset to the temporary allocated in the WASM Heap.

Emscripten's runtime JS library has a wrapper for this called `ccall` which can invoke C/C++ functions with C wraps and has optimized implementations for passing arguments and return types which are strings or arrays. `ccall` itself has three arguments:
1. function name (can be mangled)
2. return type = [null, number, string, array (only byte arrays)]
3. TUPLE
      - array of argument types [null, number, string, array (POD)]
      - array of argument values
There's also `cwrap` which can bake all this up-front into a single JS object with a `operator()` which makes not only makes the call-site appear pretty but can also make repeated calls faster. 
**The code needs to compiled with `-s EXTRA_EXPORTED_RUNTIME_METHODS=['ccall','cwrap']` in order to make this available.**

_If you pass a JS object as a `string` or `array`, Emscripten will handle allocation of space in the WASM Heap and copying the JS object in and out of it._

But Emscripten provides us with more mechanisms to make interop with C++ easier than writing C-API bindings for our code. We can resort to exposing a C++ objbect and some of its methods using Embind with `EMSCRIPTEN_BINDINGS`, this effectively creates all the `cwrap/ccall` JS glue code for us. We basically get a JS class with a matching name and methods which simply forwards all method implementations to the C++ name-mangled C functions.

If you expose the constructor then you can initialize it directly is JS and pass it either by copy or pointer when invoking some other C++ function.

**Using `ccall/cwrap` has an important downside, the tuple is always serialized and allocated compactly, meaning that calling a method with just 2 `number` arguments always causes Emscripten's runtime to `malloc` space for the 8 bytes of arguments.**

### How C# runs on the Web

#### Mono is the only runtime available when targetting WASM

Blazor and Unoplatform are the two functional C# SDKs for the web, however both of them rely on Mono-WASM's C# runtime.

#### All C# code is eventually compiled by Emscripten - yes you read this right

You might be used to thinking that C# is an IL embedded in a DLL and only the runtime's components are "true" native libraries with C or C++ sources.

And yes, while a native C# runtime can JIT your C# IL to the runtime binary's platform's native assembly via custom codegen much simpler than cross compilation to C or C++, Mono does not have such an option for now.

However AOT compilation completely flips the script on this, because it allows your C# IL to be turned into a compiled into a regular library which can then be link-time and whole-program optimized (eg. inlining across libraries) when statically linked against the runtime library. The runtime itself can also shake off unused functions. Unity has been doing AOT C# for a long time now with IL2CPP.

Mono can AOT compile your C# IL, which Blazor does when you "Publish" your project to a webserver if you enabled that option. It also autogenerates some C and C++ transient sources and needs to compile them with Emscripten, if you use some C# features like passing delegates to unmanaged code ([which doesn't seem to work anyway](https://github.com/dotnet/runtime/issues/56145) except for `MonoPInvokeCallback` static delegates).

Naturally with Emscripten being the only proven way to compile C and C++ this means that all of your C# code (runtime and your program IL) is compiled using Clang or at least linked using `wasm-ld` from the Emscripten SDK (if/when Mono build the LLVM IR straight from C# IL).

#### AoT is available when targeting WASM but not Native

.Net 7.0 has AoT planned for Native, but Mono-WASM already has it.

_As an interesting corollary this means that features such as LTO, inlining and even autovectorization "should" be possible._ 

#### Invoking C# methods from JS

Blazor (and Mono-WASM) support invoking methods only if the arguments are JSON-serializable, there's no other alternative in .Net 6.0

If you're interested about .Net 7.0 [skip to the bottom](Errata) section.

Aside from serialization deserialization speed, a large concern of using JSON serialization is the memory usage. In our example, the peak memory usage can surpass 5.5x or even 21x of the original, depending on when the GC kicks in to clean up the temporary JSON strings.

This is the breakdown of memory allocations:
- original JS object in memory as used for the input
- object serialized to a JSON string is stored on JS side (for a float array, its ~4.6x the original memory)
- the JSON string is then copied to .NET string which is a WASM heap (another copy of the above, see the reason in the "How can on epass an array argument to a WASM function" it applies to strings as well)
- the .NET string must be deserialized to a .NET instance of the object

But then if you're passing the object by reference you must "copy in, copy out" just like GLSL, so you're looking at creating the two JSON serialization strings on the way back from the function.

When we tried to benchmark a 128MB array, a single iteration of our benchmark loop could use between 1.3GB and 2.7GB of memory (probably the former as I'd expect GC to kick in when running out of memory). Given these numbers we're no longer surprised C# threw an OOM exception when passing a 128MB array.

## Corollary Results

### All your code passes through Emscripten and Clang

Doesn't matter what language or runtime you use, in the end your code is either compiled by or interpreted using a runtime compiled by Emscripten and Clang. 

### C++ and C# function invocation overheads

This is why it was useful for us to have single language versions of the benchmarks, such as JS-only initialization of arrays or WASM-only execution of the benchmark loop. By looking at the delta's between the times we can examine the overheads.

#### Function call with minimal amount arguments

For the purpose of language interop, non-static class methods need at least a pointer/handle to the object they're supposed to operate on, hence why we don't have timings for void functions with no arguments. This means there's still some JSON serialization overhead in C#.

We discard any timing comparison against Approach 1 initialization loop as it uses some syntax sugar to initialize a JS array which can be very easily optimized, cached and JIT or AOT compiled to reach near native performance. However the difference between JS populating HEAP32 and the C++ or C# container gives us a very reliable result, as the population of the 4MB array requires JS to call the container method a million times per iteration loop with only one argument.

The difference discussed above and [this little piece of testing code](https://github.com/Devsh-Graphics-Programming/JS-WASM-interop-benchmark/blob/214f2483ad0aa73d55ff576887e62cc91f0c622a/Benchmark/Benchmark.CS/Client/Pages/TestHeapAllocation.razor#L15) give us a 83-82 _microsecond_ overhead for invoking a C# static method, probably due to JSON serialization of arguments.

The difference discussed and the difference between C++ WASM only initialization and JS populating the C++ container give us an overhead of about 118-120 _nanoseconds_ for invoking a C++ function.

You might notice that the execution of the C# benchmark is faster than C++ when the JS has already populated the container, this is because Mono does not JSON serialize the `DotNetObjectReferece` of the container and the method which runs the benchmark takes no arguments so JSON serialization is skipped. Meanwhile C++ uses `Module.ccall` which always copies the arguments to a `malloc`ed section of the WASM Heap in the JS prelude of the WASM function call, the previously calculated overhead in the order of ~100ns is very similar to the cost of a small `malloc` call on a native platform. Any futher gains in perf may be explained by the C# WASM module generated via C# compiler's AOT upon publishing being large enough (6mb due to Mono runtime getting statically linked) to prompt V8 to cache its WASM AOT to Native compilation.

To put things into perspective, a single C# method invoke is about as expensive as a GPU Kernel/ComputeShader launch/dispatch, while a C++ method invoke is on the order of a single byte `malloc` or a kernel call (mutex lock, getpid, etc.). The difference is tens of thousands of function calls vs tens of millions ona  Ryzen 7 3800x, which becomes very pronounced when you want to do something on a low power device or at high FPS such as scrolling content for reading or rendering VR/XR.

#### Function call with large amount arguments

Here we take the Execution Time of Approach 1 (JS Array) after subtracting the best WASM speed (usually the WASM-only benchmark) and the function call overhead which is non negligible in C#.

# For C++ this bandwidth appears to be around 2.8GB/s while C# achieves a 2.5MB/s

## Trivia

### Couple more ways to reach the goal in C++

1. If the size of the array is known beforehand (at compile time) it is possible to use embind to create a binding for a 
std::array of size N and then pass a JS of the same type and size into the argument of a bound method with that argument.
Every element of the array needs to have a declared index beforehand so this is not viable for large structures (also it would probably kill the compiler)

```
    // Register std::array<int, 2> because ArrayInStruct::field is interpreted as such
    value_array<std::array<int, 2>>("array_int_2")
        .element(index<0>())
        .element(index<1>())
        ;
```

There are overloads of `value_array::element` but they lack documentation. We have enquired on emscriptens discord about how to use generic overloads in hopes of finding a way to define indexers for all elements at once but got no answers. 

2. There was an idea to use a npm js package to make using `ccall` easier 
   `npm install wasm-arrays`
but the code there is bound to not work should you use closure compiler that comes with Emscripten's optimization level 2 or above. The problems are:
- The code uses `Module._malloc`, `Module.ccall` and other cpp functions with the `.` access operator and this in conjunction with name mangling from closure compiler yields undefined methods. The proper way of doing this is `Module["_malloc"]` according to emscripten documentation.
- the example code from readme did not work due to the above
- The functions in C++ still require `extern "C"` and explicit exporting funtions with compile parameter `-s EXPORTED_RUNTIME_METHODS=[ccall,cwrap]`. This is not listed in the install manual of the package.  

# Errata

If you feel like we got something wrong, open a PR, we much appreciate any insight.

## We're not sure if WASM .Net 6.0 uses Reflection or Source Generation based JSON Serialization

Apparently there's a way to make `System.Text.Json` [generate the serialization and deserialization at compile time](https://learn.microsoft.com/en-us/dotnet/standard/serialization/system-text-json/source-generation) we found this out after completing the benchmark. 

While its possible that it could improve the speed of argument passing greatly, its unlikely to get within one order of magnitude of C++ argument passing, since the latter is a plain `memcpy`.

#### Also it wont alleviate any problems with the memory consumption during the function call.

We also have no idea if and how it works in Mono-WASM.

## Missed .Net 7.0 C# approach

We could also [try this fast path](https://learn.microsoft.com/en-us/aspnet/core/blazor/javascript-interoperability/call-dotnet-from-javascript?view=aspnetcore-6.0#byte-array-support) but it would require a manual overload of the C# function which would reinterpret the byte array as a float array.

However this method is not viable for dealing with any other argument but a primitive type, the rest would require passing `GCHandle`s around.
