// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Azure.Core;
using Microsoft.JSInterop;
using Microsoft.TeamsFx.Model;
using Newtonsoft.Json;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Microsoft.TeamsFx
{
    public class TeamsUserCredential : TokenCredential, IAsyncDisposable
    {
        protected internal class AccessTokenJS
        {
            [JsonProperty("token")]
            public string Token { get; set; }
            [JsonProperty("expiresOnTimestamp")]
            public DateTimeOffset ExpiresOn { get; set; }
        }

        private readonly Lazy<Task<IJSObjectReference>> moduleTask;
        private readonly Lazy<Task<IJSObjectReference>> instanceTask;

        /// <summary>
        /// Constructor of TeamsUserCredential.
        /// Developer need to call LoadConfigurationAsync(config) before using this class.
        /// </summary>
        public TeamsUserCredential(IJSRuntime jsRuntime)
        {
            moduleTask = new(() => jsRuntime.InvokeAsync<IJSObjectReference>(
                "import", "./_content/Microsoft.TeamsFx/jsInterop.js").AsTask());
            instanceTask = new(() => CreateTeamsUserCredential().AsTask());
        }

        private async ValueTask<IJSObjectReference> CreateTeamsUserCredential()
        {
            try
            {
                var module = await moduleTask.Value.ConfigureAwait(false);
                return await module.InvokeAsync<IJSObjectReference>("createTeamsUserCredential").ConfigureAwait(false);
            }
            catch (JSException e)
            {
                throw new ExceptionWithCode(e);
            }
        }

        /// <summary>
        /// Get basic user info from SSO token
        /// </summary>
        /// <returns>Basic user info with user displayName, objectId and preferredUserName.</returns>
        public async ValueTask<UserInfo> GetUserInfoAsync()
        {
            try
            {
                var instance = await instanceTask.Value.ConfigureAwait(false);
                return await instance.InvokeAsync<UserInfo>("getUserInfo").ConfigureAwait(false);
            }
            catch (JSException e)
            {
                throw new ExceptionWithCode(e);
            }
        }

        /// <summary>
        /// Popup login page to get user's access token with specific scopes.
        /// </summary>
        /// <param name="scopes">The string of Microsoft Token scopes of access separated by space. Default value is `.default`.</param>
        /// <remarks>
        /// Can only be used within Teams.
        /// </remarks>
        public async Task LoginAsync(string scopes)
        {
            try
            {
                var instance = await instanceTask.Value.ConfigureAwait(false);
                await instance.InvokeVoidAsync("login", scopes).ConfigureAwait(false);
            }
            catch (JSException e)
            {
                throw new ExceptionWithCode(e);
            }
        }

        /// <summary>
        /// Popup login page to get user's access token with specific scopes.
        /// </summary>
        /// <param name="scopes">The array of Microsoft Token scopes of access. Default value is `[.default]`.</param>
        /// <remarks>
        /// Can only be used within Teams.
        /// </remarks>
        public async Task LoginAsync(string[] scopes)
        {
            try
            {
                var instance = await instanceTask.Value.ConfigureAwait(false);
                await instance.InvokeVoidAsync("login", scopes).ConfigureAwait(false);
            }
            catch (JSException e)
            {
                throw new ExceptionWithCode(e);
            }
        }

        public async ValueTask DisposeAsync()
        {
            if (moduleTask.IsValueCreated)
            {
                var instance = await moduleTask.Value.ConfigureAwait(false);
                await instance.DisposeAsync().ConfigureAwait(false);
            }
            if (instanceTask.IsValueCreated)
            {
                var instance = await instanceTask.Value.ConfigureAwait(false);
                await instance.DisposeAsync().ConfigureAwait(false);
            }
        }

        /// <summary>
        /// Get access token from credential.
        /// </summary>
        /// <remarks>
        /// Can only be used within Teams.
        /// </remarks>
        /// <returns>
        /// Access token with expected scopes. Throw exception if get access token failed.
        /// </returns>
        public async override ValueTask<AccessToken> GetTokenAsync(TokenRequestContext requestContext, CancellationToken cancellationToken)
        {
            try
            {
                var instance = await instanceTask.Value.ConfigureAwait(false);
                var tokenJS = await instance.InvokeAsync<AccessTokenJS>("getToken", requestContext.Scopes, cancellationToken).ConfigureAwait(false);
                return new AccessToken(tokenJS.Token, tokenJS.ExpiresOn);
            }
            catch (JSException e)
            {
                throw new ExceptionWithCode(e);
            }
        }

        /// <summary>
        /// Not implemented for now.
        /// </summary>
        public override AccessToken GetToken(TokenRequestContext requestContext, CancellationToken cancellationToken)
        {
            throw new NotImplementedException();
        }
    }
}
