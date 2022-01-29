﻿// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Microsoft.Identity.Client;

namespace Microsoft.TeamsFx.Helper
{
    /// <summary>
    /// Adapter of IConfidentialClientApplication On-behalf-of flow.
    /// </summary>
    public interface IIdentityClientAdapter
    {
        /// <summary>
        /// Use On-behalf-of flow to exchange access token.
        /// </summary>
        /// <param name="scopes">required scopes</param>
        /// <param name="ssoToken">token from Teams client</param>
        /// <returns></returns>
        Task<AuthenticationResult> GetAccessToken(string scopes, string ssoToken);
    }
}
