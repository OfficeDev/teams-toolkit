using Microsoft.TeamsFxSimpleAuth.Exceptions;
using System.Net;

namespace Microsoft.TeamsFxSimpleAuth.Components.Auth.Exceptions
{
    // Indicates SSO Token is invalid
    public class InvalidClaimException : ApiExceptionBase
    {
        public InvalidClaimException(string message)
            : base(message, HttpStatusCode.BadRequest) { }
    }
}
