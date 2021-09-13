// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Azure.Core;
using Microsoft.Extensions.Options;
using Microsoft.JSInterop;
using Microsoft.TeamsFx.Configuration;
using Microsoft.TeamsFx.Model;
using Microsoft.TeamsFx.Test.Helper;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Moq;
using System.Threading;
using System.Threading.Tasks;

namespace Microsoft.TeamsFx.Test
{
    [TestClass]
    public class TeamsUserCrendentialTest
    {
        private static TeamsUserCredential teamsCredential;
        private static Mock<IJSObjectReference> instanceTask;

        [ClassInitialize]
        public static void TestFixtureSetup(TestContext context)
        {
            // Executes once for the test class. (Optional)
            var jsRuntimeMock = new Mock<IJSRuntime>();
            var moduleMock = new Mock<IJSObjectReference>();
            var authOptionMock = new Mock<IOptions<AuthenticationOptions>>();
            instanceTask = new Mock<IJSObjectReference>();
            jsRuntimeMock.Setup(r => r.InvokeAsync<IJSObjectReference>("import", It.IsAny<object[]>())).ReturnsAsync(() => moduleMock.Object);
            moduleMock.Setup(m => m.InvokeAsync<IJSObjectReference>("createTeamsUserCredential", It.IsAny<object[]>())).ReturnsAsync(() => instanceTask.Object);
            teamsCredential = new TeamsUserCredential(jsRuntimeMock.Object, authOptionMock.Object);
        }

        [TestMethod]
        public async Task TestGetUserInfoAsync()
        {
            var result = await teamsCredential.GetUserInfoAsync();
            Assert.IsNull(result);
            instanceTask.Verify(m => m.InvokeAsync<UserInfo>("getUserInfo", It.IsAny<object[]>()));
        }

        [TestMethod]
        public async Task TestLoginAsync()
        {
            await teamsCredential.LoginAsync(".default");
            instanceTask.Verify(m => m.InvokeAsync<object>("login", It.Is<object[]>(x => (string)x[0] == ".default")));
        }

        [TestMethod]
        public async Task TestGetTokenAsync()
        {
            TokenMockHelper.MockUpGetToken(instanceTask);
            var result = await teamsCredential.GetTokenAsync(
                        new TokenRequestContext(new string[] { "User.Read" }),
                        new CancellationToken());
            Assert.AreEqual(TokenMockHelper.accessTokenJS.Token, result.Token);
            Assert.AreEqual(TokenMockHelper.accessTokenJS.ExpiresOn, result.ExpiresOn);
            instanceTask.VerifyAll();
        }

        [TestMethod]
        public async Task TestGetTokenAsyncException()
        {
            TokenMockHelper.MockUpGetTokenThrowException(instanceTask);
            var ex = await Assert.ThrowsExceptionAsync<ExceptionWithCode>(
                async () => await teamsCredential.GetTokenAsync(
                        new TokenRequestContext(new string[] { "User.Read" }),
                        new CancellationToken()));
            Assert.AreEqual(ex.Code, ExceptionCode.ServiceError);
        }
    }
}
