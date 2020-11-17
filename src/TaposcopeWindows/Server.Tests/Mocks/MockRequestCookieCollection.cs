using Microsoft.AspNetCore.Http;
using System;
using System.Collections;
using System.Collections.Generic;

namespace Server.Tests.Mocks
{
    internal class MockRequestCookieCollection : IRequestCookieCollection
    {
        // =================== Main interface ===================
        public string this[string key] {
            get
            {
                var found = _cookies.TryGetValue(key, out var value);
                if (found)
                {
                    return value;
                }
                else
                {
                    return string.Empty;
                }
            }
            set
            {
                _cookies[key] = value;
            }
        }

        public int Count => _cookies.Count;

        public ICollection<string> Keys => _cookies.Keys;

        public bool ContainsKey(string key)
        {
            return _cookies.ContainsKey(key);
        }

        public IEnumerator<KeyValuePair<string, string>> GetEnumerator()
        {
            return _cookies.GetEnumerator();
        }

        public bool TryGetValue(string key, out string value)
        {
            return _cookies.TryGetValue(key, out value);
        }

        IEnumerator IEnumerable.GetEnumerator()
        {
            return ((IEnumerable)_cookies).GetEnumerator();
        }

        // =================== Test helpers =====================

        // ========================== Private ===========================
        private Dictionary<string, string> _cookies = new Dictionary<string, string>();
    }
}
