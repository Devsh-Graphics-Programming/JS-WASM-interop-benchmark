using Microsoft.JSInterop;

using System.Diagnostics;
using System.Drawing;

namespace Benchmark.CS
{
	public class ContainerClass
	{
		const int SIZE = 1 << 20;
		private float[] array;

		public ContainerClass()
		{
			array = new float[SIZE];
		}

		[JSInvokable]
		public void set(int i, float f)
		{
			array[i] = f;
		}

		public float this[int i]
		{
			get { return array[i]; }
			set { array[i] = value; }
		}

		[JSInvokable]
		public void WasmBenchmarkTestArrayInstanced()
		{
			for(int i = 0; i < SIZE; i++)
			{
				array[i] *= (float) (i + 3);
			}
		}

		[JSInvokable]
		public static void PseudoNativeBenchmark()
		{
			Stopwatch stopwatch = new Stopwatch();

			stopwatch.Start();
			var array = new ContainerClass();
			for(int i = 0; i < Benchmark.CS.Program.ITERATIONS; i++)
			{
				for(int j = 0; j < SIZE; j++)
				{
					array[j] = j;
				}
			}
			stopwatch.Stop();
			Console.WriteLine("Initialization Elapsed milliseconds: " + stopwatch.ElapsedMilliseconds);

			stopwatch.Start();
			for(int i = 0; i < Benchmark.CS.Program.ITERATIONS; i++)
			{
				array.DoSomethingWithArray();
			}
			stopwatch.Stop();
			Console.WriteLine("Loop Elapsed milliseconds: " + stopwatch.ElapsedMilliseconds);


			Console.WriteLine(array[new System.Random().Next(SIZE)]);
		}

	}
}
