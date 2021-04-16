// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;

namespace Microsoft.Azure.WebJobs.Extensions.TeamsFx
{
    public class AuthorizationException : Exception
    {
        public AuthorizationException(string message)
            : base(message) { }
    }
}
