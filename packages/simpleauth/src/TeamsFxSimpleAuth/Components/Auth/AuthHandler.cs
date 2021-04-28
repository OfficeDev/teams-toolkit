// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Identity.Client;
using Microsoft.TeamsFx.SimpleAuth.Components.Auth.Exceptions;
using Microsoft.TeamsFx.SimpleAuth.Exceptions;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Net;
using System.Security.Claims;
using System.Threading.Tasks;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;

namespace Microsoft.TeamsFx.SimpleAuth.Components.Auth
{
    public class AuthHandler
    {
        private string _clientId;
        private string _clientSecret;
        private string _oauthAuthority;
        private ILogger<AuthHandler> _logger;

        public AuthHandler(IConfiguration configuration, ILogger<AuthHandler> logger)
        {
            _logger = logger;
            _clientId = configuration[ConfigurationName.ClientId];
            _clientSecret = configuration[ConfigurationName.ClientSecret];
            _oauthAuthority = configuration[ConfigurationName.OAuthAuthority];
        }

        public async Task<AuthenticationResult> AcquireTokenByAuthorizationCode(string[] scopes, string redirectUri, string authorizationCode, string codeVerifier, string ssoToken)
        {
            _logger.LogDebug($"Acquiring token via auth code flow. Scopes: {string.Join(' ', scopes)}. RedirectUri: {redirectUri}. ClientId: {_clientId}.");

            try
            {
                var app = BuildConfidentialClientApplication(redirectUri);
                var result = await app.AcquireTokenByAuthorizationCode(scopes, authorizationCode)
                    .WithPkceCodeVerifier(codeVerifier).ExecuteAsync().ConfigureAwait(false);

                // ensure ssoToken and authorizationCode belongs to the same user
                if (!JwtHaveSameObjectId(result.AccessToken, ssoToken))
                {
                    throw new AuthorizationRequestDeniedException("authorization code and sso token in header have different object id.");
                }

                return result;
            }
            catch (MsalUiRequiredException ex) // Need user interaction
            {
                throw new AadUiRequiredException(ex.Message, ex);
            }
            catch (MsalServiceException ex) // Errors that returned from AAD service
            {
                throw generateAadException(ex.ResponseBody, (HttpStatusCode)ex.StatusCode, ex);
            }
            catch (MsalClientException ex) // Exceptions that are local to the MSAL library
            {
                throw new AuthInternalServerException(ex.Message, ex);
            }
        }

        public async Task<AuthenticationResult> AcquireTokenBySsoToken(ClaimsPrincipal user, string ssoToken, string[] scopes)
        {
            try
            {
                var version = user.FindFirstValue(JWTClaims.Version);
                string loginHint = null;
                if (String.Equals(JWTVersion.Ver2, version))
                {
                    loginHint = user.FindFirstValue("preferred_username");
                }
                else if (String.Equals(JWTVersion.Ver1, version))
                {
                    loginHint = user.FindFirstValue(ClaimTypes.Upn);
                }

                if (String.IsNullOrEmpty(loginHint))
                {
                    throw new InvalidClaimException("loginHint is not found in SSO token");
                }
                _logger.LogDebug($"Getting token for {loginHint} with scope {JsonConvert.SerializeObject(scopes)}");
                var app = BuildConfidentialClientApplication();
                var result = await app.AcquireTokenSilent(scopes, loginHint)
                                            .ExecuteAsync()
                                            .ConfigureAwait(false);

                return result;
            }
            catch (MsalUiRequiredException)
            {
                _logger.LogDebug($"Failed to get token, try to acquire token via OBO flow.");
                var result = await AcquireTokenBySsoTokenOnBehalfOf(ssoToken, scopes).ConfigureAwait(false);
                return result;
            }
        }

        public async Task<AuthenticationResult> AcquireTokenBySsoTokenOnBehalfOf(string ssoToken, string[] scopes)
        {
            try
            {
                _logger.LogDebug("Acquiring token via OBO flow.");
                var userAssertion = new UserAssertion(ssoToken);
                var app = BuildConfidentialClientApplication();
                var result = await app.AcquireTokenOnBehalfOf(scopes, userAssertion)
                                                        .ExecuteAsync()
                                                        .ConfigureAwait(false);

                return result;
            }
            catch (MsalUiRequiredException ex) // Need user interaction
            {
                throw new AadUiRequiredException(ex.Message, ex);
            }
            catch (MsalServiceException ex) // Errors that returned from AAD service
            {
                throw generateAadException(ex.ResponseBody, (HttpStatusCode)ex.StatusCode, ex);
            }
            catch (MsalClientException ex) // Exceptions that are local to the MSAL library
            {
                throw new AuthInternalServerException(ex.Message, ex);
            }
        }

        /// <summary>
        /// Verify if two jwt tokens have the same oid claim.
        /// </summary>
        private bool JwtHaveSameObjectId(string token1, string token2)
        {
            var handler = new JwtSecurityTokenHandler();
            try
            {
                var decodedToken1 = handler.ReadJwtToken(token1);
                var decodedToken2 = handler.ReadJwtToken(token2);
                Claim oid1 = decodedToken1.Claims.FirstOrDefault(claim => claim.Type == "oid");
                Claim oid2 = decodedToken2.Claims.FirstOrDefault(claim => claim.Type == "oid");
                if (oid1 != null && oid2 != null && !String.IsNullOrEmpty(oid1.Value) && oid1.Value == oid2.Value)
                {
                    return true;
                }
            }
            catch (Exception err)
            {
                _logger.LogError(err.Message);
                throw;
            }
            return false;
        }

        // This function assumes the AAD request is failed
        private ApiExceptionBase generateAadException(string responseBody, HttpStatusCode statusCode, MsalServiceException exception = null)
        {
            if ((int)statusCode >= 500)
            {
                return new AadServerException(responseBody, exception, statusCode);
            }
            else // 400 <= statusCode < 500
            {
                var responseObject = JsonConvert.DeserializeObject<Dictionary<string, object>>(responseBody);
                if (responseObject.ContainsKey("error"))
                {
                    switch ((string)responseObject["error"])
                    {
                        case AadErrorType.InvalidClient:
                            if (((string)responseObject["error_description"]).Contains("AADSTS50011")) // Rdirect url not correct error
                            {
                                return new AadClientException(responseBody, exception, statusCode);
                            }
                            if (((string)responseObject["error_description"]).Contains("AADSTS65005")) // Misconfigured application error, requires developer to update the permission list
                            {
                                return new AadClientException(responseBody, exception, statusCode);
                            }
                            return new AuthInternalServerException("The AAD configuration in server is invalid.", new Exception(responseBody));
                        case AadErrorType.InvalidRequest:
                            return new AuthInternalServerException("Request to AAD server is invalid.", new Exception(responseBody));
                        case AadErrorType.InteractionRequired:
                            return new AadUiRequiredException("The request requires user interaction. Retry the request with the same resource interactively.", new Exception(responseBody));
                    }
                }
                return new AadClientException(responseBody, exception, statusCode);
            }
        }

        // Remember to reuse the instance if a request need to use IConfidentialClientApplication multiple times
        private IConfidentialClientApplication BuildConfidentialClientApplication(string redirectUri = null)
        {
            var builder = ConfidentialClientApplicationBuilder.Create(_clientId)
                    .WithClientSecret(_clientSecret)
                    .WithAuthority(_oauthAuthority);
            if (!string.IsNullOrEmpty(redirectUri))
            {
                builder = builder.WithRedirectUri(redirectUri);
            }

            return builder.Build();
        }
    }
}
