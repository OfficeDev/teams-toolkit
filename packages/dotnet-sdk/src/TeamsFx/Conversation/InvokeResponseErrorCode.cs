// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

namespace Microsoft.TeamsFx.Conversation
{
    /// <summary>
    /// Status code for an application/vnd.microsoft.error invoke response.
    /// </summary>
    public enum InvokeResponseErrorCode
    {
        /// <summary>
        /// Invalid request.
        /// </summary>
        BadRequest = 400,

        /// <summary>
        /// Internal server error.
        /// </summary>
        InternalServerError = 500,
    }
}
