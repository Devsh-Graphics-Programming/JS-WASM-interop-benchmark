const SIZE = 1 << 20;
const ITERS = 1000;
const WARMUP = 5;





NativeBenchmark = () => {
    console.log("starting pseudo-native benchmark");
    DotNet.invokeMethod("Benchmark.CS", "PseudoNativeBenchmark", a);
};

JSArrayBenchmark = () => {
    console.log("starting JS Array to C# benchmark");
    console.log("warning, this test is expected to take HOURS");
    console.log("starting array initalization measuring");

    var testArray = Array.from({ length: SIZE }, (_, idx) => idx);
    var resultLog = "Initialization : ";

    {
        var timestamp = performance.now();
        for (var i = 0; i < ITERS; i++)
            for (var j = 0; j < SIZE; j++)
                testArray[j] = j;
        var initializationDuration = (performance.now() - timestamp) + " ms";
        resultLog += initializationDuration;
        console.log("done with initialization testing, result is " + initializationDuration);
    }

    {

        console.log("starting function call measuring warmup (" + WARMUP + " function calls)");
        for (var i = 0; i < WARMUP; i++) {
            var timestamp = performance.now();
            DotNet.invokeMethod("Benchmark.CS", "WasmBenchmarkTestArray", testArray);
            var warmupDuration = (performance.now() - timestamp) + " ms";
            console.log("Warmup Iteration" + i + ": " + warmupDuration);
        }
    }

    {
        console.log("starting function call measuring (" + ITERS + " iterations)");
        var timestamp = performance.now();
        for (var i = 0; i < ITERS; i++)
            DotNet.invokeMethod("Benchmark.CS", "WasmBenchmarkTestArray", testArray);
        var loopDuration = (performance.now() - timestamp) + " ms";
        console.log("Function calls: " + loopDuration);
        resultLog += " Function calls: " + loopDuration;
    }

    return resultLog;
};







CSContainerBenchmark = (containerRef) => {
    console.log("starting C# Container initialized by JS benchmark");
    console.log("starting array initalization measuring");

    var resultLog = "Initialization : ";
    {
        var timestamp = performance.now();
        for (var i = 0; i < ITERS; i++)
            for (var j = 0; j < SIZE; j++)
                containerRef.invokeMethod('set', i, j);
        var initializationDuration = (performance.now() - timestamp) + " ms";
        resultLog += initializationDuration;
        console.log("done with initialization testing, result is " + initializationDuration);
    }

    {
        console.log("starting function call measuring warmup (" + WARMUP + " function calls)");
        for (var i = 0; i < WARMUP; i++) {
            var timestamp = performance.now();
            containerRef.invokeMethod("WasmBenchmarkTestArrayInstanced");
            var warmupDuration = (performance.now() - timestamp) + " ms";
            console.log("Warmup Iteration" + i + ": " + warmupDuration);
        }
    }

    {
        console.log("starting function call measuring (" + ITERS + " iterations)");
        var timestamp = performance.now();
        for (var i = 0; i < ITERS; i++)
            containerRef.invokeMethod("WasmBenchmarkTestArrayInstanced");
        var loopDuration = (performance.now() - timestamp) + " ms";
        console.log("Function calls: " + loopDuration);
        resultLog += " Func calls: " + loopDuration;
    }

    return resultLog;
};