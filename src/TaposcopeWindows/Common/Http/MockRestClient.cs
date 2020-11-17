using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Common.Http
{
    public class MockRestClient : IRestClient
    {
        public int StatusCodeToReturn { get; set; } = 200;
        public object ResultToReturn { get; set; }
        public string ErrorToReturn { get; set; }
        public List<CapturedRequest> RequestsMade { get; } = new List<CapturedRequest>();
        public Exception ExceptionToThrow { get; set; }

        public Task<RestRequestResult<T>> Delete<T>(string url, IDictionary<string, string> headers = null, string auth = null)
        {
            return HandleRequest<T>("DELETE", url, null, headers, auth);
        }

        public Task<RestRequestResult> Delete(string url, IDictionary<string, string> headers = null, string auth = null)
        {
            return HandleRequest("DELETE", url, null, headers, auth);
        }

        public Task<RestRequestResult<T>> Get<T>(string url, IDictionary<string, string> headers = null, string auth = null)
        {
            return HandleRequest<T>("GET", url, null, headers, auth);
        }

        public Task<RestRequestResult> Get(string url, IDictionary<string, string> headers = null, string auth = null)
        {
            return HandleRequest("GET", url, null, headers, auth);
        }

        public Task<RestRequestResult<T>> Post<T>(string url, object body = null, IDictionary<string, string> headers = null, string auth = null)
        {
            return HandleRequest<T>("POST", url, body, headers, auth);
        }

        public Task<RestRequestResult<T>> PostFormUrlEncoded<T>(string url, object body = null, IDictionary<string, string> headers = null, string auth = null)
        {
            return HandleRequest<T>("POST", url, body, headers, auth);
        }

        public Task<RestRequestResult> Post(string url, object body = null, IDictionary<string, string> headers = null, string auth = null)
        {
            return HandleRequest("POST", url, body, headers, auth);
        }

        public Task<RestRequestResult<T>> Put<T>(string url, object body = null, IDictionary<string, string> headers = null, string auth = null)
        {
            return HandleRequest<T>("PUT", url, body, headers, auth);
        }

        public Task<RestRequestResult> Put(string url, object body = null, IDictionary<string, string> headers = null, string auth = null)
        {
            return HandleRequest("PUT", url, body, headers, auth);
        }

        public class CapturedRequest
        {
            public string Method { get; set; }
            public string Url { get; set; }
            public object Body { get; set; }
            public IDictionary<string, string> Headers { get; set; }
            public string Auth { get; set; }
        }

        // ============== Private ====================
        private Task<RestRequestResult> HandleRequest(string method, string url, object body, IDictionary<string, string> headers, string auth)
        {
            var capturedRequest = new CapturedRequest
            {
                Method = method,
                Url = url,
                Body = body,
                Headers = headers,
                Auth = auth
            };

            return Task.Run(() => {
                ThrowIfHasException();
                return new RestRequestResult
                {
                    StatusCode = StatusCodeToReturn,
                    Error = ErrorToReturn
                };
            });
        }

        private Task<RestRequestResult<T>> HandleRequest<T>(string method, string url, object body, IDictionary<string, string> headers, string auth)
        {
            var capturedRequest = new CapturedRequest
            {
                Method = method,
                Url = url,
                Body = body,
                Headers = headers,
                Auth = auth
            };

            return Task.Run(() =>
            {
                ThrowIfHasException();
                return new RestRequestResult<T>
                {
                    StatusCode = StatusCodeToReturn,
                    Result = (T)ResultToReturn,
                    Error = ErrorToReturn
                };
            });
        }

        private void ThrowIfHasException()
        {
            if (ExceptionToThrow != null)
                throw ExceptionToThrow;
        }
    }
}
