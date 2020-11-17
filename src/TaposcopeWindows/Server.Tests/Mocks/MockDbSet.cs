using JetBrains.Annotations;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;

namespace Server.Tests.Mocks
{
    public class MockDbSet<T> : DbSet<T>, IQueryable<T>, IAsyncEnumerable<T> where T: class
    {
        public List<T> Added { get; set; } = new List<T>();
        public List<T> Removed { get; set; } = new List<T>();
        public List<T> Updated { get; set; } = new List<T>();
        public List<T> QueryData { get; set; } = new List<T>();

        public override EntityEntry<T> Add(T entity)
        {
            Added.Add(entity);
            return null;
        }

        public override void AddRange(IEnumerable<T> entities)
        {
            Added.AddRange(entities);
        }

        public override EntityEntry<T> Update(T entity)
        {
            Updated.Add(entity);
            return null;
        }

        public override void UpdateRange(IEnumerable<T> entities)
        {
            Updated.AddRange(entities);
        }

        public override EntityEntry<T> Remove(T entity)
        {
            Removed.Add(entity);
            return null;
        }

        public override void RemoveRange(IEnumerable<T> entities)
        {
            Removed.AddRange(entities);
        }

        IQueryProvider IQueryable.Provider { get => new MockAsyncQueryProvider<T>(QueryData.AsQueryable().Provider); }
        Expression IQueryable.Expression { get => QueryData.AsQueryable().Expression; }
        Type IQueryable.ElementType { get => QueryData.AsQueryable().ElementType; }
        IEnumerator<T> IEnumerable<T>.GetEnumerator() => QueryData.AsQueryable().GetEnumerator();
        IAsyncEnumerator<T> IAsyncEnumerable<T>.GetEnumerator() => new MockAsyncEnumerator<T>(QueryData.AsQueryable().GetEnumerator());
    }
}
