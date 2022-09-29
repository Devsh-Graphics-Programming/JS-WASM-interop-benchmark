using System.Diagnostics;
using System.Drawing;

namespace Benchmark.CS.Native
{
	internal class Program
	{
		const int SIZE = 1 << 20;
		const int ITERS = 1000;


		static void benchmark_test_array(float[] array)
		{
			for(int i = 0; i < SIZE; i++)
			{
				array[i] *= (float) (i + 3);
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

		static void Main(string[] args)
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
			Console.WriteLine("Initialization Elapsed milliseconds: " + stopwatch.ElapsedMilliseconds);

			stopwatch.Start();
			for(int i = 0; i < ITERS; i++)
			{
				benchmark_test_array(testArray);
			}
			stopwatch.Stop();
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
			Console.WriteLine("Loop (by ref) Elapsed milliseconds: " + stopwatch.ElapsedMilliseconds);
		}
	}
}