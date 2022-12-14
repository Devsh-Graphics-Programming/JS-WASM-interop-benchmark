using System.Diagnostics;
using System.Drawing;

namespace Benchmark.CS.Native
{
	internal class Program
	{
		const int SIZE = 1 << 20;
		const int ITERS = 1000;
		const int RUNS = 50;


		static void benchmark_test_array(float[] array)
		{
			for(int i = 0; i < SIZE; i++)
			{
				array[i] *= i + 0.123456789f;
			}
		}


		//using the "in" keyword passes the argument by reference and as readonly
		//this is 2x slower than without "in"
		static void benchmark_test_array_by_ref(in float[] array)
		{
			for(int i = 0; i < SIZE; i++)
			{
				array[i] *= i + 0.123456789f;
			}
		}


		static Tuple<long, long, long> RunTest()
		{


			Stopwatch stopwatch = new Stopwatch();

			stopwatch.Start();
			float[] testArray = new float[SIZE];
			for(int i = 0; i < ITERS; i++)
			{
				for(int j = 0; j < SIZE; j++)
				{
					testArray[j] = j;
				}
			}
			stopwatch.Stop();
			long timeInit = stopwatch.ElapsedMilliseconds;
			Console.WriteLine("Initialization Elapsed milliseconds: " + stopwatch.ElapsedMilliseconds);

			stopwatch.Start();
			for(int i = 0; i < ITERS; i++)
			{
				benchmark_test_array(testArray);
			}
			stopwatch.Stop();
			long timeLoop = stopwatch.ElapsedMilliseconds;

			Console.WriteLine("Loop Elapsed milliseconds: " + stopwatch.ElapsedMilliseconds);


			for(int j = 0; j < SIZE; j++)
			{
				testArray[j] = j;
			}

			stopwatch.Start();
			for(int i = 0; i < ITERS; i++)
			{
				benchmark_test_array_by_ref(testArray);
			}
			stopwatch.Stop();
			long timeLoopRef = stopwatch.ElapsedMilliseconds;

			Console.WriteLine("Loop (by ref) Elapsed milliseconds: " + stopwatch.ElapsedMilliseconds);

			return new Tuple<long, long, long>(timeInit, timeLoop, timeLoopRef);
		}


		static void Main(string[] args)
		{
			long totalInit = 0, totalLoop = 0, totalLoopRef = 0;
			for(int i = 0; i < RUNS; i++)
			{
				var tuple = RunTest();
				totalInit += tuple.Item1;
				totalLoop += tuple.Item2;
				totalLoopRef += tuple.Item3;
			}

			Console.WriteLine($"Average initialization time: {totalInit/RUNS:N0} ms");
			Console.WriteLine($"Average loop time: {totalLoop/RUNS:N0} ms");
			Console.WriteLine($"Average loop ref time: {totalLoopRef/RUNS:N0} ms");
		}
	}
}