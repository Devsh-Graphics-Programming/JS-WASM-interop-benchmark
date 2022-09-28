const SIZE = 1 << 20;
const ITERS = 1000;





StartBenchmark1 = () => {
    console.log("starting benchmark 1");
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
        console.log("starting function call measuring warmup (5 function calls)");
        for (var i = 0; i < 5; i++) {
            var T_warmup = performance.now();
            DotNet.invokeMethod("Benchmark.CS", "TestMethod1", a);
            var duration = (performance.now() - T_warmup) + " ms";
            console.log("Iteration" + i + ": " + duration);

        }
    }
    {
        console.log("starting function call measuring (" + ITERS + " iterations)");
            var T_start = performance.now();
        for (var i = 0; i < ITERS; i++) {
            DotNet.invokeMethod("Benchmark.CS", "TestMethod1", a);
        }
        var duration = (performance.now() - T_start) + " ms";
        console.log("Iteration" + i + ": " + duration);
        result += " Func calls: " + duration;
    }


    return result;
};









StartBenchmark2 = (containerRef) => {
    console.log("starting benchmark 2");
    console.log("starting array initalization measuring");

    var result = "Initialization : ";
    {
        var T_init_start = performance.now();
        for (var i = 0; i < ITERS; i++) {
            containerRef.invokeMethod('Clear');
            for (var j = 0; j < SIZE; j++) {
                containerRef.invokeMethod('Add', j);
            }
        }
        var duration = (performance.now() - T_init_start) + " ms";
        result += duration;

        console.log("done with initialization testing, result is " + duration);
    }

    {
        console.log("starting function call measuring warmup (5 function calls)");
        for (var i = 0; i < 5; i++) {
            var T_warmup = performance.now();
            containerRef.invokeMethod( "TestMethod2");
            var duration = (performance.now() - T_warmup) + " ms";
            console.log("Iteration" + i + ": " + duration);

        }
    }
    {
        console.log("starting function call measuring (" + ITERS + " iterations)");
        var T_start = performance.now();
        for (var i = 0; i < ITERS; i++) {
            containerRef.invokeMethod("TestMethod2");
        }
        var duration = (performance.now() - T_start) + " ms";
        console.log("Iteration" + i + ": " + duration);
        result += " Func calls: " + duration;
    }


    return result;
};