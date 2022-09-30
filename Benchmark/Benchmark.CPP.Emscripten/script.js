

mergeInto(LibraryManager.library, {

    Benchmark_functionCallsWithArrayArgument: function () {
        const SIZE = 1 << 20;
        const ITERS = 1000;
        const WARMUP = 5;
        console.log("Starting benchmark: Emscripten inter-lang function calls with array argument");
        console.log(SIZE + " Array length");
        console.log("With warmup");

        var testArray = Array.from({ length: SIZE }, (_, i) => i);
        {
            var timestamp = performance.now();
            for (var i = 0; i < ITERS; i++)
                for (var j = 0; j < SIZE; j++)
                    testArray[j] = j;
            var initializationDuration = (performance.now() - timestamp) + " ms";
            console.log("done with initialization testing, result is " + initializationDuration);
        }

        var testFunc = Module.cwrap("wasm_benchmark_test_array", null, ["array", "number"])
        for (var i = 0; i < WARMUP; i++)
            testFunc(testArray, SIZE);

        {
            var timestampt = performance.now();
            for (var i = 0; i < ITERS; i++)
                testFunc(testArray, SIZE);
            var loopDuration = performance.now() - timestampt;
            console.log("Function calls: " + loopDuration);
        }
    },

    Benchmark_exposedGenericCollectionToJS: function () {
        const SIZE = 1 << 20;
        const ITERS = 1000;
        const WARMUP = 5;
        console.log("Starting benchmark: Emscripten inter-lang function calls with JS-exposed generic collection as argument");
        console.log(SIZE + " Array length");
        var testVector = new Module["vector_float"]();
        for (var j = 0; j < SIZE; j++)
            testVector.push_back(j);

        {
            var timestamp = performance.now();
            for (var i = 0; i < ITERS; i++)
                for (var j = 0; j < SIZE; j++)
                    testVector.set(j, j);
            var initializationDuration = (performance.now() - timestamp) + " ms";
            console.log("done with initialization testing, result is " + initializationDuration);
        }

        {
            var timestampt = performance.now();
            for (var i = 0; i < ITERS; i++)
                Module['wasm_benchmark_test_vector'](testVector);
            var loopDuration = performance.now() - timestampt;
            console.log("Function calls: " + loopDuration);
        }


    },
});