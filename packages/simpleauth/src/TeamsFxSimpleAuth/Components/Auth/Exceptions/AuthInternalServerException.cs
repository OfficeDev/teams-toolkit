// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
using Microsoft.TeamsFx.SimpleAuth.Exceptions;
using System;
using System.Net;

namespace Microsoft.TeamsFx.SimpleAuth.Components.Auth.Exceptions
{
    // Indicates internal server error when AAD related operation failed due to service code in Simple Auth
    public class AuthInternalServerException : ApiExceptionBase
    {
        public AuthInternalServerException(string message, Exception innerException)
            : base(message, innerException, HttpStatusCode.InternalServerError) { }
    }
}
