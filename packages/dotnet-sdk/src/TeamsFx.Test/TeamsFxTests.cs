// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Azure.Core;
using Microsoft.Graph;
using Microsoft.JSInterop;
using Microsoft.TeamsFx.Model;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Moq;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Microsoft.TeamsFx.Test
{
    [TestClass]
    public class TeamsFxTests
    {
        private static TeamsFx functions;
        private static Mock<IJSObjectReference> moduleMock;

        [ClassInitialize]
        public static void TestFixtureSetup(TestContext context)
        {
            // Executes once for the test class. (Optional)
            var jsRuntimeMock = new Mock<IJSRuntime>();
            moduleMock = new Mock<IJSObjectReference>();
            jsRuntimeMock.Setup(r => r.InvokeAsync<IJSObjectReference>("import", It.IsAny<object[]>())).ReturnsAsync(() => moduleMock.Object);
            functions = new TeamsFx(jsRuntimeMock.Object);
        }

        [TestMethod]
        public async Task TestLoadConfigurationAsync()
        {
            var configuration = new Model.Configuration();
            await functions.LoadConfigurationAsync(configuration);

            moduleMock.Verify(m => m.InvokeAsync<object>("loadConfiguration", It.IsAny<object[]>()));
        }

        [TestMethod]
        public async Task TestSetLogFunctionAsync()
        {
            await functions.SetLogFunctionAsync(null);
            moduleMock.Verify(m => m.InvokeAsync<object>("clearLogFunctionCallback", It.IsAny<object[]>()));
            var logFunctionMock = new Mock<LogFunction>();
            await functions.SetLogFunctionAsync(logFunctionMock.Object);
            moduleMock.Verify(m => m.InvokeAsync<object>("setLogFunctionCallback", It.IsAny<object[]>()));
        }

        [TestMethod]
        public async Task TestSetLogLevelAsync()
        {
            await functions.SetLogLevelAsync(LogLevel.Info);
            moduleMock.Verify(m => m.InvokeAsync<object>("setLogLevel", It.Is<object[]>(x => (LogLevel)x[0] == LogLevel.Info)));
        }

        [TestMethod]
        public async Task TestGetLogLevelAsync()
        {
            var result = await functions.GetLogLevelAsync();
            Assert.AreEqual(result, LogLevel.Verbose);
            moduleMock.Verify(m => m.InvokeAsync<LogLevel>("getLogLevel", It.IsAny<object[]>()));
        }

        [TestMethod]
        public async Task TestGetResourceConfigurationAsync()
        {
            var result = await functions.GetResourceConfigurationAsync(ResourceType.API);
            Assert.IsNull(result);
            moduleMock.Verify(m => m.InvokeAsync<Dictionary<string, object>>("getResourceConfiguration", It.Is<object[]>(x => (ResourceType)x[0] == ResourceType.API)));
        }

        [TestMethod]
        public async Task TestGetAuthenticationConfigurationAsync()
        {
            var result = await functions.GetAuthenticationConfigurationAsync();
            Assert.IsNull(result);
            moduleMock.Verify(m => m.InvokeAsync<AuthenticationConfiguration>("getAuthenticationConfiguration", It.IsAny<object[]>()));
        }

        [TestMethod]
        public async Task TestCreateMicrosoftGraphClient()
        {
            var tokenCredentialMock = new Mock<TokenCredential>();
            var client = TeamsFx.CreateMicrosoftGraphClient(tokenCredentialMock.Object);
            var ex = await Assert.ThrowsExceptionAsync<ServiceException>(async () => await client.Me.Request().GetAsync());
            Assert.AreEqual(ex.Error.Code, "InvalidAuthenticationToken");
            tokenCredentialMock.Verify(t => t.GetTokenAsync(It.IsAny<TokenRequestContext>(), It.IsAny<CancellationToken>()));
        }
    }
}
