#include <stdio.h>
#include <emscripten.h>
#include <emscripten/bind.h>
#include <iostream>

//constexpr size_t V8_TURBOFAN_PADDING_SIZE = 128 << 13;
//static const char forceV8TurbofanPadding[V8_TURBOFAN_PADDING_SIZE] = {};


extern "C" {
    extern void Benchmark_functionCallsWithArrayArgument();
    extern void Benchmark_exposedGenericCollectionToJS();


    EMSCRIPTEN_KEEPALIVE void wasm_benchmark_test_array(float* ptr, int len)
    {
        for (size_t i = 0; i < len; i++)
        {
            ptr[i] *= float(i) + 0.123456789f;
        }
    }


    EMSCRIPTEN_KEEPALIVE void wasm_benchmark_test_vector(std::vector<float> vec)
    {
        auto size = vec.size();
        for (size_t i = 0; i < size; i++)
        {
            vec[i] *= float(i) + 0.123456789f;
        }
    }
}

using namespace emscripten;
EMSCRIPTEN_BINDINGS(module) {
    register_vector<int>("VectorFloat");

    function("wasm_benchmark_test_vector", &wasm_benchmark_test_vector);
}


int EMSCRIPTEN_KEEPALIVE main()
{
    Benchmark_functionCallsWithArrayArgument();
    Benchmark_exposedGenericCollectionToJS();
   // std::cout << forceV8TurbofanPadding[rand() % V8_TURBOFAN_PADDING_SIZE] << std::endl;
}