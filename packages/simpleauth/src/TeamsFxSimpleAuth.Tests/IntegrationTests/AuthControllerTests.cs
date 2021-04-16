using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.TeamsFx.SimpleAuth.Components.Auth;
using Microsoft.TeamsFx.SimpleAuth.Models;
using Microsoft.TeamsFx.SimpleAuth.Tests.Helpers;
using Microsoft.TeamsFx.SimpleAuth.Tests.Models;
using Newtonsoft.Json;
using NUnit.Framework;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

namespace Microsoft.TeamsFx.SimpleAuth.Tests.IntegrationTests
{
    [TestFixture]
    public class AuthControllerTests
    {
        private class ExpectedProblemType
        {
            public static string AuthorizationRequestDeniedException = "AuthorizationRequestDeniedException";
            public static string InvalidModelException = "InvalidModelException";
            public static string AadClientException = "AadClientException";
            public static string AuthInternalServerException = "AuthInternalServerException";
            public static string AadUiRequiredException = "AadUiRequiredException";
        }

        private readonly IntegrationTestSettings _settings;
        private readonly IConfiguration _configuration;
        private readonly AadInfo _teamsAadInfo;
        private readonly AadInstance<Startup> _aadInstance;
        private readonly Dictionary<string, string> _defaultConfigurations;
        private readonly WebApplicationFactory<Startup> _defaultFactory;

        private const string DefaultGraphScope = "https://graph.microsoft.com/.default";
        private const string TokenApiRoute = "/auth/token";

        public AuthControllerTests()
        {
            _aadInstance = AadInstanceSetUp.defaultAadInstance;
            _settings = _aadInstance.IntegrationTestSettings;
            _configuration = _aadInstance.Configuration;
            _teamsAadInfo = _aadInstance.TeamsAadInfo;

            _defaultConfigurations = new Dictionary<string, string>()
            {
                [ConfigurationName.ClientId] = _configuration[ConfigurationName.ClientId],
                [ConfigurationName.ClientSecret] = _configuration[ConfigurationName.ClientSecret],
                [ConfigurationName.OAuthAuthority] = _configuration[ConfigurationName.OAuthAuthority],
                [ConfigurationName.IdentifierUri] = _teamsAadInfo.IdentifierUri,
                [ConfigurationName.AadMetadataAddress] = _configuration[ConfigurationName.AadMetadataAddress]
            };

            replaceTenantId();
            _defaultFactory = _aadInstance.ConfigureWebApplicationFactory(_defaultConfigurations);
        }

        private void replaceTenantId()
        {
            var AuthorizeUrl = _settings.AuthorizeUrl;
            _settings.AuthorizeUrl = AuthorizeUrl.Replace("__TENANT_ID__", _settings.TenantId);

            var oAuthAuthority = _defaultConfigurations[ConfigurationName.OAuthAuthority];
            _defaultConfigurations[ConfigurationName.OAuthAuthority] = oAuthAuthority.Replace("__TENANT_ID__", _settings.TenantId);
            _configuration[ConfigurationName.OAuthAuthority] = oAuthAuthority.Replace("__TENANT_ID__", _settings.TenantId);

            var aadMetadataAddress = _defaultConfigurations[ConfigurationName.AadMetadataAddress];
            _defaultConfigurations[ConfigurationName.AadMetadataAddress] = aadMetadataAddress.Replace("__TENANT_ID__", _settings.TenantId);
            _configuration[ConfigurationName.AadMetadataAddress] = aadMetadataAddress.Replace("__TENANT_ID__", _settings.TenantId);
        }

        #region Utility
        private async Task<HttpResponseWithBody<T>> PostToAuthTokenApi<T>(HttpClient client, PostTokenRequestBody body)
        {
            var stringContent = new StringContent(
                JsonConvert.SerializeObject(body, new JsonSerializerSettings { NullValueHandling = NullValueHandling.Ignore }),
                null, "application/json");
            return await PostToAuthTokenApi<T>(client, stringContent);
        }

        private async Task<HttpResponseWithBody<T>> PostToAuthTokenApi<T>(HttpClient client, Dictionary<string, object> body)
        {
            var stringContent = new StringContent(JsonConvert.SerializeObject(body), null, "application/json");
            return await PostToAuthTokenApi<T>(client, stringContent);
        }

