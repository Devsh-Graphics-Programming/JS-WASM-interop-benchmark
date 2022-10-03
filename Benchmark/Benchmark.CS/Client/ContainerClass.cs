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

	}
}
