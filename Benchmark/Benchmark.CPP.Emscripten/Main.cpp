#include <stdio.h>
#include <emscripten.h>
#include <emscripten/bind.h>
#include <iostream>

constexpr size_t V8_TURBOFAN_PADDING_SIZE = 128 << 13;
static const char forceV8TurbofanPadding[V8_TURBOFAN_PADDING_SIZE] = {};


extern "C" {
    extern void StartBenchmark();


    EMSCRIPTEN_KEEPALIVE void do_something_with_array(float* ptr, int len)
    {
        for (size_t i = 0; i < len; i++)
        {
            ptr[i] *= float(i) + 0.123456789f;
        }
    }
}

int EMSCRIPTEN_KEEPALIVE main()
{
    StartBenchmark();
    std::cout << forceV8TurbofanPadding[rand() % V8_TURBOFAN_PADDING_SIZE] << std::endl;
}