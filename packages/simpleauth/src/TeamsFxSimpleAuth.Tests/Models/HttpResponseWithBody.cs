using System.Net.Http;

namespace Microsoft.TeamsFx.SimpleAuth.Tests.Models
{
    public class HttpResponseWithBody<T>
    {
        public HttpResponseMessage Response { get; set; }
        public T Body { get; set; }
    }
}
