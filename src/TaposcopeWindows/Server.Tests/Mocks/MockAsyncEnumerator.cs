using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Server.Tests.Mocks
{
    public class MockAsyncEnumerator<T> : IAsyncEnumerator<T>
    {
        private readonly IEnumerator<T> _inner;

        public MockAsyncEnumerator(IEnumerator<T> inner)
        {
            _inner = inner;
        }

        public void Dispose()
        {
            _inner.Dispose();
        }

        public T Current
        {
            get
            {
                return _inner.Current;
            }
        }

        public Task<bool> MoveNext(CancellationToken cancellationToken)
        {
            return Task.FromResult(_inner.MoveNext());
        }
    }
}
