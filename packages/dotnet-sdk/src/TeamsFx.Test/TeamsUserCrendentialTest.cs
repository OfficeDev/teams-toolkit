// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using Azure.Core;

using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.JSInterop;
using Microsoft.JSInterop.Infrastructure;
using Microsoft.TeamsFx.Configuration;
using Microsoft.TeamsFx.Helper;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;
using Moq.Protected;

namespace Microsoft.TeamsFx.Test
{
    [TestClass]
    public class TeamsUserCrendentialTest
    {
        private static Mock<IOptions<AuthenticationOptions>> authOptionsMock;
        private static Mock<IJSRuntime> jsRuntimeMock;
        private static Mock<IHttpClientFactory> httpFactoryMock;
        private static Mock<IMemoryCache> memoryCacheMock;

        private readonly string token = "fake_access_token";
        private readonly string scopes = "fake_scope";
        private static readonly string clientId = "fake_client_id";
        private static readonly string loginUrl = "fake_login_url";
        private static readonly string authEndpoint = "https://localhost";
        private readonly string invalidSsoToken = "invalid-sso-token";
        /// <summary>
        /// Fake sso token payload, debug using https://jwt.io/
        /// {
        ///   "oid": "fake-oid",
        ///   "name": "fake-name",
        ///   "ver": "1.0",
        ///   "exp": 1893456000, // 2030/1/1
        ///   "upn": "fake-upn",
        ///   "tid": "fake-tid",
        ///   "aud": "fake-aud"
        /// }
        /// </summary>
        private readonly string fakeSsoToken = "eyJhbGciOiJIUzI1NiJ9.eyJvaWQiOiJmYWtlLW9pZCIsIm5hbWUiOiJmYWtlLW5hbWUiLCJ2ZXIiOiIxLjAiLCJleHAiOjE4OTM0NTYwMDAsInVwbiI6ImZha2UtdXBuIiwidGlkIjoiZmFrZS10aWQiLCJhdWQiOiJmYWtlLWF1ZCJ9.IpOpEOoAoqVShYafBEGPr9w8dxYPRU9aln5YRBvoajE";
        private readonly DateTimeOffset fakeExpiration = DateTimeOffset.FromUnixTimeSeconds(1893456000);

        [ClassInitialize]
        public static void TestFixtureSetup(TestContext _)
        {
            // Executes once for the test class. (Optional)
            jsRuntimeMock = new Mock<IJSRuntime>();
            authOptionsMock = new Mock<IOptions<AuthenticationOptions>>();
            httpFactoryMock = new Mock<IHttpClientFactory>();
            memoryCacheMock = new Mock<IMemoryCache>();
            authOptionsMock.SetupGet(option => option.Value).Returns(
                new AuthenticationOptions()
                {
                    ClientId = clientId,
                    InitiateLoginEndpoint = loginUrl,
                    SimpleAuthEndpoint = authEndpoint
                });
        }

        #region GetUserInfo
        [TestMethod]
        public async Task TestGetUserInfoWithoutTeamsEnvironment()
        {
            var moduleMock = new Mock<IJSObjectReference>();
            var loggerMock = new Mock<ILogger<TeamsUserCredential>>();
            var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, httpFactoryMock.Object, memoryCacheMock.Object);
            jsRuntimeMock.Setup(r => r.InvokeAsync<IJSObjectReference>("import", It.IsAny<object[]>())).ReturnsAsync(() => moduleMock.Object);
            moduleMock.Setup(m => m.InvokeAsync<IJSVoidResult>("initialize", It.IsAny<object[]>())).ThrowsAsync(new JSException("timeout"));

            var ex = await Assert.ThrowsExceptionAsync<ExceptionWithCode>(
                async () => await teamsCredential.GetUserInfoAsync());

            Assert.AreEqual(ExceptionCode.InternalError, ex.Code);
            Assert.AreEqual("Initialize teams sdk timeout, maybe the code is not running inside Teams", ex.Message);
            loggerMock.Verify(
                x => x.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((o, t) => string.Equals("Initialize teams sdk timeout, maybe the code is not running inside Teams", o.ToString(), StringComparison.InvariantCultureIgnoreCase)),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);
        }

