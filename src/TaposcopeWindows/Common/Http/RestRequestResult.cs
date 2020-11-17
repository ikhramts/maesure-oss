namespace Common.Http
{
    public class RestRequestResult<T>
    {
        public string Error { get; set; }
        public bool IsSuccess => StatusCode < 400;
        public T Result { get; set; }
        public int StatusCode { get; set; }
    }

    public class RestRequestResult
    {
        public string Error { get; set; }
        public bool IsSuccess => StatusCode < 400;
        public int StatusCode { get; set; }
    }
}
