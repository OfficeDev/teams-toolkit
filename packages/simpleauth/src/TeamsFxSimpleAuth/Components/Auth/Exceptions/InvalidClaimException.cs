// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
using Microsoft.TeamsFx.SimpleAuth.Exceptions;
using System.Net;

namespace Microsoft.TeamsFx.SimpleAuth.Components.Auth.Exceptions
{
    // Indicates SSO Token is invalid
    public class InvalidClaimException : ApiExceptionBase
    {
        public InvalidClaimException(string message)
            : base(message, HttpStatusCode.BadRequest) { }
    }
}
