

mergeInto(LibraryManager.library, {

    Benchmark_functionCallsWithArrayArgument: function () {
        const SIZE = 1 << 20;
        const ITERS = 1000;
        const WARMUP = 5;
        console.log("Starting benchmark: Emscripten inter-lang function calls with array argument");

        var testArray = Array.from({ length: SIZE }, (_, i) => i);
        {
            var timestamp = performance.now();
            for (var i = 0; i < ITERS; i++)
                for (var j = 0; j < SIZE; j++)
                    testArray[j] = j;
            var initializationDuration = (performance.now() - timestamp) + " ms";
            console.log("Initialization: " + initializationDuration);
        }

        var testFunc = Module.cwrap("wasm_benchmark_test_array", null, ["array", "number"])
        for (var i = 0; i < WARMUP; i++)
            testFunc(testArray, SIZE);

        {
            var timestampt = performance.now();
            for (var i = 0; i < ITERS; i++)
                testFunc(testArray, SIZE);
            var loopDuration = performance.now() - timestampt;
            console.log("Execution: " + loopDuration);
        }
    },

    Benchmark_exposedGenericCollectionToJS: function () {
        const SIZE = 1 << 20;
        const SIZE_OF_FLOAT = 4;
        const ITERS = 1000;
        const WARMUP = 5;
        console.log("Starting benchmark: Emscripten inter-lang function calls with JS-exposed generic collection as argument");

        var buffer = Module._malloc(SIZE * SIZE_OF_FLOAT);
        var container = new Module["ContainerClass"]();
        {
            var timestamp = performance.now();
            for (var i = 0; i < ITERS; i++) {
                for (var j = 0; j < SIZE; j++) {
                    container.set(j, j);
                }
            }
            var initializationDuration = (performance.now() - timestamp) + " ms";
            console.log("Initialization: " + initializationDuration);
        }
        for (var i = 0; i < WARMUP; i++)
            Module["wasm_benchmark_test_container"](container);


        {
            var timestampt = performance.now();
            for (var i = 0; i < ITERS; i++)
                Module["wasm_benchmark_test_container"](container);
            var loopDuration = performance.now() - timestampt;
            console.log("Execution: " + loopDuration);
        }

        delete container;
    },


    Benchmark_directWasmHeapAllocation: function () {

        const SIZE = 1 << 20;
        const SIZE_OF_FLOAT = 4;
        const ITERS = 1000;
        const WARMUP = 5;

        console.log("Starting benchmark: Emscripten inter-lang function calls with direct WASM heap allocation");
        var testArray = Array.from({ length: SIZE }, (_, i) => i);
        var buffer = Module._malloc(SIZE * SIZE_OF_FLOAT);

        {
            var timestamp = performance.now();
            for (var i = 0; i < ITERS; i++)
                Module.HEAPF32.set(testArray, buffer / SIZE_OF_FLOAT);
            var initializationDuration = (performance.now() - timestamp) + " ms";
            console.log("Initialization: " + initializationDuration);
        }

        var testFunc = Module.cwrap("wasm_benchmark_test_array", null, ["number", "number"])

        for (var i = 0; i < WARMUP; i++)
            testFunc(buffer, SIZE);

        {
            var timestampt = performance.now();
            for (var i = 0; i < ITERS; i++)
                testFunc(buffer, SIZE);
            var loopDuration = performance.now() - timestampt;
            console.log("Execution: " + loopDuration);
        }

        Module._free(buffer);

    },
});