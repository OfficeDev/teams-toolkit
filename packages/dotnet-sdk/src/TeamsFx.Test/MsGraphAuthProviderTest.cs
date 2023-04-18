// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Azure.Core;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.TeamsFx.Configuration;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Microsoft.Kiota.Abstractions;

using Moq;

namespace Microsoft.TeamsFx.Test;

[TestClass]
public class MsGraphAuthProviderTest
{
    private static Mock<TeamsUserCredential> teamsUserCredentialMock;
    private static MsGraphAuthProvider msGraphAuthProvider;
    private static AccessToken fakeAccessToken;
    private static DateTimeOffset fakeExpiration;

    [ClassInitialize]
    public static void TestFixtureSetup(TestContext _)
    {
        // Executes once for the test class. (Optional)
        var loggerMock = new Mock<ILogger<TeamsUserCredential>>();
        var authOptionsMock = new Mock<IOptions<AuthenticationOptions>>();
        teamsUserCredentialMock = new Mock<TeamsUserCredential>(authOptionsMock.Object, null, loggerMock.Object, null);
        msGraphAuthProvider = new MsGraphAuthProvider(teamsUserCredentialMock.Object);
        fakeExpiration = DateTimeOffset.Now;
        fakeAccessToken = new AccessToken("token", fakeExpiration);
    }

    [TestMethod]
    public void TestCreateMsGraphAuthProvider()
    {
        var defaultScopeArray = new string[] { ".default" };

        var msGraphAuthProvider1 = new MsGraphAuthProvider(teamsUserCredentialMock.Object);
        CollectionAssert.AreEqual(msGraphAuthProvider1._scopes, defaultScopeArray);

        var msGraphAuthProvider2 = new MsGraphAuthProvider(teamsUserCredentialMock.Object, "");
        CollectionAssert.AreEqual(msGraphAuthProvider2._scopes, defaultScopeArray);

        var msGraphAuthProvider3 = new MsGraphAuthProvider(teamsUserCredentialMock.Object, System.Array.Empty<string>());
        CollectionAssert.AreEqual(msGraphAuthProvider3._scopes, defaultScopeArray);

        var msGraphAuthProvider4 = new MsGraphAuthProvider(teamsUserCredentialMock.Object, new string[] { "" });
        CollectionAssert.AreEqual(msGraphAuthProvider4._scopes, defaultScopeArray);
    }

    [TestMethod]
    public async Task TestAuthenticateRequestAsync()
    {
        teamsUserCredentialMock.Setup(credential => credential.GetTokenAsync(It.IsAny<TokenRequestContext>(), It.IsAny<CancellationToken>())).ReturnsAsync(fakeAccessToken);
        var request = new RequestInformation();
        await msGraphAuthProvider.AuthenticateRequestAsync(request);
        Assert.AreEqual("Bearer token", request.Headers["Authorization"].First());
    }

    [TestMethod]
    public async Task TestGetAccessTokenAsync()
    {
        teamsUserCredentialMock.Setup(credential => credential.GetTokenAsync(It.IsAny<TokenRequestContext>(), It.IsAny<CancellationToken>())).ReturnsAsync(fakeAccessToken);
        var result = await msGraphAuthProvider.GetAccessTokenAsync();
        Assert.AreEqual("token", result);
    }

    [TestMethod]
    public async Task TestGetAccessTokenAsyncException()
    {
        var emptyAccessToken = new AccessToken("", fakeExpiration);
        teamsUserCredentialMock.Setup(credential => credential.GetTokenAsync(It.IsAny<TokenRequestContext>(), It.IsAny<CancellationToken>())).ReturnsAsync(emptyAccessToken);
        var ex = await Assert.ThrowsExceptionAsync<ExceptionWithCode>(async () => await msGraphAuthProvider.GetAccessTokenAsync());
        Assert.AreEqual(ExceptionCode.InternalError, ex.Code);
        Assert.AreEqual("Graph access token is undefined or empty", ex.Message);
    }
}