using Newtonsoft.Json;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace Common.Http
{
    public class RestClient : IRestClient
    {
        public async Task<RestRequestResult<T>> Delete<T>(string url, IDictionary<string, string> headers = null, string auth = null)
        {
            var httpClient = PrepareClient(headers, auth);
            var response = await httpClient.DeleteAsync(url);
            return await ExtractResult<T>(response);
        }

        public async Task<RestRequestResult> Delete(string url, IDictionary<string, string> headers = null, string auth = null)
        {
            var httpClient = PrepareClient(headers, auth);
            var response = await httpClient.DeleteAsync(url);
            return await ExtractResult(response);
        }

        public async Task<RestRequestResult<T>> Get<T>(string url, IDictionary<string, string> headers = null, string auth = null)
        {
            var httpClient = PrepareClient(headers, auth);
            var response = await httpClient.GetAsync(url);
            return await ExtractResult<T>(response);
        }

        public async Task<RestRequestResult> Get(string url, IDictionary<string, string> headers = null, string auth = null)
        {
            var httpClient = PrepareClient(headers, auth);
            var response = await httpClient.GetAsync(url);
            return await ExtractResult(response);
        }

        public async Task<RestRequestResult<T>> Post<T>(
            string url, object body = null, IDictionary<string, string> headers = null, string auth = null)
        {
            var httpClient = PrepareClient(headers, auth);
            var content = PrepareRequestBody(body);
            var response = await httpClient.PostAsync(url, content);
            return await ExtractResult<T>(response);
        }

        public async Task<RestRequestResult<T>> PostFormUrlEncoded<T>(
            string url, object body = null, IDictionary<string, string> headers = null, string auth = null)
        {
            var httpClient = PrepareClient(headers, auth);
            var content = FormUrlEncodedSerializer.Serialize(body);
            var response = await httpClient.PostAsync(url, content);
            return await ExtractResult<T>(response);
        }

        public async Task<RestRequestResult> Post(string url, object body = null, IDictionary<string, string> headers = null, string auth = null)
        {
            var httpClient = PrepareClient(headers, auth);
            var content = PrepareRequestBody(body);
            var response = await httpClient.PostAsync(url, content);
            return await ExtractResult(response);
        }

        public async Task<RestRequestResult<T>> Put<T>(string url, object body = null, IDictionary<string, string> headers = null, string auth = null)
        {
            var httpClient = PrepareClient(headers, auth);
            var content = PrepareRequestBody(body);
            var response = await httpClient.PutAsync(url, content);
            return await ExtractResult<T>(response);
        }

        public async Task<RestRequestResult> Put(string url, object body = null, IDictionary<string, string> headers = null, string auth = null)
        {
            var httpClient = PrepareClient(headers, auth);
            var content = PrepareRequestBody(body);
            var response = await httpClient.PutAsync(url, content);
            return await ExtractResult(response);
        }

        // ========================== Private ===========================
        private StringContent PrepareRequestBody(object body)
        {
            StringContent content;

            if (body != null)
            {
                var json = JsonConvert.SerializeObject(body);
                content = new StringContent(json, Encoding.UTF8, "application/json");
            }
            else
            {
                content = new StringContent("", Encoding.UTF8, "application/json");
            }

            return content;
        }

        private HttpClient PrepareClient(IDictionary<string, string> headers, string auth)
        {
            var httpClient = new HttpClient();

            if (headers != null)
            {
                foreach (var header in headers)
                {
                    httpClient.DefaultRequestHeaders.Add(header.Key, header.Value);
                }
            }

            if (auth != null)
            {
                httpClient.DefaultRequestHeaders.Add("Authorization", auth);
            }

            return httpClient;
        }

        private async Task<RestRequestResult<T>> ExtractResult<T>(HttpResponseMessage response)
        {
            if (!response.IsSuccessStatusCode)
            {
                var errorDetails = await response.Content.ReadAsStringAsync();
                return new RestRequestResult<T> { StatusCode = (int)response.StatusCode, Error = errorDetails };
            }

            var responseBody = await response.Content.ReadAsStringAsync();
            var responseContents = JsonConvert.DeserializeObject<T>(responseBody);

            return new RestRequestResult<T> { StatusCode = (int)response.StatusCode, Result = responseContents };
        }

        private async Task<RestRequestResult> ExtractResult(HttpResponseMessage response)
        {
            if (!response.IsSuccessStatusCode)
            {
                var errorDetails = await response.Content.ReadAsStringAsync();
                return new RestRequestResult { StatusCode = (int)response.StatusCode, Error = errorDetails };
            }

            return new RestRequestResult { StatusCode = (int)response.StatusCode };
        }

    }
}
