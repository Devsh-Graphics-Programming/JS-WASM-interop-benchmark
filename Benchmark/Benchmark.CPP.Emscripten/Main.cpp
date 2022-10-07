#include <stdio.h>
#include <emscripten.h>
#include <emscripten/bind.h>
#include <iostream>
#include <tuple>

constexpr size_t V8_TURBOFAN_PADDING_SIZE = 128 << 13;
static const char forceV8TurbofanPadding[V8_TURBOFAN_PADDING_SIZE] = {};
constexpr int size = 1 << 20;
constexpr int iters = 1000;
constexpr long long runs = 5;

extern "C" {
	extern void Benchmark_functionCallsWithArrayArgument();
	extern void Benchmark_exposedGenericCollectionToJS();
	extern void Benchmark_directWasmHeapAllocation();


	EMSCRIPTEN_KEEPALIVE void wasm_benchmark_test_array(float* ptr, int len)
	{
		for (size_t i = 0; i < len; i++)
		{
			ptr[i] *= float(i) + 3;
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
		wasm_benchmark_test_array(arr, size);
	}
	end = std::chrono::high_resolution_clock::now();
	duration = end - start;
	auto loop_duration_ms = std::chrono::duration_cast<std::chrono::milliseconds>(duration).count();
	free(arr);

	return std::make_tuple(init_duration_ms, loop_duration_ms);


}


class ContainerClass {
public:
	float *data;
	ContainerClass() 
	{
		data = (float*)malloc(size * sizeof(float));
	}

	void set(int i, float v) {
		data[i] = v;
	}
};
void wasm_benchmark_test_container(ContainerClass obj)
{
	for (size_t i = 0; i < size; i++)
	{
		obj.data[i] *= float(i) + 3;
	}
}

using namespace emscripten;
EMSCRIPTEN_BINDINGS(benchmark_module) {
	class_<ContainerClass>("ContainerClass")
		.constructor()
		.function("set", &ContainerClass::set);

	function("wasm_benchmark_test_container", &wasm_benchmark_test_container);
}



void Benchmark_wasmOnly()
{
	std::cout << "Running Benchmark_wasmOnly\n";

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



int EMSCRIPTEN_KEEPALIVE main()
{
	Benchmark_wasmOnly();
	Benchmark_functionCallsWithArrayArgument();
	Benchmark_exposedGenericCollectionToJS();
	Benchmark_directWasmHeapAllocation();
	// std::cout << forceV8TurbofanPadding[rand() % V8_TURBOFAN_PADDING_SIZE] << std::endl;
}