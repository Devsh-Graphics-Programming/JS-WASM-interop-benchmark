using Microsoft.JSInterop;

namespace Benchmark.CS
{
    public class ContainerClass
    {
        private readonly IJSRuntime js;
        private List<float> list;

        public ContainerClass(IJSRuntime js)
        {
            this.js = js;
            list = new List<float>(1 << 20);
        }

        [JSInvokable]
        public void Add(float f)
        {
            list.Add(f);
        }

        [JSInvokable]
        public void Clear()
        {
            list.Clear();
        }

        public int Length => list.Count;

        public float this[int i]
        {
            get { return list[i]; }
            set { list[i] = value; }
        }

        [JSInvokable]
        public float TestMethod2()
        {

            for(int i = 0; i < Length; i++)
            {
                list[i] *= 2;
            }
            return list[1000];
        }

    }
}
