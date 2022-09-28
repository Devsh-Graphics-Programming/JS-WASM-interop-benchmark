mergeInto(LibraryManager.library, {
    StartBenchmark: function () {
        console.log("Starting benchmark");
        const SIZE = 1 << 20;
        var a = Array.from({ length: SIZE }, (_, i) => i);
        var x = 0;

        var do_something_with_array = Module.cwrap("do_something_with_array", null, ["array", "number"]);
        for (var i = 0; i < 40; i++) { //WARMUP
            Module.ccall("do_something_with_array", null, ["array", "number"], [a, SIZE]);
            do_something_with_array(a, SIZE);
        }
        console.log(SIZE + " Array length");
        console.log("With warmup");


        var t = performance.now();
        for (var i = 0; i < 1000; i++) {
            Module.ccall("do_something_with_array", null, ["array", "number"], [a, SIZE]);
        }
        t = performance.now() - t;
        console.log(t + " ms");

        console.log(a[0xbeef]);
    },

});