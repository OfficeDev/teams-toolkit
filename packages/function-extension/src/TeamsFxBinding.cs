// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using JWT;
using JWT.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Azure.WebJobs.Host.Bindings;
using Microsoft.Azure.WebJobs.Host.Protocols;
using Microsoft.Extensions.Logging;
using Microsoft.Identity.Client;
using Microsoft.Net.Http.Headers;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace Microsoft.Azure.WebJobs.Extensions.TeamsFx
{
    public class TeamsFxBinding : IBinding
    {
        private const string MissingClaimClientIdValidationError = "Cannot validate client id in token: {0} does not exist in access token.";
        private const string AuthorizationErrorContentType = "text/plain; charset=utf-8";
        private const string RequestBindingName = "$request";
        private TeamsFxAttribute _bindingAttribute;
        private readonly ILogger _logger;

        public TeamsFxBinding(BindingProviderContext bindingProviderContext, ILogger logger)
        {
            _logger = logger;

            try
            {
                _bindingAttribute = bindingProviderContext.Parameter.GetCustomAttribute<TeamsFxAttribute>();
            }
            catch (Exception ex)
            {
                _logger.LogError("Fail to get custom TeamsFx attribute. Error message: " + ex.Message);
                throw;
            }
        }

        public bool FromAttribute
        {
            get
            {
                return true;
            }
        }

        public async Task<IValueProvider> BindAsync(BindingContext context)
        {
            _logger.LogDebug($"TeamsFx version:{GlobalConfig.TeamsFxVersion}.");

            // Get configuration settings
            var accessToken = string.Empty;

            // Get the access token in HTTP request header and do authorization for http trigger
            // We rely on Web App authentication feature to validate the token, assume the authorization token is valid
            if (context.BindingData.ContainsKey(RequestBindingName))
            {
                _logger.LogDebug("Do authorization for access token in HTTP request ");

                var httpRequest = context.BindingData[RequestBindingName] as HttpRequest;
                accessToken = httpRequest.Headers[HeaderNames.Authorization];
                // Do extra check to avoid errors in local debugging scenario
                if (string.IsNullOrEmpty(accessToken))
                {
                    var responseBody = "No authorization header in http request.";
                    await ModifyHttpResponse(httpRequest.HttpContext.Response, 401, responseBody).ConfigureAwait(false);
                    _logger.LogDebug(responseBody);
                    throw new Exception(responseBody);
                }
                var claim = new JwtBuilder().Decode<Dictionary<string, object>>(accessToken);

                // Only allow access token whose client id is in the list of `ALLOWED_APP_IDS` or equals to `CLIENT_ID` setting.
                try
                {
                    ValidateClientId(claim);
                }
                catch (AuthorizationException e)
                {
                    await ModifyHttpResponse(httpRequest.HttpContext.Response, 403, e.Message).ConfigureAwait(false);
                    _logger.LogDebug("Authorization exception while validating client id. Error message: " + e.Message);
                    throw;
                }
                catch (Exception e)
                {
                    var message = "Unexpected exception thrown when validating client id: " + e.Message;
                    _logger.LogDebug(message);
                    throw new Exception(message);
                }

                // Refresh user access token if it's about to expire
                // Follow official recommendation: https://docs.microsoft.com/en-us/azure/active-directory/develop/access-tokens#user-and-application-tokens
                if (!claim.ContainsKey(JwtClaim.Idtyp) || ((string)claim[JwtClaim.Idtyp]) != Constants.IdtypApp) // Prerequisite: the AAD app configured for Function App requires idtyp optional claim
                {
                    _logger.LogDebug("User access token. Check if needs refreshing.");
                    var exp = (long)claim[JwtClaim.Exp];
                    _logger.LogDebug("exp: " + exp);
                    if (exp < UnixEpoch.GetSecondsSince(DateTimeOffset.UtcNow.AddMinutes(_bindingAttribute.TokenRefreshBufferMinutes))) // Refresh if token will expire in given time
                    {
                        accessToken = await GetRefreshedToken(accessToken, claim).ConfigureAwait(false);
                    }
                }
            }
            else
            {
                _logger.LogDebug("Fail to find " + RequestBindingName + " in context binding data.");
            }

            // Return a value provider
            var config = new TeamsFxContext
            {
                AccessToken = accessToken.Substring("Bearer ".Length)
            };
            return new TeamsFxValueProvider(config, _logger);
        }

        public Task<IValueProvider> BindAsync(object value, ValueBindingContext context)
        {
            throw new NotImplementedException();
        }

        public ParameterDescriptor ToParameterDescriptor()
        {
            return new ParameterDescriptor
            {
                DisplayHints = new ParameterDisplayHints
                {
                    Description = "TeamsFxBinding"
                }
            };
        }

        private async Task<string> GetRefreshedToken(string accessToken, Dictionary<string, object> claim)
        {
            _logger.LogDebug("Get refresh token for user access token.");
            try
            {
                var confidentialApp = ConfidentialClientApplicationBuilder
                   .Create(_bindingAttribute.ClientId)
                   .WithClientSecret(_bindingAttribute.ClientSecret)
                   .WithAuthority(_bindingAttribute.OAuthAuthority)
                   .Build();
                var userAssertion = new UserAssertion(accessToken.Substring(Constants.BearerScheme.Length + 1));
                var accessAsUserScope = new string[] { _bindingAttribute.ClientId + "/" + Constants.AccessAsUserScope };
                var loginHint = GetUserLoginHint(claim);
                await confidentialApp.AcquireTokenOnBehalfOf(accessAsUserScope, userAssertion).ExecuteAsync().ConfigureAwait(false); // Get the refresh token
                var refreshedToken = await confidentialApp.AcquireTokenSilent(accessAsUserScope, loginHint)
                                                            .WithForceRefresh(true).ExecuteAsync().ConfigureAwait(false);
                return refreshedToken.AccessToken;
            }
            catch (Exception ex)
            {
                // ignore token refresh error
                _logger.LogDebug("Encounter exception when getting refreshed token. Ignore the error: " + ex.Message);
            }
            return accessToken; // still pass eixsting token to SDK if refresh failed
        }

        // Note: only call this once for each response
        private async Task ModifyHttpResponse(HttpResponse response, int statusCode, string body)
        {
            response.StatusCode = statusCode;
            response.ContentType = AuthorizationErrorContentType;
            response.ContentLength = body.Length;
            await response.WriteAsync(body, Encoding.UTF8).ConfigureAwait(false);
            await response.Body.FlushAsync().ConfigureAwait(false);
        }

        private string GetUserLoginHint(Dictionary<string, object> claim)
        {
            if (!claim.ContainsKey(JwtClaim.Ver))
            {
                throw new Exception("Cannot determine token version.");
            }
            string version = (string)claim[JwtClaim.Ver];
            _logger.LogDebug("Token version: " + version);

            string loginHint = null;
            if (String.Equals(version, Constants.JwtVersion1))
            {
                if (claim.ContainsKey(JwtClaim.Upn))
                {
                    loginHint = (string)claim[JwtClaim.Upn];
                }
            }
            else if (String.Equals(version, Constants.JwtVersion2))
            {
                if (claim.ContainsKey(JwtClaim.PreferredUserName))
                {
                    loginHint = (string)claim[JwtClaim.PreferredUserName];
                }
            }

            if (string.IsNullOrEmpty(loginHint))
            {
                throw new Exception("Cannot find username in token.");
            }

            _logger.LogDebug("Token login hint: " + loginHint);
            return loginHint;
        }

        private void ValidateClientId(Dictionary<string, object> claim)
        {
            if (!claim.ContainsKey(JwtClaim.Ver))
            {
                throw new AuthorizationException(string.Format(MissingClaimClientIdValidationError, JwtClaim.Ver));
            }

            string tokenVernsion = (string)claim[JwtClaim.Ver];
            string clientIdFromToken = string.Empty;
            if (tokenVernsion == Constants.JwtVersion1)
            {
                if (!claim.ContainsKey(JwtClaim.AppId))
                {
                    throw new AuthorizationException(string.Format(MissingClaimClientIdValidationError, JwtClaim.AppId));
                }
                clientIdFromToken = (string)claim[JwtClaim.AppId];
            }
            else if (tokenVernsion == Constants.JwtVersion2)
            {
                if (!claim.ContainsKey(JwtClaim.Azp))
                {
                    throw new AuthorizationException(string.Format(MissingClaimClientIdValidationError, JwtClaim.Azp));
                }
                clientIdFromToken = (string)claim[JwtClaim.Azp];
            }
            else
            {
                throw new AuthorizationException($"Cannot validate client id in token: token version {tokenVernsion} is not supported.");
            }

            List<string> allowedClientIds = new List<string>{ _bindingAttribute.ClientId };
            if (!string.IsNullOrEmpty(_bindingAttribute.AllowedAppIds))
            {
                allowedClientIds.AddRange(_bindingAttribute.AllowedAppIds.Split(';').ToList<string>());
            }
            if (string.IsNullOrEmpty(clientIdFromToken) || !allowedClientIds.Contains(clientIdFromToken))
            {
                throw new AuthorizationException($"Access token validation failed: client id {clientIdFromToken} is not authorized to invoke this http trigger.");
            }
        }
    }
}