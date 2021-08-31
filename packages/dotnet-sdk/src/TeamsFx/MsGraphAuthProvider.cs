// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Azure.Core;
using Microsoft.Graph;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace Microsoft.TeamsFx
{
    public class MsGraphAuthProvider : IAuthenticationProvider
    {
        private const string DefaultScope = ".default";
        private readonly TokenCredential _credential;
        readonly internal string[] _scopes;

        /// <summary>
        /// Constructor of MsGraphAuthProvider.
        /// </summary>
        /// <param name="credential">Credential used to invoke Microsoft Graph APIs.</param>
        /// <param name="scopes">The string of Microsoft Token scopes of access separated by space. Default value is `.default`.</param>
        /// <returns>
        /// An instance of MsGraphAuthProvider.
        /// </returns>
        public MsGraphAuthProvider(TokenCredential credential, string scopes = DefaultScope)
        {
            _credential = credential;
            if (scopes == "")
            {
                scopes = DefaultScope;
            }
            _scopes = scopes.Split(null);
        }

        /// <summary>
        /// Constructor of MsGraphAuthProvider.
        /// </summary>
        /// <param name="credential">Credential used to invoke Microsoft Graph APIs.</param>
        /// <param name="scopes">The scopes required for the token.</param>
        /// <returns>
        /// An instance of MsGraphAuthProvider.
        /// </returns>
        public MsGraphAuthProvider(TokenCredential credential, string[] scopes)
        {
            _credential = credential;
            if (string.Join("", scopes) == "")
            {
                _scopes = new string[] { DefaultScope };
            }
            else
            {
                _scopes = scopes;
            }
        }

        public async Task AuthenticateRequestAsync(HttpRequestMessage request)
        {
            var tokenRequestContext = new TokenRequestContext(_scopes);
            var accessToken = await _credential.GetTokenAsync(tokenRequestContext, new CancellationToken()).ConfigureAwait(false);
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken.Token);
        }

        /// <summary>
        /// Get access token for Microsoft Graph API requests.
        /// </summary>
        /// <returns>Access token from the credential.</returns>
        /// <exception cref="ExceptionCode.InternalError">When get access token failed due to empty token or unknown other problems.</exception>
        /// <exception cref="ExceptionCode.TokenExpiredError">When SSO token has already expired.</exception>
        /// <exception cref="ExceptionCode.UiRequiredError">When need user consent to get access token.</exception>
        /// <exception cref="ExceptionCode.ServiceError">When failed to get access token from simple auth or AAD server.</exception>
        public async Task<string> GetAccessTokenAsync()
        {
            var tokenRequestContext = new TokenRequestContext(_scopes);

            var accessToken = await _credential.GetTokenAsync(tokenRequestContext, new CancellationToken()).ConfigureAwait(false);
            if (accessToken.Token.Length == 0)
            {
                var errorMsg = "Graph access token is undefined or empty";
                throw new ExceptionWithCode(errorMsg, ExceptionCode.InternalError);
            }
            return accessToken.Token;
        }
    }
}
