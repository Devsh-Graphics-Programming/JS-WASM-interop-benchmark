#include <iostream>
#include <chrono>

extern "C" {
    void do_something_with_array(float* ptr, int len)
    {
        for (size_t i = 0; i < len; i++)
        {
            ptr[i] *= float(i + 3u);
        }
    }
}



int main()
{
    constexpr int size = 1 << 20;
    auto start = std::chrono::high_resolution_clock::now();
    float* arr = (float*)malloc(size * sizeof(float));
    for (size_t i = 0; i < 1000; i++)
        for (size_t i = 0; i < size; i++)
        {
            arr[i] = float(i);
        }
    auto end = std::chrono::high_resolution_clock::now();
    auto duration = end - start;
    std::cout << std::chrono::duration_cast<std::chrono::milliseconds>(duration).count() << std::endl;
    std::cout << "Starting benchmark!\n";

    start = std::chrono::high_resolution_clock::now();
    for (size_t i = 0; i < 1000; i++)
    {
        do_something_with_array(arr, size);
    }
    end = std::chrono::high_resolution_clock::now();
    duration = end - start;
    std::cout << std::chrono::duration_cast<std::chrono::milliseconds>(duration).count() << std::endl;

    std::cout << arr[rand() % size] << "\n";
}