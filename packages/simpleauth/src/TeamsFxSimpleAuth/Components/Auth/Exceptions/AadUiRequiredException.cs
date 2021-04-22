// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
using Microsoft.TeamsFx.SimpleAuth.Exceptions;
using System;
using System.Net;

namespace Microsoft.TeamsFx.SimpleAuth.Components.Auth.Exceptions
{
    // Indicates client need to ask user to sign-in or consent required permission
    public class AadUiRequiredException : ApiExceptionBase
    {
        public AadUiRequiredException(string message, Exception innerException)
            : base(message, innerException, HttpStatusCode.BadRequest) { }
    }
}
