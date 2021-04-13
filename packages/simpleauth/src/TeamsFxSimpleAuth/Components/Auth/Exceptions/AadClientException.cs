using Microsoft.TeamsFx.SimpleAuth.Exceptions;
using System;
using System.Net;

namespace Microsoft.TeamsFx.SimpleAuth.Components.Auth.Exceptions
{
    // Indicates 4xx error returned by AAD server
    public class AadClientException : ApiExceptionBase
    {
        public AadClientException(string message, HttpStatusCode statusCode)
            : base(message, statusCode)
        {
            validateStatusCode(statusCode);
        }

        public AadClientException(string message, Exception innerException, HttpStatusCode statusCode)
            : base(message, innerException, statusCode)
        {
            validateStatusCode(statusCode);
        }

        private void validateStatusCode(HttpStatusCode statusCode)
        {
            if ((int)statusCode < 400 || (int)statusCode >= 500)
            {
                throw new ArgumentOutOfRangeException($"Status code of AadServerException should belong to client error. Current status code is {(int)statusCode}.");
            }
        }
    }
}