        [TestMethod]
        public async Task TestGetUserInfoWithSsoTokenFailure()
        {
            var moduleMock = new Mock<IJSObjectReference>();
            var loggerMock = new Mock<ILogger<TeamsUserCredential>>();
            var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, httpFactoryMock.Object, memoryCacheMock.Object);
            jsRuntimeMock.Setup(r => r.InvokeAsync<IJSObjectReference>("import", It.IsAny<object[]>())).ReturnsAsync(() => moduleMock.Object);
            moduleMock.Setup(m => m.InvokeAsync<string>("getAuthToken", It.IsAny<object[]>())).ThrowsAsync(new JSException("test"));

            var ex = await Assert.ThrowsExceptionAsync<ExceptionWithCode>(
                async () => await teamsCredential.GetUserInfoAsync());

            Assert.AreEqual(ExceptionCode.InternalError, ex.Code);
            Assert.AreEqual("Get SSO token failed with error: test", ex.Message);
            loggerMock.Verify(
                x => x.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((o, t) => string.Equals("Get SSO token failed with error: test", o.ToString(), StringComparison.InvariantCultureIgnoreCase)),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);
        }

        [TestMethod]
        public async Task TestGetUserInfoWithEmptySsoToken()
        {
            var moduleMock = new Mock<IJSObjectReference>();
            var loggerMock = new Mock<ILogger<TeamsUserCredential>>();
            var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, httpFactoryMock.Object, memoryCacheMock.Object);
            jsRuntimeMock.Setup(r => r.InvokeAsync<IJSObjectReference>("import", It.IsAny<object[]>())).ReturnsAsync(() => moduleMock.Object);
            moduleMock.Setup(m => m.InvokeAsync<string>("getAuthToken", It.IsAny<object[]>())).ReturnsAsync("");

            var ex = await Assert.ThrowsExceptionAsync<ExceptionWithCode>(
                async () => await teamsCredential.GetUserInfoAsync());

            Assert.AreEqual(ExceptionCode.InternalError, ex.Code);
            Assert.AreEqual("Get empty SSO token from Teams", ex.Message);
            loggerMock.Verify(
                x => x.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((o, t) => string.Equals("Get empty SSO token from Teams", o.ToString(), StringComparison.InvariantCultureIgnoreCase)),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);
        }

        [TestMethod]
        public async Task TestGetUserInfoWithInvalidSsoToken()
        {
            var moduleMock = new Mock<IJSObjectReference>();
            var loggerMock = new Mock<ILogger<TeamsUserCredential>>();
            var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, httpFactoryMock.Object, memoryCacheMock.Object);
            jsRuntimeMock.Setup(r => r.InvokeAsync<IJSObjectReference>("import", It.IsAny<object[]>())).ReturnsAsync(() => moduleMock.Object);
            moduleMock.Setup(m => m.InvokeAsync<string>("getAuthToken", It.IsAny<object[]>())).ReturnsAsync(invalidSsoToken);

            var ex = await Assert.ThrowsExceptionAsync<ExceptionWithCode>(
                async () => await teamsCredential.GetUserInfoAsync());

            Assert.AreEqual(ExceptionCode.InternalError, ex.Code);
            Assert.IsTrue(ex.Message.StartsWith("Parse jwt token failed with error:"));
            loggerMock.Verify(
                x => x.Log(
                    LogLevel.Error,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((o, t) => o.ToString().StartsWith("Parse jwt token failed with error:")),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);
        }

        [TestMethod]
        public async Task TestGetUserInfoSuccessfully()
        {
            var moduleMock = new Mock<IJSObjectReference>();
            var loggerMock = new Mock<ILogger<TeamsUserCredential>>();
            var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, httpFactoryMock.Object, memoryCacheMock.Object);
            jsRuntimeMock.Setup(r => r.InvokeAsync<IJSObjectReference>("import", It.IsAny<object[]>())).ReturnsAsync(() => moduleMock.Object);
            moduleMock.Setup(m => m.InvokeAsync<string>("getAuthToken", It.IsAny<object[]>())).ReturnsAsync(fakeSsoToken);

            var userInfo = await teamsCredential.GetUserInfoAsync();

            Assert.AreEqual("fake-name", userInfo.DisplayName);
            Assert.AreEqual("fake-oid", userInfo.ObjectId);
            Assert.AreEqual("fake-upn", userInfo.PreferredUserName);
            loggerMock.Verify(
                x => x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((o, t) => string.Equals("Get basic user info from SSO token", o.ToString(), StringComparison.InvariantCultureIgnoreCase)),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);
        }
        #endregion

        #region GetToken
        [TestMethod]
        public async Task TestGetTokenWithEmptyScopes()
        {
            var moduleMock = new Mock<IJSObjectReference>();
            var loggerMock = new Mock<ILogger<TeamsUserCredential>>();
            var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, httpFactoryMock.Object, memoryCacheMock.Object);
            jsRuntimeMock.Setup(r => r.InvokeAsync<IJSObjectReference>("import", It.IsAny<object[]>())).ReturnsAsync(() => moduleMock.Object);
            moduleMock.Setup(m => m.InvokeAsync<string>("getAuthToken", It.IsAny<object[]>())).ReturnsAsync(fakeSsoToken);

            var token = await teamsCredential.GetTokenAsync(new TokenRequestContext(), new CancellationToken());

            Assert.AreEqual(fakeSsoToken, token.Token);
            Assert.AreEqual(fakeExpiration, token.ExpiresOn);
            loggerMock.Verify(
                x => x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((o, t) => string.Equals("Get SSO token", o.ToString(), StringComparison.InvariantCultureIgnoreCase)),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);
        }

        [TestMethod]
        public async Task TestGetTokenWithEmptyScopesFromMemoryCache()
        {
            var moduleMock = new Mock<IJSObjectReference>();
            var loggerMock = new Mock<ILogger<TeamsUserCredential>>();
            var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, httpFactoryMock.Object, memoryCacheMock.Object)
            {
                _ssoToken = new Model.AccessToken(fakeSsoToken, fakeExpiration)
            };

            var token = await teamsCredential.GetTokenAsync(new TokenRequestContext(), new CancellationToken());

            Assert.AreEqual(fakeSsoToken, token.Token);
            Assert.AreEqual(fakeExpiration, token.ExpiresOn);
            loggerMock.Verify(
                x => x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((o, t) => string.Equals("Get SSO token", o.ToString(), StringComparison.InvariantCultureIgnoreCase)),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);
            loggerMock.Verify(
                x => x.Log(
                    LogLevel.Trace,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((o, t) => string.Equals("Get SSO token from memory cache", o.ToString(), StringComparison.InvariantCultureIgnoreCase)),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);
        }

        [TestMethod]
        public async Task TestGetTokenWithScopeFromMemoryCache()
        {
            var moduleMock = new Mock<IJSObjectReference>();
            var loggerMock = new Mock<ILogger<TeamsUserCredential>>();
            var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, httpFactoryMock.Object, memoryCacheMock.Object)
            {
                _ssoToken = new Model.AccessToken(fakeSsoToken, fakeExpiration),
                _isWebAssembly = false
            };
            object fakeAccessToken = new Model.AccessToken(token, fakeExpiration);
            var cacheKey = Utils.GetCacheKey(fakeSsoToken, scopes, clientId);
            memoryCacheMock.Setup(cache => cache.TryGetValue(It.IsAny<object>(), out fakeAccessToken)).Returns(true);

            var accessToken = await teamsCredential.GetTokenAsync(new TokenRequestContext(new string[] { scopes }), new CancellationToken());

            Assert.AreEqual(token, accessToken.Token);
            Assert.AreEqual(fakeExpiration, accessToken.ExpiresOn);
            loggerMock.Verify(
                x => x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((o, t) => string.Equals("Get access token with scopes: fake_scope", o.ToString(), StringComparison.InvariantCultureIgnoreCase)),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);
            loggerMock.Verify(
                x => x.Log(
                    LogLevel.Trace,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((o, t) => string.Equals("Get access token from cache", o.ToString(), StringComparison.InvariantCultureIgnoreCase)),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);
        }

        [TestMethod]
        public async Task TestGetTokenWithScopeFromSimpleAuthServerSuccessfully()
        {
            var moduleMock = new Mock<IJSObjectReference>();
            var loggerMock = new Mock<ILogger<TeamsUserCredential>>();
            var httpFactoryMock = new Mock<IHttpClientFactory>();
            var memoryCacheMock = new Mock<IMemoryCache>();
            var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, httpFactoryMock.Object, memoryCacheMock.Object)
            {
                _ssoToken = new Model.AccessToken(fakeSsoToken, fakeExpiration)
            };

            var handlerMock = new Mock<HttpMessageHandler>();
            var response = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent($"{{ \"scope\": \"fake_scope\", \"access_token\": \"{fakeSsoToken}\", \"expires_on\": \"{fakeExpiration:O}\" }}"),
            };

            handlerMock
               .Protected()
               .Setup<Task<HttpResponseMessage>>(
                  "SendAsync",
                  ItExpr.IsAny<HttpRequestMessage>(),
                  ItExpr.IsAny<CancellationToken>())
               .ReturnsAsync(response);
            var httpClient = new HttpClient(handlerMock.Object);

            httpFactoryMock.Setup(factory => factory.CreateClient(It.IsAny<string>())).Returns(httpClient);
            var cacheEntry = Mock.Of<ICacheEntry>();
            memoryCacheMock.Setup(cache => cache.CreateEntry(It.IsAny<object>())).Returns(cacheEntry);

            var accessToken = await teamsCredential.GetTokenAsync(new TokenRequestContext(new string[] { scopes }), new CancellationToken());

            Assert.AreEqual(fakeSsoToken, accessToken.Token);
            Assert.AreEqual(fakeExpiration, accessToken.ExpiresOn);
            handlerMock.Protected().Verify(
               "SendAsync",
               Times.Exactly(1),
               ItExpr.Is<HttpRequestMessage>(
                   req => req.Method == HttpMethod.Post &&
                    req.Headers.Authorization.Scheme == "Bearer" &&
                    req.Headers.Authorization.Parameter == fakeSsoToken &&
                    req.RequestUri.ToString() == "https://localhost/auth/token"),
               ItExpr.IsAny<CancellationToken>());
            loggerMock.Verify(
                x => x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((o, t) => string.Equals("Get access token with scopes: fake_scope", o.ToString(), StringComparison.InvariantCultureIgnoreCase)),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);
            loggerMock.Verify(
                x => x.Log(
                    LogLevel.Trace,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((o, t) => string.Equals("No cached access token", o.ToString(), StringComparison.InvariantCultureIgnoreCase)),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);
        }

        [TestMethod]
        public async Task TestGetTokenWithScopeFromSimpleAuthServerWithLoginError()
        {
            var moduleMock = new Mock<IJSObjectReference>();
            var loggerMock = new Mock<ILogger<TeamsUserCredential>>();
            var httpFactoryMock = new Mock<IHttpClientFactory>();
            var memoryCacheMock = new Mock<IMemoryCache>();
            var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, httpFactoryMock.Object, memoryCacheMock.Object)
            {
                _ssoToken = new Model.AccessToken(fakeSsoToken, fakeExpiration)
            };

            var handlerMock = new Mock<HttpMessageHandler>();
            var response = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.Forbidden,
                Content = new StringContent($"{{ \"type\": \"AadUiRequiredException\", \"message\": \"msg\" }}"),
            };

            handlerMock
               .Protected()
               .Setup<Task<HttpResponseMessage>>(
                  "SendAsync",
                  ItExpr.IsAny<HttpRequestMessage>(),
                  ItExpr.IsAny<CancellationToken>())
               .ReturnsAsync(response);
            var httpClient = new HttpClient(handlerMock.Object);

            httpFactoryMock.Setup(factory => factory.CreateClient(It.IsAny<string>())).Returns(httpClient);
            var cacheEntry = Mock.Of<ICacheEntry>();
            memoryCacheMock.Setup(cache => cache.CreateEntry(It.IsAny<object>())).Returns(cacheEntry);

            var ex = await Assert.ThrowsExceptionAsync<ExceptionWithCode>(
                async () => await teamsCredential.GetTokenAsync(new TokenRequestContext(new string[] { scopes }), new CancellationToken()));

            Assert.AreEqual(ExceptionCode.UiRequiredError, ex.Code);
            handlerMock.Protected().Verify(
               "SendAsync",
               Times.Exactly(1),
               ItExpr.Is<HttpRequestMessage>(
                   req => req.Method == HttpMethod.Post &&
                    req.Headers.Authorization.Scheme == "Bearer" &&
                    req.Headers.Authorization.Parameter == fakeSsoToken &&
                    req.RequestUri.ToString() == "https://localhost/auth/token"),
               ItExpr.IsAny<CancellationToken>());
            loggerMock.Verify(
                x => x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((o, t) => string.Equals("Get access token with scopes: fake_scope", o.ToString(), StringComparison.InvariantCultureIgnoreCase)),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);
            loggerMock.Verify(
                x => x.Log(
                    LogLevel.Trace,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((o, t) => string.Equals("No cached access token", o.ToString(), StringComparison.InvariantCultureIgnoreCase)),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);
        }
        #endregion

        #region Login
        [TestMethod]
        public async Task TestLoginSuccessfully()
        {
            var moduleMock = new Mock<IJSObjectReference>();
            var loggerMock = new Mock<ILogger<TeamsUserCredential>>();
            var httpFactoryMock = new Mock<IHttpClientFactory>();
            var memoryCacheMock = new Mock<IMemoryCache>();
            var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, httpFactoryMock.Object, memoryCacheMock.Object);

            jsRuntimeMock.Setup(r => r.InvokeAsync<IJSObjectReference>("import", It.IsAny<object[]>())).ReturnsAsync(() => moduleMock.Object);
            var authToken = $"{{\"code\": \"code\", \"codeVerifier\": \"codeVerifier\", \"redirectUri\": \"redirectUri\"}}";
            moduleMock.Setup(m => m.InvokeAsync<string>("authenticate", It.IsAny<object[]>())).ReturnsAsync(authToken);

            teamsCredential._ssoToken = new Model.AccessToken(fakeSsoToken, fakeExpiration);

            var handlerMock = new Mock<HttpMessageHandler>();
            var response = new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent($"{{ \"scope\": \"fake_scope\", \"access_token\": \"{fakeSsoToken}\", \"expires_on\": \"{fakeExpiration:O}\" }}"),
            };

            handlerMock
               .Protected()
               .Setup<Task<HttpResponseMessage>>(
                  "SendAsync",
                  ItExpr.IsAny<HttpRequestMessage>(),
                  ItExpr.IsAny<CancellationToken>())
               .ReturnsAsync(response);
            var httpClient = new HttpClient(handlerMock.Object);

            httpFactoryMock.Setup(factory => factory.CreateClient(It.IsAny<string>())).Returns(httpClient);
            var cacheEntry = Mock.Of<ICacheEntry>();
            memoryCacheMock.Setup(cache => cache.CreateEntry(It.IsAny<object>())).Returns(cacheEntry);

            await teamsCredential.LoginAsync(scopes);

            handlerMock.Protected().Verify(
               "SendAsync",
               Times.Exactly(1),
               ItExpr.Is<HttpRequestMessage>(
                   req => req.Method == HttpMethod.Post &&
                    req.Headers.Authorization.Scheme == "Bearer" &&
                    req.Headers.Authorization.Parameter == fakeSsoToken &&
                    req.RequestUri.ToString() == "https://localhost/auth/token"),
               ItExpr.IsAny<CancellationToken>());
            loggerMock.Verify(
                x => x.Log(
                    LogLevel.Information,
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((o, t) => string.Equals("Popup login page to get user's access token with scopes: fake_scope", o.ToString(), StringComparison.InvariantCultureIgnoreCase)),
                    It.IsAny<Exception>(),
                    It.IsAny<Func<It.IsAnyType, Exception, string>>()),
                Times.Once);
            memoryCacheMock.Verify(cache => cache.CreateEntry("accessToken-fake-oid-fake_client_id-fake-tid-fake_scope"), Times.Once);
        }
        #endregion

        [TestMethod]
        public void TestGetTokenException()
        {
            var loggerMock = new Mock<ILogger<TeamsUserCredential>>();
            var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, httpFactoryMock.Object, memoryCacheMock.Object);
            Assert.ThrowsException<NotImplementedException>(() => teamsCredential.GetToken(new TokenRequestContext(new string[] { scopes }), new CancellationToken()));
        }
    }
}
