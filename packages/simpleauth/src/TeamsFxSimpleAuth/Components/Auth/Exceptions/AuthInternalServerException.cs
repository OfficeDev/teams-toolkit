using Microsoft.TeamsFxSimpleAuth.Exceptions;
using System;
using System.Net;

namespace Microsoft.TeamsFxSimpleAuth.Components.Auth.Exceptions
{
    // Indicates internal server error when AAD related operation failed due to service code in Simple Auth
    public class AuthInternalServerException : ApiExceptionBase
    {
        public AuthInternalServerException(string message, Exception innerException)
            : base(message, innerException, HttpStatusCode.InternalServerError) { }
    }
}