        private async Task<HttpResponseWithBody<T>> PostToAuthTokenApi<T>(HttpClient client, StringContent body)
        {

            TestContext.WriteLine($"Making request to Simple Auth with body: {await body.ReadAsStringAsync()}");
            HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, TokenApiRoute)
            {
                Content = body
            };
            var response = await client.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();
            TestContext.WriteLine("API response:\n"
                + $"Status code:{response.StatusCode}\n"
                + $"Headers:{JsonConvert.SerializeObject(response.Headers)}\n"
                + $"Body:{responseBody}");

            var responseBodyObject = JsonConvert.DeserializeObject<T>(responseBody);
            return new HttpResponseWithBody<T>()
            {
                Response = response,
                Body = responseBodyObject
            };
        }
        #endregion

        [Test, Category("P0")]
        public async Task PostToken_WithNoAuhotirzationToken_Return401()
        {
            // Arrange
            var client = _defaultFactory.CreateDefaultClient();

            // Act
            var requestBody = new PostTokenRequestBody
            {
                scope = DefaultGraphScope,
                grant_type = PostTokenGrantType.SsoToken,
            };
            var result = await PostToAuthTokenApi<string>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.Unauthorized, result.Response.StatusCode);
            Assert.IsNull(result.Body);
            Assert.AreEqual("Bearer", result.Response.Headers.GetValues("WWW-Authenticate").FirstOrDefault());
        }

        [Test, Category("P0")]
        public async Task PostToken_WithNonBearerToken_Return401()
        {
            // Arrange
            string ssoToken = string.Empty;
            var client = _defaultFactory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var requestBody = new PostTokenRequestBody
            {
                scope = DefaultGraphScope,
                grant_type = PostTokenGrantType.SsoToken,
            };
            var result = await PostToAuthTokenApi<string>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.Unauthorized, result.Response.StatusCode);
            Assert.IsNull(result.Body);
            Assert.AreEqual("Bearer", result.Response.Headers.GetValues("WWW-Authenticate").FirstOrDefault());
        }

        [Test, Category("P0")]
        public async Task PostToken_WithIncorrectAuthorizationToken_Return401()
        {
            // Arrange
            string ssoToken = "not_a_jwt_token";
            var client = _defaultFactory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var requestBody = new PostTokenRequestBody
            {
                scope = DefaultGraphScope,
                grant_type = PostTokenGrantType.SsoToken,
            };
            var result = await PostToAuthTokenApi<string>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.Unauthorized, result.Response.StatusCode);
            Assert.IsNull(result.Body);
            Assert.AreEqual("Bearer error=\"invalid_token\"", result.Response.Headers.GetValues("WWW-Authenticate").FirstOrDefault());
        }

        [Test, Category("P0")]
        public async Task PostToken_WithIncorrectAudience_Return401() // TODO: confirm the behavior
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority],
                DefaultGraphScope).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var requestBody = new PostTokenRequestBody
            {
                scope = DefaultGraphScope,
                grant_type = PostTokenGrantType.SsoToken,
            };
            var result = await PostToAuthTokenApi<string>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.Unauthorized, result.Response.StatusCode);
            Assert.IsNull(result.Body);
            Assert.AreEqual("Bearer error=\"invalid_token\", error_description=\"The signature is invalid\"", result.Response.Headers.GetValues("WWW-Authenticate").FirstOrDefault());
        }

        [Test, Category("P1")]
        public async Task PostToken_WithExpiredAuthorizationToken_Return401()
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            await Task.Delay(TimeSpan.FromSeconds(15 * 60 + 20)).ConfigureAwait(false);
            var requestBody = new PostTokenRequestBody
            {
                scope = DefaultGraphScope,
                grant_type = PostTokenGrantType.SsoToken,
            };
            var result = await PostToAuthTokenApi<string>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.Unauthorized, result.Response.StatusCode);
            Assert.IsNull(result.Body);
            Assert.IsTrue(result.Response.Headers.GetValues("WWW-Authenticate").FirstOrDefault().Contains("Bearer"));
            Assert.IsTrue(result.Response.Headers.GetValues("WWW-Authenticate").FirstOrDefault().Contains("error=\"invalid_token\""));
            Assert.IsTrue(result.Response.Headers.GetValues("WWW-Authenticate").FirstOrDefault().Contains("The token expired"));
        }

        [Test, Category("P0")]
        public async Task PostToken_WithApplicationToken_Return403()
        {
            // Arrange
            var applicationToken = await Utilities.GetAccessTokenUsingClientCredentialsFlow(_configuration[ConfigurationName.OAuthAuthority],
                _teamsAadInfo.AppId, _teamsAadInfo.ClientSecret,
                Utilities.GetIdentifierUri(_settings.ApiAppIdUri, _teamsAadInfo.AppId) + "/.default");
            var client = _defaultFactory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", applicationToken);

            // Act
            var requestBody = new PostTokenRequestBody
            {
                scope = DefaultGraphScope,
                grant_type = PostTokenGrantType.SsoToken,
            };
            var result = await PostToAuthTokenApi<string>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.Forbidden, result.Response.StatusCode);
        }

        [Test, Category("P0")]
        public async Task PostToken_AuthorizationTokenClientNotAllowed_Return403()
        {
            // Arrange
            var tokenFromUnauthorizedClient = await Utilities.GetUserAccessToken(_settings, _settings.AdminClientId, _settings.AdminClientSecret,
                _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            // Temporary workaround the consent for new AAD app in each test run
            // TODO: Add UI automation to grant consent for new AAD app in each test run
            var customizedAppConfiguration = new Dictionary<string, string>(_defaultConfigurations);
            customizedAppConfiguration[ConfigurationName.IdentifierUri] = $"{_settings.AdminClientId}";
            var factory = _aadInstance.ConfigureWebApplicationFactory(customizedAppConfiguration);
            var client = factory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokenFromUnauthorizedClient);

            // Act
            var requestBody = new PostTokenRequestBody
            {
                scope = DefaultGraphScope,
                grant_type = PostTokenGrantType.SsoToken,
            };
            var result = await PostToAuthTokenApi<string>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.Forbidden, result.Response.StatusCode);
        }

        [Test, Category("P0")]
        public async Task PostToken_EmptyBody_Return400() // TODO: confirm the behavior
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var stringContent = new StringContent("", null, "application/json");
            var result = await PostToAuthTokenApi<ProblemDetails>(client, stringContent);

            // Assert
            Assert.AreEqual(HttpStatusCode.BadRequest, result.Response.StatusCode);
            Assert.AreEqual("One or more validation errors occurred.", result.Body.Title);
            Assert.AreEqual((int)HttpStatusCode.BadRequest, result.Body.Status);
        }

        [Test, Category("P0")]
        public async Task PostToken_NoBody_Return415() // TODO: confirm the behavior
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            HttpRequestMessage tokenReq = new HttpRequestMessage(HttpMethod.Post, TokenApiRoute);
            HttpResponseMessage response = await client.SendAsync(tokenReq);
            var responseBody = await response.Content.ReadAsStringAsync();
            var problemDetails = JsonConvert.DeserializeObject<ProblemDetails>(responseBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.UnsupportedMediaType, response.StatusCode);
            Assert.AreEqual("Unsupported Media Type", problemDetails.Title);
            Assert.AreEqual((int)HttpStatusCode.UnsupportedMediaType, problemDetails.Status);
        }

        [Test, Category("P0")]
        public async Task PostToken_NotSupportedGrantTypeInBody_Return400()
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var requestBody = new Dictionary<string, object>()
            {
                {"grant_type","not_supported_grant_type" },
                {"scope", DefaultGraphScope }
            };
            var result = await PostToAuthTokenApi<ProblemDetails>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.BadRequest, result.Response.StatusCode);
            Assert.AreEqual(ExpectedProblemType.InvalidModelException, result.Body.Type);
            Assert.AreEqual((int)HttpStatusCode.BadRequest, result.Body.Status);
            Assert.AreEqual("grant_type not_supported_grant_type is not supported", result.Body.Detail);
        }

        [Test, Category("P0")]
        public async Task PostToken_GrantTypeNullInBody_Return400()
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var requestBody = new PostTokenRequestBody()
            {
                grant_type = null,
                scope = DefaultGraphScope
            };
            var result = await PostToAuthTokenApi<ProblemDetails>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.BadRequest, result.Response.StatusCode);
            Assert.AreEqual(ExpectedProblemType.InvalidModelException, result.Body.Type);
            Assert.AreEqual((int)HttpStatusCode.BadRequest, result.Body.Status);
            Assert.AreEqual("grant_type is required in request body", result.Body.Detail);
        }

        [Test, Category("P0")]
        public async Task PostToken_NoGrantTypeInBody_Return400()
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var requestBody = new Dictionary<string, object>()
            {
                { "scope", DefaultGraphScope}
            };
            var result = await PostToAuthTokenApi<ProblemDetails>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.BadRequest, result.Response.StatusCode);
            Assert.AreEqual(ExpectedProblemType.InvalidModelException, result.Body.Type);
            Assert.AreEqual((int)HttpStatusCode.BadRequest, result.Body.Status);
            Assert.AreEqual("grant_type is required in request body", result.Body.Detail);
        }

        [Test, Category("P0")]
        public async Task PostToken_AuthCodeGrantWithNoScopeInBody_Return400()
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var requestBody = new PostTokenRequestBody
            {
                redirect_uri = _settings.RedirectUri,
                grant_type = AadGrantType.AuthorizationCode,
                code = Utilities.GetAuthorizationCode(_settings, _configuration),
                code_verifier = _settings.CodeVerifier
            };
            var result = await PostToAuthTokenApi<ProblemDetails>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.BadRequest, result.Response.StatusCode);
            Assert.AreEqual("application/problem+json; charset=utf-8", result.Response.Content.Headers.ContentType.ToString());
            Assert.AreEqual(ExpectedProblemType.InvalidModelException, result.Body.Type);
            Assert.AreEqual((int)HttpStatusCode.BadRequest, result.Body.Status);
            Assert.AreEqual("scope is required in request body", result.Body.Detail);
        }

        [Test, Category("P0")]
        public async Task PostToken_AuthCodeGrantWithEmptyScopeInBody_Return400()
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var requestBody = new PostTokenRequestBody
            {
                scope = "",
                redirect_uri = _settings.RedirectUri,
                grant_type = AadGrantType.AuthorizationCode,
                code = Utilities.GetAuthorizationCode(_settings, _configuration),
                code_verifier = _settings.CodeVerifier
            };
            var result = await PostToAuthTokenApi<ProblemDetails>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.BadRequest, result.Response.StatusCode);
            Assert.AreEqual("application/problem+json; charset=utf-8", result.Response.Content.Headers.ContentType.ToString());
            Assert.AreEqual("scope is required in request body", result.Body.Detail);
            Assert.AreEqual((int)HttpStatusCode.BadRequest, result.Body.Status);
            Assert.AreEqual(ExpectedProblemType.InvalidModelException, result.Body.Type);
        }

        [Test, Category("P0")]
        public async Task PostToken_AuthCodeGrantWithInvalidScope_Return400()
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);
            var Code = Utilities.GetAuthorizationCode(_settings, _configuration);
            Assert.NotNull(Code);
            // Act
            var requestBody = new PostTokenRequestBody
            {
                scope = "https://storage.azure.com/.default",
                redirect_uri = _settings.RedirectUri,
                grant_type = AadGrantType.AuthorizationCode,
                code = Utilities.GetAuthorizationCode(_settings, _configuration),
                code_verifier = _settings.CodeVerifier
            };
            var result = await PostToAuthTokenApi<ProblemDetails>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.BadRequest, result.Response.StatusCode);
            Assert.AreEqual("application/problem+json; charset=utf-8", result.Response.Content.Headers.ContentType.ToString());
            Assert.AreEqual((int)HttpStatusCode.BadRequest, result.Body.Status);
            Assert.AreEqual(ExpectedProblemType.AadClientException, result.Body.Type);
            Assert.IsTrue(result.Body.Detail.Contains("AADSTS65005"));
        }

        [Test, Category("P0")]
        public async Task PostToken_AuthCodeGrantWithIncorrectRedirectUri_Return400()
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var requestBody = new PostTokenRequestBody
            {
                scope = DefaultGraphScope,
                redirect_uri = _settings.RedirectUri + "incorrect_value",
                grant_type = AadGrantType.AuthorizationCode,
                code = Utilities.GetAuthorizationCode(_settings, _configuration),
                code_verifier = _settings.CodeVerifier
            };
            var result = await PostToAuthTokenApi<ProblemDetails>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.BadRequest, result.Response.StatusCode);
            Assert.AreEqual("application/problem+json; charset=utf-8", result.Response.Content.Headers.ContentType.ToString());
            Assert.AreEqual((int)HttpStatusCode.BadRequest, result.Body.Status);
            Assert.AreEqual(ExpectedProblemType.AadClientException, result.Body.Type);
            Assert.IsTrue(result.Body.Detail.Contains("invalid_client"));
            Assert.IsTrue(result.Body.Detail.Contains("AADSTS50011")); // Invalid reply url error
        }

        [Test, Category("P0")]
        public async Task PostToken_AuthCodeGrantWithIncorrectAuthCode_Return400()
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var requestBody = new PostTokenRequestBody
            {
                scope = DefaultGraphScope,
                redirect_uri = _settings.RedirectUri,
                grant_type = AadGrantType.AuthorizationCode,
                code = Utilities.GetAuthorizationCode(_settings, _configuration) + "incorrect_value",
                code_verifier = _settings.CodeVerifier
            };
            var result = await PostToAuthTokenApi<ProblemDetails>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.BadRequest, result.Response.StatusCode);
            Assert.AreEqual("application/problem+json; charset=utf-8", result.Response.Content.Headers.ContentType.ToString());
            Assert.AreEqual((int)HttpStatusCode.BadRequest, result.Body.Status);
            Assert.AreEqual(ExpectedProblemType.AadClientException, result.Body.Type);
            Assert.IsTrue(result.Body.Detail.Contains("invalid_grant"));
        }

        [Test, Category("P0")]
        public async Task PostToken_AuthCodeGrantWithIncorrectCodeVerifier_Return400()
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var requestBody = new PostTokenRequestBody
            {
                scope = DefaultGraphScope,
                redirect_uri = _settings.RedirectUri,
                grant_type = AadGrantType.AuthorizationCode,
                code = Utilities.GetAuthorizationCode(_settings, _configuration),
                code_verifier = _settings.CodeVerifier + "incorrect_value"
            };
            var result = await PostToAuthTokenApi<ProblemDetails>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.BadRequest, result.Response.StatusCode);
            Assert.AreEqual("application/problem+json; charset=utf-8", result.Response.Content.Headers.ContentType.ToString());
            Assert.AreEqual((int)HttpStatusCode.BadRequest, result.Body.Status);
            Assert.AreEqual(ExpectedProblemType.AadClientException, result.Body.Type);
            var detail = JsonConvert.DeserializeObject<Dictionary<string, object>>(result.Body.Detail);
            Assert.AreEqual("invalid_grant", detail["error"]);
            Assert.IsTrue(detail["error_description"].ToString().Contains("The Code_Verifier does not match the code_challenge supplied in the authorization request"));
        }

        [Test, Category("P0")]
        public async Task PostToken_AuthCodeGrantWithCorrectBody_Return200()
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient(new RetryHandler(new HttpClientHandler()));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            HttpResponseWithBody<PostTokenResponse> result = null;
            int maxRetries = 5;
            for (int i = 0; i < maxRetries; i++)
            {
                var requestBody = new PostTokenRequestBody
                {
                    scope = DefaultGraphScope,
                    redirect_uri = _settings.RedirectUri,
                    grant_type = AadGrantType.AuthorizationCode,
                    code = Utilities.GetAuthorizationCode(_settings, _configuration), // Reusing same auth code will result in error, so cannot use the retry handler
                    code_verifier = _settings.CodeVerifier
                };
                result = await PostToAuthTokenApi<PostTokenResponse>(client, requestBody);
                if (result.Response.IsSuccessStatusCode)
                {
                    break;
                }

                await Task.Delay(1000);
            }

            // Assert
            Assert.AreEqual(HttpStatusCode.OK, result.Response.StatusCode);
            Assert.AreEqual("application/json; charset=utf-8", result.Response.Content.Headers.ContentType.ToString());
            Assert.NotNull(result.Body.scope);
            Assert.IsTrue(result.Body.scope.Contains(DefaultGraphScope));
            Assert.AreNotEqual(DateTimeOffset.MinValue, result.Body.expires_on);
            Assert.NotNull(result.Body.access_token);
        }

        [Test, Category("P0")]
        public async Task PostToken_AuthCodeGrantWithAdditionalPropertyInBody_Return200()
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient(new RetryHandler(new HttpClientHandler()));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            HttpResponseWithBody<PostTokenResponse> result = null;
            int maxRetries = 5;
            for (int i = 0; i < maxRetries; i++)
            {
                var requestBody = new Dictionary<string, object>()
                {
                    ["scope"] = DefaultGraphScope,
                    ["redirect_uri"] = _settings.RedirectUri,
                    ["grant_type"] = AadGrantType.AuthorizationCode,
                    ["code"] = Utilities.GetAuthorizationCode(_settings, _configuration),
                    ["code_verifier"] = _settings.CodeVerifier,
                    ["additional_property"] = "some_value"
                };
                result = await PostToAuthTokenApi<PostTokenResponse>(client, requestBody);
                if (result.Response.IsSuccessStatusCode)
                {
                    break;
                }

                await Task.Delay(1000);
            }

            // Assert
            Assert.AreEqual(HttpStatusCode.OK, result.Response.StatusCode);
            Assert.AreEqual("application/json; charset=utf-8", result.Response.Content.Headers.ContentType.ToString());
            Assert.NotNull(result.Body.scope);
            Assert.IsTrue(result.Body.scope.Contains(DefaultGraphScope));
            Assert.AreNotEqual(DateTimeOffset.MinValue, result.Body.expires_on);
            Assert.NotNull(result.Body.access_token);
        }

        [Test, Category("P0")]
        public async Task PostToken_AuthCodeGrantWithInvalidClientSecretInApiSetting_Return500()
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var customizedAppConfiguration = new Dictionary<string, string>(_defaultConfigurations);
            customizedAppConfiguration[ConfigurationName.ClientSecret] = Guid.NewGuid().ToString();
            var factory = _aadInstance.ConfigureWebApplicationFactory(customizedAppConfiguration);
            var client = factory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var requestBody = new PostTokenRequestBody
            {
                scope = DefaultGraphScope,
                redirect_uri = _settings.RedirectUri,
                grant_type = AadGrantType.AuthorizationCode,
                code = Utilities.GetAuthorizationCode(_settings, _configuration),
                code_verifier = _settings.CodeVerifier
            };
            var result = await PostToAuthTokenApi<ProblemDetails>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.InternalServerError, result.Response.StatusCode);
            Assert.AreEqual("application/problem+json; charset=utf-8", result.Response.Content.Headers.ContentType.ToString());
            Assert.AreEqual((int)HttpStatusCode.InternalServerError, result.Body.Status);
            Assert.AreEqual(ExpectedProblemType.AuthInternalServerException, result.Body.Type);
            Assert.AreEqual("The AAD configuration in server is invalid.", result.Body.Detail);
        }

        [Test, Category("P0")]
        public async Task PostToken_SsoGrantWithNoScopeInBody_Return400()
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var requestBody = new PostTokenRequestBody
            {
                grant_type = PostTokenGrantType.SsoToken
            };
            var result = await PostToAuthTokenApi<ProblemDetails>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.BadRequest, result.Response.StatusCode);
            Assert.AreEqual("application/problem+json; charset=utf-8", result.Response.Content.Headers.ContentType.ToString());
            Assert.AreEqual((int)HttpStatusCode.BadRequest, result.Body.Status);
            Assert.AreEqual(ExpectedProblemType.InvalidModelException, result.Body.Type);
            Assert.AreEqual("scope is required in request body", result.Body.Detail);
        }

        [Test, Category("P0")]
        public async Task PostToken_SsoGrantWithEmptyScopeInBody_Return400()
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var requestBody = new PostTokenRequestBody
            {
                scope = "",
                grant_type = PostTokenGrantType.SsoToken
            };
            var result = await PostToAuthTokenApi<ProblemDetails>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.BadRequest, result.Response.StatusCode);
            Assert.AreEqual("application/problem+json; charset=utf-8", result.Response.Content.Headers.ContentType.ToString());
            Assert.AreEqual((int)HttpStatusCode.BadRequest, result.Body.Status);
            Assert.AreEqual(ExpectedProblemType.InvalidModelException, result.Body.Type);
            Assert.AreEqual("scope is required in request body", result.Body.Detail);
        }

        [Test, Category("P0")]
        public async Task PostToken_SsoGrantWithInvalidScopeInBody_Return400() // TODO: Confirm the behavior
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var requestBody = new PostTokenRequestBody
            {
                scope = "invalidscope",
                grant_type = PostTokenGrantType.SsoToken
            };
            var result = await PostToAuthTokenApi<ProblemDetails>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.BadRequest, result.Response.StatusCode);
            Assert.AreEqual("application/problem+json; charset=utf-8", result.Response.Content.Headers.ContentType.ToString());
            Assert.AreEqual((int)HttpStatusCode.BadRequest, result.Body.Status);
            Assert.AreEqual(ExpectedProblemType.AadUiRequiredException, result.Body.Type);
            Assert.IsTrue(result.Body.Detail.Contains("AADSTS65001"));
        }

        [Test, Category("P0")]
        public async Task PostToken_SsoGrantWhenUserNotGrant_Return400()
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var requestBody = new PostTokenRequestBody
            {
                scope = "https://graph.microsoft.com/User.Export.All",
                grant_type = PostTokenGrantType.SsoToken
            };
            var result = await PostToAuthTokenApi<ProblemDetails>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.BadRequest, result.Response.StatusCode);
            Assert.AreEqual("application/problem+json; charset=utf-8", result.Response.Content.Headers.ContentType.ToString());
            Assert.AreEqual((int)HttpStatusCode.BadRequest, result.Body.Status);
            Assert.AreEqual(ExpectedProblemType.AadUiRequiredException, result.Body.Type);
            Assert.IsTrue(result.Body.Detail.Contains("AADSTS65001"));
        }

        [Test, Category("P0")]
        public async Task PostToken_SsoGrantWithCorrectBody_Return200()
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient(new RetryHandler(new HttpClientHandler()));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var requestBody = new PostTokenRequestBody
            {
                scope = DefaultGraphScope,
                grant_type = PostTokenGrantType.SsoToken
            };
            var result = await PostToAuthTokenApi<PostTokenResponse>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.OK, result.Response.StatusCode);
            Assert.AreEqual("application/json; charset=utf-8", result.Response.Content.Headers.ContentType.ToString());
            Assert.IsNotNull(result.Body.access_token);
            Assert.IsTrue(result.Body.scope.Contains(DefaultGraphScope));
            Assert.AreNotEqual(DateTimeOffset.MinValue, result.Body.expires_on);
        }

        [Test, Category("P0")]
        public async Task PostToken_SsoGrantWithAdditionalPropertyInBody_Return200()
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient(new RetryHandler(new HttpClientHandler()));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var requestBody = new Dictionary<string, object>()
            {
                ["scope"] = DefaultGraphScope,
                ["grant_type"] = PostTokenGrantType.SsoToken,
                ["additional_property"] = "some_value"
            };
            var result = await PostToAuthTokenApi<PostTokenResponse>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.OK, result.Response.StatusCode);
            Assert.AreEqual("application/json; charset=utf-8", result.Response.Content.Headers.ContentType.ToString());
            Assert.IsNotNull(result.Body.access_token);
            Assert.IsTrue(result.Body.scope.Contains(DefaultGraphScope));
            Assert.AreNotEqual(DateTimeOffset.MinValue, result.Body.expires_on);
        }

        [Test, Category("P0")]
        public async Task PostToken_SsoGrantWithAnotherConsentedScope_Return200WithNewScopeInToken()
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient(new RetryHandler(new HttpClientHandler()));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var firstRequestBody = new PostTokenRequestBody
            {
                scope = DefaultGraphScope,
                grant_type = PostTokenGrantType.SsoToken
            };
            var firstResult = await PostToAuthTokenApi<PostTokenResponse>(client, firstRequestBody);
            Assert.AreEqual(HttpStatusCode.OK, firstResult.Response.StatusCode);

            // Consent another permission
            Utilities.ConsentAndGetAuthorizationCode(_settings.AuthorizeUrl, _teamsAadInfo.AppId, _settings.RedirectUri,
                "https://graph.microsoft.com/User.ReadBasic.All", _settings.CodeChallenge, _settings.TestUsername, _settings.TestPassword);

            var secondRequestBody = new PostTokenRequestBody
            {
                scope = "https://graph.microsoft.com/User.Read User.ReadBasic.All",
                grant_type = PostTokenGrantType.SsoToken
            };
            var secondResult = await PostToAuthTokenApi<PostTokenResponse>(client, secondRequestBody);
            Assert.AreEqual(HttpStatusCode.OK, secondResult.Response.StatusCode);

            // Assert
            Assert.IsTrue(firstResult.Body.scope.ToLowerInvariant().Contains("https://graph.microsoft.com/user.read"));
            Assert.IsFalse(firstResult.Body.scope.ToLowerInvariant().Contains("https://graph.microsoft.com/user.readbasic.all"));
            Assert.IsTrue(secondResult.Body.scope.ToLowerInvariant().Contains("https://graph.microsoft.com/user.readbasic.all"));
        }

        [Test, Category("P0")]
        public async Task PostToken_SsoGrantWithSameConsentedScope_Return200WithTokenFromCache()
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var client = _defaultFactory.CreateDefaultClient(new RetryHandler(new HttpClientHandler()));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var firstRequestBody = new PostTokenRequestBody
            {
                scope = DefaultGraphScope,
                grant_type = PostTokenGrantType.SsoToken
            };
            var firstResult = await PostToAuthTokenApi<PostTokenResponse>(client, firstRequestBody);
            Assert.AreEqual(HttpStatusCode.OK, firstResult.Response.StatusCode);

            var secondRequestBody = new PostTokenRequestBody
            {
                scope = DefaultGraphScope,
                grant_type = PostTokenGrantType.SsoToken
            };
            var secondResult = await PostToAuthTokenApi<PostTokenResponse>(client, secondRequestBody);
            Assert.AreEqual(HttpStatusCode.OK, secondResult.Response.StatusCode);

            // Assert
            Assert.AreEqual(firstResult.Body.access_token, secondResult.Body.access_token);
        }

        [Test, Category("P0")]
        [Ignore("Does not apply since we disables cache temporary")]
        public async Task PostToken_SsoGrantWithSameConsentedScopeWhenTokenGoingToExpire_Return200WithRefreshedToken() // TODO: long run case, mark this test case as P2
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);

            var customizedAppConfiguration = new Dictionary<string, string>(_defaultConfigurations);
            // Start a new instance so the cached token is guaranteed to expired after 10 minutes, otherwise it may expire after 1 hour according to test case executing scequence
            var factory = _aadInstance.ConfigureWebApplicationFactory(customizedAppConfiguration);
            var client = factory.CreateDefaultClient(new RetryHandler(new HttpClientHandler()));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var firstRequestBody = new PostTokenRequestBody
            {
                scope = DefaultGraphScope,
                grant_type = PostTokenGrantType.SsoToken
            };
            var firstResult = await PostToAuthTokenApi<PostTokenResponse>(client, firstRequestBody);
            Assert.AreEqual(HttpStatusCode.OK, firstResult.Response.StatusCode);

            var secondsToWait = (firstResult.Body.expires_on - DateTimeOffset.UtcNow).TotalSeconds - 4 * 60;
            if (secondsToWait > 0)
            {
                await Task.Delay(TimeSpan.FromSeconds(secondsToWait)).ConfigureAwait(false); // Wait until 4 minutes before token expire, MSAL will refresh token 5 minutes before expire
            }

            var secondRequestBody = new PostTokenRequestBody
            {
                scope = DefaultGraphScope,
                grant_type = PostTokenGrantType.SsoToken
            };
            var secondResult = await PostToAuthTokenApi<PostTokenResponse>(client, secondRequestBody);
            Assert.AreEqual(HttpStatusCode.OK, secondResult.Response.StatusCode);

            // Assert
            Assert.AreNotEqual(firstResult.Body.access_token, secondResult.Body.access_token);
            Assert.IsTrue((secondResult.Body.expires_on - DateTimeOffset.UtcNow).TotalSeconds > 5 * 60); // Token lifetime is refreshed
        }

        [Test, Category("P0")]
        public async Task PostToken_SsoGrantWithInvalidClientSecretInApiSetting_Return500()
        {
            // Arrange
            var ssoToken = await Utilities.GetUserAccessToken(_settings, _configuration[ConfigurationName.ClientId],
                _configuration[ConfigurationName.ClientSecret], _configuration[ConfigurationName.OAuthAuthority]).ConfigureAwait(false);
            var customizedAppConfiguration = new Dictionary<string, string>(_defaultConfigurations);
            customizedAppConfiguration[ConfigurationName.ClientSecret] = Guid.NewGuid().ToString();
            var factory = _aadInstance.ConfigureWebApplicationFactory(customizedAppConfiguration);
            var client = factory.CreateDefaultClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ssoToken);

            // Act
            var requestBody = new PostTokenRequestBody
            {
                scope = DefaultGraphScope,
                grant_type = PostTokenGrantType.SsoToken
            };
            var result = await PostToAuthTokenApi<ProblemDetails>(client, requestBody);

            // Assert
            Assert.AreEqual(HttpStatusCode.InternalServerError, result.Response.StatusCode);
            Assert.AreEqual("application/problem+json; charset=utf-8", result.Response.Content.Headers.ContentType.ToString());
            Assert.AreEqual((int)HttpStatusCode.InternalServerError, result.Body.Status);
            Assert.AreEqual(ExpectedProblemType.AuthInternalServerException, result.Body.Type);
            Assert.AreEqual("The AAD configuration in server is invalid.", result.Body.Detail);
        }
    }
}
