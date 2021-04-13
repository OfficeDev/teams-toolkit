using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.TeamsFx.SimpleAuth.Components.Auth;
using Microsoft.TeamsFx.SimpleAuth.Exceptions;
using Microsoft.TeamsFx.SimpleAuth.Models;
using Newtonsoft.Json;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace Microsoft.TeamsFx.SimpleAuth.Controllers
{
    [ApiController]
    [ServiceFilter(typeof(SimpleAuthExceptionFilter))]
    [Route("auth")]
    [Authorize(AuthenticationSchemes = "Bearer", Policy = "ValidateTokenVersion")]
    public class AuthController : ControllerBase
    {
        #region Private Resources
        private class GrantType
        {
            public const string AuthorizationCode = "authorization_code";
            public const string SsoToken = "sso_token";
        }

        private class CommonScope
        {
            public const string OfflineAccess = "offline_access";
        }

        private readonly ILogger<AuthController> _logger;
        private AuthHandler _authHandler;
        #endregion

        public AuthController(ILogger<AuthController> logger, AuthHandler authHandler)
        {
            _logger = logger;
            _authHandler = authHandler;
        }

        [Authorize(Policy = "ValidateAppId")]
        [Authorize(Policy = "ValidateUserIdentity")]
        [HttpPost("token")]
        public async Task<IActionResult> PostToken([FromBody] PostTokenRequestBody body)
        {
            _logger.LogDebug($"New request to token endpoint. Simple Auth version:{GlobalConfig.SimpleAuthVersion}."
                +$"Body:{JsonConvert.SerializeObject(body)}. Headers:{JsonConvert.SerializeObject(Request.Headers)}");
            if (string.IsNullOrEmpty(body.scope))
            {
                throw new InvalidModelException("scope is required in request body");
            }

            switch (body.grant_type)
            {
                case GrantType.AuthorizationCode:
                    return await AuthCodeFlow(body).ConfigureAwait(false);
                case GrantType.SsoToken:
                    return await AcquireAccessTokenBySsoToken(body).ConfigureAwait(false);
                case null:
                    throw new InvalidModelException("grant_type is required in request body");
                default:
                    throw new InvalidModelException($"grant_type {body.grant_type} is not supported");
            }
        }

        private async Task<IActionResult> AuthCodeFlow(PostTokenRequestBody body)
        {
            var scopes = body.scope.Split(' ');
            if (!scopes.Contains(CommonScope.OfflineAccess))
            {
                scopes.Append(CommonScope.OfflineAccess);
            }

            var ssoToken = GetJwtBearerTokenFromRequest();
            var token = await _authHandler.AcquireTokenByAuthorizationCode(
                scopes,
                body.redirect_uri,
                body.code,
                body.code_verifier,
                ssoToken)
                .ConfigureAwait(false);

            var result = new PostTokenResponse()
            {
                access_token = token.AccessToken,
                scope = string.Join(' ', token.Scopes),
                expires_on = token.ExpiresOn
            };

            return Ok(result);
        }

        private async Task<IActionResult> AcquireAccessTokenBySsoToken(PostTokenRequestBody body)
        {
            string[] scopes = body.scope.Split(' ');
            var ssoToken = GetJwtBearerTokenFromRequest();

            // Do not get from cache temporary due to MSAL scope matching issue when cached token contains .default scope
            //var token = await _authHandler.AcquireTokenBySsoToken(User, ssoToken, scopes).ConfigureAwait(false);

            var token = await _authHandler.AcquireTokenBySsoTokenOnBehalfOf(ssoToken, scopes).ConfigureAwait(false);

            return Ok(new PostTokenResponse
            {
                access_token = token.AccessToken,
                scope = string.Join(' ', token.Scopes),
                expires_on = token.ExpiresOn
            });
        }

        private string GetJwtBearerTokenFromRequest()
        {
            return Request.Headers["Authorization"].ToString().Substring("Bearer ".Length);
        }
    }
}
