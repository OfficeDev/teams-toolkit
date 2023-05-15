// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Azure.Core;

using Microsoft.Extensions.Logging;
using Microsoft.Graph.Models.ODataErrors;
using Microsoft.VisualStudio.TestTools.UnitTesting;

using Moq;

namespace Microsoft.TeamsFx.Test;

[TestClass]
public class TeamsFxTests
{
    private static TeamsFx teamsfx;

    [ClassInitialize]
    public static void TestFixtureSetup(TestContext _)
    {
        // Executes once for the test class. (Optional)
        var LoggerMock = new Mock<ILogger<TeamsFx>>();
        var authLoggerMock = new Mock<ILogger<MsGraphAuthProvider>>();
        teamsfx = new TeamsFx(LoggerMock.Object, authLoggerMock.Object);
    }

    [TestMethod]
    public async Task TestCreateMicrosoftGraphClient()
    {
        var tokenCredentialMock = new Mock<TokenCredential>();
        var client = teamsfx.CreateMicrosoftGraphClient(tokenCredentialMock.Object);
        var ex = await Assert.ThrowsExceptionAsync<ODataError>(async () => await client.Me.GetAsync());
        Assert.AreEqual("InvalidAuthenticationToken", ex.Error.Code);
        tokenCredentialMock.Verify(t => t.GetTokenAsync(It.IsAny<TokenRequestContext>(), It.IsAny<CancellationToken>()), Times.AtLeastOnce);
    }
}
