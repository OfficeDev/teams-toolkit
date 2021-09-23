// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Azure.Core;
using Microsoft.Extensions.Options;
using Microsoft.JSInterop;
using Microsoft.TeamsFx.Model;
using Microsoft.TeamsFx.Configuration;
using Newtonsoft.Json;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Microsoft.TeamsFx
{
    /// <summary>
    /// Constructor of TeamsUserCredential.
    /// </summary>
    /// <remarks>
    /// Can only be used within Teams.
    /// </remarks>
    public class TeamsUserCredential : TokenCredential, IAsyncDisposable
    {
        internal class AccessTokenJS
        {
            [JsonProperty("token")]
            public string Token { get; set; }
            [JsonProperty("expiresOnTimestamp")]
            public DateTimeOffset ExpiresOn { get; set; }
        }

        private readonly Lazy<Task<IJSObjectReference>> moduleTask;
        private readonly Lazy<Task<IJSObjectReference>> instanceTask;
        private AuthenticationOptions authenticationOptions;

        /// <summary>
        /// Constructor of TeamsUserCredential.
        /// Developer need to call LoadConfigurationAsync(config) before using this class.
        /// </summary>
        /// <exception cref="ExceptionCode.InvalidConfiguration">When client id, initiate login endpoint or simple auth endpoint is not found in config.</exception>
        /// <exception cref="ExceptionCode.RuntimeNotSupported">When runtime is not in browser enviroment.</exception>
        public TeamsUserCredential(IJSRuntime jsRuntime, IOptions<AuthenticationOptions> authenticationOptions)
        {
            moduleTask = new(() => jsRuntime.InvokeAsync<IJSObjectReference>(
                "import", "./_content/Microsoft.TeamsFx/jsInterop.js").AsTask());
            instanceTask = new(() => CreateTeamsUserCredential().AsTask());
            this.authenticationOptions = authenticationOptions.Value;
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
        /// Get basic user info from SSO token.
        /// <example>
        /// For example:
        /// <code>
        /// var user = await teamsUserCredential.GetUserInfoAsync();
        /// </code>
        /// </example>
        /// </summary>
        /// <returns>Basic user info with user displayName, objectId and preferredUserName.</returns>
        /// <exception cref="ExceptionCode.InternalError">When SSO token from Teams client is not valid.</exception>
        /// <exception cref="ExceptionCode.InvalidParameter">When SSO token from Teams client is empty.</exception>
        /// <exception cref="ExceptionCode.RuntimeNotSupported">When runtime is not in browser enviroment.</exception>
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
        /// <example>
        /// For example:
        /// <code>
        /// await teamsUserCredential.LoginAsync("User.Read"); // single scopes using string
        /// await teamsUserCredential.LoginAsync("User.Read Calendars.Read"); // multiple scopes using string
        /// </code>
        /// </example>
        /// </summary>
        /// <param name="scopes">The string of Microsoft Token scopes of access separated by space. Default value is `.default`.</param>
        /// <remarks>
        /// Can only be used within Teams.
        /// </remarks>
        /// <exception cref="ExceptionCode.InternalError">When failed to login with unknown error.</exception>
        /// <exception cref="ExceptionCode.ServiceError">When simple auth server failed to exchange access token.</exception>
        /// <exception cref="ExceptionCode.ConsentFailed">When user canceled or failed to consent.</exception>
        /// <exception cref="ExceptionCode.RuntimeNotSupported">When runtime is not in browser enviroment.</exception>
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
        /// <example>
        /// For example:
        /// <code>
        /// await teamsUserCredential.LoginAsync(new string[] { "User.Read" }); // single scope using string array
        /// await teamsUserCredential.LoginAsync(new string[] { "User.Read Calendars.Read" }); //  multiple scopes using string array
        /// </code>
        /// </example>
        /// </summary>
        /// <param name="scopes">The array of Microsoft Token scopes of access. Default value is `[.default]`.</param>
        /// <remarks>
        /// Can only be used within Teams.
        /// </remarks>
        /// <exception cref="ExceptionCode.InternalError">When failed to login with unknown error.</exception>
        /// <exception cref="ExceptionCode.ServiceError">When simple auth server failed to exchange access token.</exception>
        /// <exception cref="ExceptionCode.ConsentFailed">When user canceled or failed to consent.</exception>
        /// <exception cref="ExceptionCode.RuntimeNotSupported">When runtime is not in browser enviroment.</exception>
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
        /// <example>
        /// For example:
        /// <code>
        /// await teamsUserCredential.GetTokenAsync(new TokenRequestContext(new string[] { "User.Read" }), new System.Threading.CancellationToken());
        /// </code>
        /// </example>
        /// </summary>
        /// <remarks>
        /// Can only be used within Teams.
        /// </remarks>
        /// <returns>
        /// Access token with expected scopes. Throw exception if get access token failed.
        /// </returns>
        /// <exception cref="ExceptionCode.InternalError">When failed to login with unknown error.</exception>
        /// <exception cref="ExceptionCode.UiRequiredError">When need user consent to get access token.</exception>
        /// <exception cref="ExceptionCode.ServiceError">When failed to get access token from simple auth server.</exception>
        /// <exception cref="ExceptionCode.RuntimeNotSupported">When runtime is not in browser enviroment.</exception>
        public async override ValueTask<Azure.Core.AccessToken> GetTokenAsync(TokenRequestContext requestContext, CancellationToken cancellationToken)
        {
            try
            {
                var instance = await instanceTask.Value.ConfigureAwait(false);
                var tokenJS = await instance.InvokeAsync<AccessTokenJS>("getToken", requestContext.Scopes, cancellationToken).ConfigureAwait(false);
                return new Azure.Core.AccessToken(tokenJS.Token, tokenJS.ExpiresOn);
            }
            catch (JSException e)
            {
                throw new ExceptionWithCode(e);
            }
        }

        /// <summary>
        /// Not implemented for now.
        /// </summary>
        public override Azure.Core.AccessToken GetToken(TokenRequestContext requestContext, CancellationToken cancellationToken)
        {
            throw new NotImplementedException();
        }
    }
}
