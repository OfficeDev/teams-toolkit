// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Azure.Core;
using Microsoft.Extensions.Logging;
using Microsoft.Graph;
using Microsoft.JSInterop;
using Microsoft.TeamsFx.Model;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Moq;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using LogLevel = Microsoft.TeamsFx.Model.LogLevel;

namespace Microsoft.TeamsFx.Test
{
    [TestClass]
    public class TeamsFxTests
    {
        private static TeamsFx teamsfx;
        private static Mock<IJSObjectReference> moduleMock;

        [ClassInitialize]
        public static void TestFixtureSetup(TestContext context)
        {
            // Executes once for the test class. (Optional)
            var jsRuntimeMock = new Mock<IJSRuntime>();
            var LoggerMock = new Mock<ILogger<TeamsFx>>();
            var authLoggerMock = new Mock<ILogger<MsGraphAuthProvider>>();
            moduleMock = new Mock<IJSObjectReference>();
            jsRuntimeMock.Setup(r => r.InvokeAsync<IJSObjectReference>("import", It.IsAny<object[]>())).ReturnsAsync(() => moduleMock.Object);
            teamsfx = new TeamsFx(jsRuntimeMock.Object, LoggerMock.Object, authLoggerMock.Object);
        }

        [TestMethod]
        public async Task TestLoadConfigurationAsync()
        {
            var configuration = new Model.Configuration();
            await teamsfx.LoadConfigurationAsync(configuration);

            moduleMock.Verify(m => m.InvokeAsync<object>("loadConfiguration", It.IsAny<object[]>()));
        }

        [TestMethod]
        public async Task TestSetLogFunctionAsync()
        {
            await teamsfx.SetLogFunctionAsync(null);
            moduleMock.Verify(m => m.InvokeAsync<object>("clearLogFunctionCallback", It.IsAny<object[]>()));
            var logFunctionMock = new Mock<LogFunction>();
            await teamsfx.SetLogFunctionAsync(logFunctionMock.Object);
            moduleMock.Verify(m => m.InvokeAsync<object>("setLogFunctionCallback", It.IsAny<object[]>()));
        }

        [TestMethod]
        public async Task TestSetLogLevelAsync()
        {
            await teamsfx.SetLogLevelAsync(LogLevel.Info);
            moduleMock.Verify(m => m.InvokeAsync<object>("setLogLevel", It.Is<object[]>(x => (LogLevel)x[0] == LogLevel.Info)));
        }

        [TestMethod]
        public async Task TestGetLogLevelAsync()
        {
            var result = await teamsfx.GetLogLevelAsync();
            Assert.AreEqual(result, LogLevel.Verbose);
            moduleMock.Verify(m => m.InvokeAsync<LogLevel>("getLogLevel", It.IsAny<object[]>()));
        }

        [TestMethod]
        public async Task TestGetResourceConfigurationAsync()
        {
            var result = await teamsfx.GetResourceConfigurationAsync(ResourceType.API);
            Assert.IsNull(result);
            moduleMock.Verify(m => m.InvokeAsync<Dictionary<string, object>>("getResourceConfiguration", It.Is<object[]>(x => (ResourceType)x[0] == ResourceType.API)));
        }

        [TestMethod]
        public async Task TestGetAuthenticationConfigurationAsync()
        {
            var result = await teamsfx.GetAuthenticationConfigurationAsync();
            Assert.IsNull(result);
            moduleMock.Verify(m => m.InvokeAsync<AuthenticationConfiguration>("getAuthenticationConfiguration", It.IsAny<object[]>()));
        }

        [TestMethod]
        public async Task TestCreateMicrosoftGraphClient()
        {
            var tokenCredentialMock = new Mock<TokenCredential>();
            var client = teamsfx.CreateMicrosoftGraphClient(tokenCredentialMock.Object);
            var ex = await Assert.ThrowsExceptionAsync<ServiceException>(async () => await client.Me.Request().GetAsync());
            Assert.AreEqual(ex.Error.Code, "InvalidAuthenticationToken");
            tokenCredentialMock.Verify(t => t.GetTokenAsync(It.IsAny<TokenRequestContext>(), It.IsAny<CancellationToken>()));
        }
    }
}
