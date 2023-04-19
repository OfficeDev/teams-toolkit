// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Azure.Core;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Identity.Client;
using Microsoft.JSInterop;
using Microsoft.JSInterop.Infrastructure;
using Microsoft.TeamsFx.Configuration;
using Microsoft.TeamsFx.Helper;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Moq;
using LogLevel = Microsoft.Extensions.Logging.LogLevel;

namespace Microsoft.TeamsFx.Test;

[TestClass]
public class TeamsUserCrendentialTest
{
    private static Mock<IOptions<AuthenticationOptions>> authOptionsMock;
    private static Mock<IJSRuntime> jsRuntimeMock;
    private static Mock<IIdentityClientAdapter> identityClientAdapterMock;

    /// <summary>
    /// Fake sso token payload, debug using https://jwt.io/
    /// {
    ///   "oid": "fake-oid",
    ///   "name": "fake-name",
    ///   "ver": "1.0",
    ///   "exp": 1893456001,
    ///   "upn": "fake-upn",
    ///   "tid": "fake-tid",
    ///   "aud": "fake-aud"
    /// }
    /// </summary>
    private readonly string fakeAccessToken = "eyJhbGciOiJIUzI1NiJ9.eyJvaWQiOiJmYWtlLW9pZCIsIm5hbWUiOiJmYWtlLW5hbWUiLCJ2ZXIiOiIxLjAiLCJleHAiOjE4OTM0NTYwMDEsInVwbiI6ImZha2UtdXBuIiwidGlkIjoiZmFrZS10aWQiLCJhdWQiOiJmYWtlLWF1ZCJ9.koLfiJSWCFbDXgWV7cauoXtuswTW80MIxLsp2oomaCk";
    private readonly string fakeScopes = "fake_scope";
    private static readonly string fakeClientId = "fake_client_id";
    private static readonly string fakeClientSecret = "fake_client_secret";
    private static readonly string fakeLoginUrl = "fake_login_url";
    private static readonly string fakeOauthAuthority = "https://localhost";
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
        identityClientAdapterMock = new Mock<IIdentityClientAdapter>();
        authOptionsMock.SetupGet(option => option.Value).Returns(
            new AuthenticationOptions()
            {
                ClientId = fakeClientId,
                ClientSecret = fakeClientSecret,
                InitiateLoginEndpoint = fakeLoginUrl,
                OAuthAuthority = fakeOauthAuthority
            });
    }

    #region GetUserInfo
    [TestMethod]
    public async Task TestGetUserInfoWithoutTeamsEnvironment()
    {
        var moduleMock = new Mock<IJSObjectReference>();
        var loggerMock = new Mock<ILogger<TeamsUserCredential>>();
        var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, identityClientAdapterMock.Object);
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
        var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, identityClientAdapterMock.Object);
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
        var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, identityClientAdapterMock.Object);
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
        var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, identityClientAdapterMock.Object);
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
        var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, identityClientAdapterMock.Object);
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
        var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, identityClientAdapterMock.Object);
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
    public async Task TestGetTokenWithScopesSuccessfully()
    {
        var moduleMock = new Mock<IJSObjectReference>();
        var loggerMock = new Mock<ILogger<TeamsUserCredential>>();
        var httpFactoryMock = new Mock<IHttpClientFactory>();
        var identityClientAdapterMock = new Mock<IIdentityClientAdapter>();
        var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, identityClientAdapterMock.Object)
        {
            _ssoToken = new Model.AccessToken(fakeSsoToken, fakeExpiration),
            _initialized = true,
        };

        identityClientAdapterMock.Setup(adapter => adapter.GetAccessToken(It.IsAny<string>(), It.IsAny<IEnumerable<string>>())).ReturnsAsync(new AuthenticationResult(fakeAccessToken, false, "", fakeExpiration, fakeExpiration, "", null, "", null, new Guid()));

        var token = await teamsCredential.GetTokenAsync(new TokenRequestContext(new string[] { fakeScopes }), new CancellationToken());
        Assert.AreEqual(fakeAccessToken, token.Token);
        Assert.AreEqual(fakeExpiration, token.ExpiresOn);
        loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((o, t) => string.Equals("Get access token with scopes: fake_scope", o.ToString(), StringComparison.InvariantCultureIgnoreCase)),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
    }

    [TestMethod]
    public async Task TestGetTokenWithScopesNeedUserConsent()
    {
        var moduleMock = new Mock<IJSObjectReference>();
        var loggerMock = new Mock<ILogger<TeamsUserCredential>>();
        var httpFactoryMock = new Mock<IHttpClientFactory>();
        var identityClientAdapterMock = new Mock<IIdentityClientAdapter>();
        var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, identityClientAdapterMock.Object)
        {
            _ssoToken = new Model.AccessToken(fakeSsoToken, fakeExpiration),
            _initialized = true,
        };

        identityClientAdapterMock.Setup(adapter => adapter.GetAccessToken(It.IsAny<string>(), It.IsAny<IEnumerable<string>>())).ThrowsAsync(new MsalUiRequiredException("code", "message"));

        var ex = await Assert.ThrowsExceptionAsync<ExceptionWithCode>(
            async () => await teamsCredential.GetTokenAsync(new TokenRequestContext(new string[] { fakeScopes }), new CancellationToken()));

        Assert.AreEqual(ExceptionCode.UiRequiredError, ex.Code);
        loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((o, t) => string.Equals("Get access token with scopes: fake_scope", o.ToString(), StringComparison.InvariantCultureIgnoreCase)),
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
        var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, identityClientAdapterMock.Object);

        jsRuntimeMock.Setup(r => r.InvokeAsync<IJSObjectReference>("import", It.IsAny<object[]>())).ReturnsAsync(() => moduleMock.Object);
        var authToken = $"{{\"code\": \"code\", \"codeVerifier\": \"codeVerifier\", \"redirectUri\": \"redirectUri\"}}";
        moduleMock.Setup(m => m.InvokeAsync<string>("authenticate", It.IsAny<object[]>())).ReturnsAsync(authToken);

        teamsCredential._ssoToken = new Model.AccessToken(fakeSsoToken, fakeExpiration);

        await teamsCredential.LoginAsync(fakeScopes);

        loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((o, t) => string.Equals("Popup consent page to get user's access token with scopes: fake_scope", o.ToString(), StringComparison.InvariantCultureIgnoreCase)),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
        moduleMock.Verify(
            m => m.InvokeAsync<string>("authenticate", It.IsAny<object[]>()), Times.Once);
    }
    #endregion

    [TestMethod]
    public void TestGetTokenException()
    {
        var loggerMock = new Mock<ILogger<TeamsUserCredential>>();
        var teamsCredential = new TeamsUserCredential(authOptionsMock.Object, jsRuntimeMock.Object, loggerMock.Object, identityClientAdapterMock.Object);
        Assert.ThrowsException<NotImplementedException>(() => teamsCredential.GetToken(new TokenRequestContext(new string[] { fakeScopes }), new CancellationToken()));
    }
}