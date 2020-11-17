using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;
using System.Text;

namespace Server.Tests.Mocks
{
    public class MockAsyncEnumerable<T> : EnumerableQuery<T>, IAsyncEnumerable<T>, IQueryable<T>
    {
        public MockAsyncEnumerable(IEnumerable<T> enumerable) : base(enumerable)
        {
        }

        public MockAsyncEnumerable(Expression expression) : base(expression)
        {

        }

        public IAsyncEnumerator<T> GetEnumerator()
        {
            return new MockAsyncEnumerator<T>(this.AsEnumerable().GetEnumerator());
        }

        IQueryProvider IQueryable.Provider
        {
            get { return new MockAsyncQueryProvider<T>(this); }
        }
    }
}
