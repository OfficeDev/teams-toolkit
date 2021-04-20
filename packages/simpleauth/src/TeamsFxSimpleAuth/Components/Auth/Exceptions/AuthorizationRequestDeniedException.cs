// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
using System.Net;
using Microsoft.TeamsFx.SimpleAuth.Exceptions;

namespace Microsoft.TeamsFx.SimpleAuth.Components.Auth.Exceptions
{
    public class AuthorizationRequestDeniedException: ApiExceptionBase
    {
        public AuthorizationRequestDeniedException(string message)
            : base(message, HttpStatusCode.Forbidden) { }
    }
}
