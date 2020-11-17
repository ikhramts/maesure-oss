using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;

namespace Common.Http
{
    public static class FormUrlEncodedSerializer
    {
        public static FormUrlEncodedContent Serialize(object obj)
        {
            var serialized = ToKVPairs(obj);
            return new FormUrlEncodedContent(serialized);
        }

        public static IEnumerable<KeyValuePair<string, string>> ToKVPairs(object obj)
        {
            var objType = obj.GetType();
            var properties = objType.GetProperties();
            var results = new List<KeyValuePair<string, string>>(properties.Length);

            foreach (var property in properties)
            {
                var key = property.Name;
                var attributes = property.GetCustomAttributes(true);

                foreach (var attribute in attributes)
                {
                    if (attribute is JsonPropertyAttribute)
                    {
                        var nameFromJsonProperty = ((JsonPropertyAttribute)attribute).PropertyName;

                        if (nameFromJsonProperty != null)
                        {
                            key = nameFromJsonProperty;
                        }

                        break;
                    }
                }

                var value = property.GetValue(obj);
                var stringValue = value.ToString();

                if (value is bool)
                {
                    stringValue = stringValue.ToLower();
                }

                var kvPair = new KeyValuePair<string, string>(key, stringValue);
                results.Add(kvPair);
            }

            return results;
        }
    }
}
