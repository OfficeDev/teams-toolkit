using System.Net;
using Microsoft.TeamsFxSimpleAuth.Exceptions;

namespace Microsoft.TeamsFxSimpleAuth.Components.Auth.Exceptions
{
    public class AuthorizationRequestDeniedException: ApiExceptionBase
    {
        public AuthorizationRequestDeniedException(string message)
            : base(message, HttpStatusCode.Forbidden) { }
    }
}
