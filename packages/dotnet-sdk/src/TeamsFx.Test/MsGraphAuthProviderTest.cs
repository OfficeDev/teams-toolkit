// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Microsoft.Extensions.Options;
using Microsoft.JSInterop;
using Microsoft.TeamsFx.Configuration;
using Microsoft.TeamsFx.Test.Helper;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Moq;
using System.Net.Http;
using System.Threading.Tasks;

namespace Microsoft.TeamsFx.Test
{
    [TestClass]
    public class MsGraphAuthProviderTest
    {
        private static Mock<IJSObjectReference> teamsUserCredentialModuleMock;
        private static TeamsUserCredential teamsCredential;
        private static MsGraphAuthProvider msGraphAuthProvider;

        [ClassInitialize]
        public static void TestFixtureSetup(TestContext context)
        {
            // Executes once for the test class. (Optional)
            var jsRuntimeMock = new Mock<IJSRuntime>();
            var moduleMock = new Mock<IJSObjectReference>();
            var authOptionMock = new Mock<IOptions<AuthenticationOptions>>();
            teamsUserCredentialModuleMock = new Mock<IJSObjectReference>();
            jsRuntimeMock.Setup(r => r.InvokeAsync<IJSObjectReference>("import", It.IsAny<object[]>())).ReturnsAsync(() => moduleMock.Object);
            moduleMock.Setup(m => m.InvokeAsync<IJSObjectReference>("createTeamsUserCredential", It.IsAny<object[]>())).ReturnsAsync(() => teamsUserCredentialModuleMock.Object);
            teamsCredential = new TeamsUserCredential(jsRuntimeMock.Object, authOptionMock.Object);
            msGraphAuthProvider = new MsGraphAuthProvider(teamsCredential);
        }

        [TestMethod]
        public void TestCreateMsGraphAuthProvider()
        {
            var defaultScopeArray = new string[] { ".default" };

            var msGraphAuthProvider1 = new MsGraphAuthProvider(teamsCredential);
            CollectionAssert.AreEqual(msGraphAuthProvider1._scopes, defaultScopeArray);

            var msGraphAuthProvider2 = new MsGraphAuthProvider(teamsCredential, "");
            CollectionAssert.AreEqual(msGraphAuthProvider2._scopes, defaultScopeArray);

            var msGraphAuthProvider3 = new MsGraphAuthProvider(teamsCredential, System.Array.Empty<string>());
            CollectionAssert.AreEqual(msGraphAuthProvider3._scopes, defaultScopeArray);

            var msGraphAuthProvider4 = new MsGraphAuthProvider(teamsCredential, new string[] { "" });
            CollectionAssert.AreEqual(msGraphAuthProvider4._scopes, defaultScopeArray);
        }

        [TestMethod]
        public async Task TestAuthenticateRequestAsync()
        {
            TokenMockHelper.MockUpGetToken(teamsUserCredentialModuleMock);
            var request = new HttpRequestMessage();
            await msGraphAuthProvider.AuthenticateRequestAsync(request);
            Assert.IsNotNull(request.Headers.Authorization);
            teamsUserCredentialModuleMock.VerifyAll();
        }

        [TestMethod]
        public async Task TestGetAccessTokenAsync()
        {
            TokenMockHelper.MockUpGetToken(teamsUserCredentialModuleMock);
            var result = await msGraphAuthProvider.GetAccessTokenAsync();
            Assert.AreEqual(TokenMockHelper.accessTokenJS.Token, result);
            teamsUserCredentialModuleMock.VerifyAll();
        }

        [TestMethod]
        public async Task TestGetAccessTokenAsyncException()
        {
            TokenMockHelper.MockUpGetEmptyToken(teamsUserCredentialModuleMock);
            var ex = await Assert.ThrowsExceptionAsync<ExceptionWithCode>(async () => await msGraphAuthProvider.GetAccessTokenAsync());
            Assert.AreEqual(ex.Code, ExceptionCode.InternalError);
            teamsUserCredentialModuleMock.VerifyAll();
        }
    }
}
