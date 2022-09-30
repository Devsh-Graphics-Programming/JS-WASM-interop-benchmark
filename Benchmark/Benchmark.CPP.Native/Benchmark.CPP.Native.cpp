#include <iostream>
#include <chrono>
#include <tuple>

constexpr int size = 1 << 20;
constexpr int iters = 1000;
constexpr long long runs = 50;


extern "C" {
    void do_something_with_array(float* ptr, int len)
    {
        for (size_t i = 0; i < len; i++)
        {
            ptr[i] *= float(i) + 0.123456789f;
        }
    }
}

std::tuple<long long, long long> run_test()
{
    
    auto start = std::chrono::high_resolution_clock::now();
    float* arr = (float*)malloc(size * sizeof(float));
    for (size_t j = 0; j < iters; j++)
    {
        for (size_t i = 0; i < size; i++)
        {
            arr[i] = float(i);
        }
    }
    auto end = std::chrono::high_resolution_clock::now();
    auto duration = end - start;
    auto init_duration_ms = std::chrono::duration_cast<std::chrono::milliseconds>(duration).count();

    start = std::chrono::high_resolution_clock::now();
    for (size_t i = 0; i < iters; i++)
    {
        do_something_with_array(arr, size);
    }
    end = std::chrono::high_resolution_clock::now();
    duration = end - start;
    auto loop_duration_ms = std::chrono::duration_cast<std::chrono::milliseconds>(duration).count();
    free(arr);

    return std::make_tuple(init_duration_ms, loop_duration_ms);


}

int main()
{
    long long loop_duration_total = 0, init_duration_total = 0;
    for (size_t i = 0; i < runs; i++)
    {
        auto tuple = run_test();
        init_duration_total += std::get<0>(tuple);
        loop_duration_total += std::get<1>(tuple);
    }

    std::cout << "Average init duration:  " << init_duration_total / runs << " ms\n";
    std::cout << "Average loop duration:  " << loop_duration_total / runs << " ms\n";
}