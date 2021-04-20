// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
using System.Net.Http;

namespace Microsoft.TeamsFx.SimpleAuth.Tests.Models
{
    public class HttpResponseWithBody<T>
    {
        public HttpResponseMessage Response { get; set; }
        public T Body { get; set; }
    }
}
