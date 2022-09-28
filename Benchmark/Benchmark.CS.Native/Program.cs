using System.Diagnostics;
using System.Drawing;

namespace Benchmark.CS.Native
{
	internal class Program
	{
		static void DoSomethingWithArray(float[] array)
		{
			for(int i = 0; i < SIZE; i++)
			{
				array[i] *= i + 0.123456789f;
			}
		}

		const int SIZE = 1 << 20;

		static void Main(string[] args)
		{

			Stopwatch stopwatch = new Stopwatch();

			stopwatch.Start();
			float[] array = new float[SIZE];
			for(int i = 0; i < 1000; i++)
			{
				for(int j = 0; j < SIZE; j++)
				{
					array[j] = j;
				}
			}
			stopwatch.Stop();
			Console.WriteLine("Initialization Elapsed milliseconds: " + stopwatch.ElapsedMilliseconds);

			stopwatch.Start();
			for(int i = 0; i < 1000; i++)
			{
				DoSomethingWithArray(array);
			}
			stopwatch.Stop();
			Console.WriteLine("Loop Elapsed milliseconds: " + stopwatch.ElapsedMilliseconds);


			Console.WriteLine(array[new System.Random().Next(array.Length)]);
		}
	}
}