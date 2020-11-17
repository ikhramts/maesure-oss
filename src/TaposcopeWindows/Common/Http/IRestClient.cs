using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace Common.Http
{
    public interface IRestClient
    {
        Task<RestRequestResult<T>> Get<T>(string url, IDictionary<string, string> headers = null, string auth = null);
        Task<RestRequestResult<T>> Post<T>(string url, object body = null, IDictionary<string, string> headers = null, string auth = null);
        Task<RestRequestResult<T>> PostFormUrlEncoded<T>(string url, object body = null, IDictionary<string, string> headers = null, string auth = null);
        Task<RestRequestResult<T>> Put<T>(string url, object body = null, IDictionary<string, string> headers = null, string auth = null);
        Task<RestRequestResult<T>> Delete<T>(string url, IDictionary<string, string> headers = null, string auth = null);

        Task<RestRequestResult> Get(string url, IDictionary<string, string> headers = null, string auth = null);
        Task<RestRequestResult> Post(string url, object body = null, IDictionary<string, string> headers = null, string auth = null);
        Task<RestRequestResult> Put(string url, object body = null, IDictionary<string, string> headers = null, string auth = null);
        Task<RestRequestResult> Delete(string url, IDictionary<string, string> headers = null, string auth = null);

    }
}
