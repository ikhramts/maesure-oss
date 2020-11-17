using System;
using System.Collections.Generic;
using System.Text;

namespace Common.Extensions
{
    public static class DictionaryExtensions
    {
        public static TValue GetOrAdd<TKey, TValue>(this IDictionary<TKey, TValue> dict, TKey key) where TValue : new()
        {
            dict.TryGetValue(key, out TValue value);

            if (value == null)
            {
                value = new TValue();
                dict[key] = value;
            }

            return value;
        }
    }
}
