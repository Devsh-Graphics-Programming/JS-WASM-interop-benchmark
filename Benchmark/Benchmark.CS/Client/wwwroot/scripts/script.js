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

    var a = Array.from({ length: SIZE }, (_, idx) => idx);
    var result = "Initialization : ";

    {
        var T_init_start = performance.now();
        for (var i = 0; i < ITERS; i++) {
            a = Array.from({ length: SIZE }, (_, idx) => idx);
        }
        var duration = (performance.now() - T_init_start) + " ms";
        result += duration;

        console.log("done with initialization testing, result is "+ duration);
    }

    {
        console.log("starting function call measuring warmup (" + WARMUP + " function calls)");
        for (var i = 0; i < WARMUP; i++) {
            var T_warmup = performance.now();
            DotNet.invokeMethod("Benchmark.CS", "DoSomethingWithArray", a);
            var duration = (performance.now() - T_warmup) + " ms";
            console.log("Iteration" + i + ": " + duration);

        }
    }
    {
        console.log("starting function call measuring (" + ITERS + " iterations)");
            var T_start = performance.now();
        for (var i = 0; i < ITERS; i++) {
            DotNet.invokeMethod("Benchmark.CS", "DoSomethingWithArray", a);
        }
        var duration = (performance.now() - T_start) + " ms";
        console.log("Iteration" + i + ": " + duration);
        result += " Func calls: " + duration;
    }


    return result;
};







CSContainerBenchmark = (containerRef) => {
    console.log("starting C# Container initialized by JS benchmark");
    console.log("starting array initalization measuring");

    var result = "Initialization : ";
    {
        var T_init_start = performance.now();
        for (var i = 0; i < ITERS; i++) {
            for (var j = 0; j < SIZE; j++) {
                containerRef.invokeMethod('set', i, j);
            }
        }
        var duration = (performance.now() - T_init_start) + " ms";
        result += duration;

        console.log("done with initialization testing, result is " + duration);
    }

    {
        console.log("starting function call measuring warmup (" + WARMUP+" function calls)");
        for (var i = 0; i < WARMUP; i++) {
            var T_warmup = performance.now();
            containerRef.invokeMethod( "DoSomethingWithArray");
            var duration = (performance.now() - T_warmup) + " ms";
            console.log("Iteration" + i + ": " + duration);

        }
    }
    {
        console.log("starting function call measuring (" + ITERS + " iterations)");
        var T_start = performance.now();
        for (var i = 0; i < ITERS; i++) {
            containerRef.invokeMethod("DoSomethingWithArray");
        }
        var duration = (performance.now() - T_start) + " ms";
        console.log("Iteration" + i + ": " + duration);
        result += " Func calls: " + duration;
    }


    return result;
};