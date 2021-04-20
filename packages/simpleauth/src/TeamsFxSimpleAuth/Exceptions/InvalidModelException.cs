// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
using System.Net;

namespace Microsoft.TeamsFx.SimpleAuth.Exceptions
{
    // Indicates request body validation failure
    public class InvalidModelException : ApiExceptionBase
    {
        public InvalidModelException(string message)
            : base(message, HttpStatusCode.BadRequest) { }
    }
}
