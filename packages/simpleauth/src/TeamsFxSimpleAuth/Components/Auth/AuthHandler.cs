// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Identity.Client;
using Microsoft.TeamsFx.SimpleAuth.Components.Auth.Exceptions;
using Microsoft.TeamsFx.SimpleAuth.Components.Auth.Models;
using Microsoft.TeamsFx.SimpleAuth.Exceptions;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Threading.Tasks;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;

namespace Microsoft.TeamsFx.SimpleAuth.Components.Auth
{
    public class AuthHandler
    {
        private static HttpClient _httpClient = new HttpClient();
        private string _clientId;
        private string _clientSecret;
        private string _oauthTokenEndpoint;
        private IConfidentialClientApplication _confidentialClientApplication;
        private ILogger<AuthHandler> _logger;

        public AuthHandler(IConfiguration configuration, IConfidentialClientApplication confidentialClientApplication, ILogger<AuthHandler> logger)
        {
            _logger = logger;
            _clientId = configuration[ConfigurationName.ClientId];
            _clientSecret = configuration[ConfigurationName.ClientSecret];
            _oauthTokenEndpoint = configuration[ConfigurationName.OAuthAuthority].TrimEnd('/') + "/oauth2/v2.0/token";
            _confidentialClientApplication = confidentialClientApplication;
        }

        public async Task<AuthenticationResult> AcquireTokenByAuthorizationCode(string[] scopes, string redirectUri, string authorizationCode, string codeVerifier, string ssoToken)
        {
            // MSAL confidential client does not support PKCE, compose the request by ourselves
            // Issue: https://github.com/AzureAD/microsoft-authentication-library-for-dotnet/issues/1473
            var requestBody = new AadTokenRequstBody()
            {
                client_id = _clientId,
                scope = string.Join(' ', scopes),
                redirect_uri = redirectUri,
                grant_type = AadGrantType.AuthorizationCode,
                client_secret = _clientSecret,
                code = authorizationCode,
                code_verifier = codeVerifier
            };
            _logger.LogDebug($"Acquiring token via auth code flow. Scopes: {requestBody.scope}. RedirectUri: {requestBody.redirect_uri}. ClientId: {requestBody.client_id}.");
            var response = await _httpClient.PostAsync(_oauthTokenEndpoint, new FormUrlEncodedContent(requestBody.ToDictionary())).ConfigureAwait(false);
            var responseBody = await response.Content.ReadAsStringAsync().ConfigureAwait(false);
            if (response.IsSuccessStatusCode)
            {
                // ensure ssoToken and authorizationCode belongs to the same user
                var accessToken = JsonConvert.DeserializeObject<AadTokenResponse>(responseBody).AccessToken;
                if (!JwtHaveSameObjectId(accessToken, ssoToken))
                {
                    throw new AuthorizationRequestDeniedException("authorization code and sso token in header have different object id.");
                }

                try
                {
                    _logger.LogDebug("Acquiring token via OBO flow again to ensure cache.");
                    var userAssertion = new UserAssertion(ssoToken);
                    var result = await _confidentialClientApplication.AcquireTokenOnBehalfOf(scopes, userAssertion).ExecuteAsync().ConfigureAwait(false);
                    return result;
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
            else
            {
                throw generateAadException(responseBody, response.StatusCode);
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
                } else if (String.Equals(JWTVersion.Ver1, version))
                {
                    loginHint = user.FindFirstValue(ClaimTypes.Upn);
                }

                if (String.IsNullOrEmpty(loginHint))
                {
                    throw new InvalidClaimException("loginHint is not found in SSO token");
                }
                _logger.LogDebug($"Getting token for {loginHint} with scope {JsonConvert.SerializeObject(scopes)}");
                var result = await _confidentialClientApplication.AcquireTokenSilent(scopes, loginHint)
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
                var result = await _confidentialClientApplication.AcquireTokenOnBehalfOf(scopes, userAssertion)
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
                string oid1 = decodedToken1.Claims.FirstOrDefault(claim => claim.Type == "oid").Value;
                string oid2 = decodedToken2.Claims.FirstOrDefault(claim => claim.Type == "oid").Value;
                if (!String.IsNullOrEmpty(oid1) && oid1 == oid2)
                {
                    return true;
                }
            } catch (Exception err)
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
    }
}
