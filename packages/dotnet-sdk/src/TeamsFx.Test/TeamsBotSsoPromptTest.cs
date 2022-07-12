// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Microsoft.Extensions.Logging;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Moq;
using Microsoft.Bot.Builder.Adapters;
using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Dialogs;
using Microsoft.Bot.Schema;
using Microsoft.TeamsFx.Bot;
using Microsoft.TeamsFx.Configuration;

namespace Microsoft.TeamsFx.Test;

[TestClass]
public class TeamsBotSsoPromptTest
{
    private static TeamsBotSsoPromptSettings teamsBotSsoPromptSettingsMock;
    private static readonly string fakeClientId = Guid.NewGuid().ToString();
    private static readonly string fakeClientSecret = Guid.NewGuid().ToString();
    private static readonly string fakeTenantId = Guid.NewGuid().ToString();
    private static readonly string fakeApplicationIdUri = "fake_application_id_url";
    private static readonly string fakeOAuthAuthority = "fake_oauth_authority";
    private static readonly string fakeLoginStartPageEndpoint = "https://fake_bot_domain/bot-auth-start";
    private static readonly string fakeDialogId = "MOCK_TEAMS_BOT_SSO_PROMPT";
    
    [ClassInitialize]
    public static void TestFixtureSetup(TestContext _)
    {
        // Executes once for the test class. (Optional)
        var botAuthOptions = new BotAuthenticationOptions
        {
            ClientId = fakeClientId,
            ClientSecret = fakeClientSecret,
            TenantId = fakeTenantId,
            ApplicationIdUri = fakeApplicationIdUri,
            OAuthAuthority = fakeOAuthAuthority,
            LoginStartPageEndpoint = fakeLoginStartPageEndpoint
        };
        var scopes = new string[] { "User.Read" };
        teamsBotSsoPromptSettingsMock = new TeamsBotSsoPromptSettings(botAuthOptions, scopes);
    }

    #region ConstructTeamsBotSsoPrompt
    [TestMethod]
    public void TeamsBotSsoPromptWithEmptyDialogIdShouldFail()
    {
        Assert.ThrowsException<ArgumentNullException>(() => new TeamsBotSsoPrompt(string.Empty, teamsBotSsoPromptSettingsMock));
    }
    
    [TestMethod]
    public void TeamsBotSsoPromptWithEmptySettingShouldFail()
    {
        Assert.ThrowsException<ArgumentNullException>(() => new TeamsBotSsoPrompt(fakeDialogId, null));
    }
    #endregion

    #region BeginDialog
    [TestMethod]
    public async Task TeamsBotSsoPromptBeginDialogWithNoDialogContextShouldFail()
    {
        await Assert.ThrowsExceptionAsync<ArgumentNullException>(async () =>
        {
            var prompt = new TeamsBotSsoPrompt(fakeDialogId, teamsBotSsoPromptSettingsMock);
            await prompt.BeginDialogAsync(null);
        });
    }

    [TestMethod]
    public async Task TeamsBotSsoPromptBeginDialogNotInTeamsShouldFail()
    {
        var ex = await Assert.ThrowsExceptionAsync<ExceptionWithCode>(async () =>
        {
            var prompt = new TeamsBotSsoPrompt(fakeDialogId, teamsBotSsoPromptSettingsMock);
            var convoState = new ConversationState(new MemoryStorage());
            var dialogState = convoState.CreateProperty<DialogState>("dialogState");

            var adapter = new TestAdapter()
                .Use(new AutoSaveStateMiddleware(convoState));

            // Create new DialogSet.
            var dialogs = new DialogSet(dialogState);
            dialogs.Add(prompt);

            var tc = new TurnContext(adapter, new Activity() { Type = ActivityTypes.Message, Conversation = new ConversationAccount() { Id = "123" }, ChannelId = "not-teams" });

            var dc = await dialogs.CreateContextAsync(tc);

            await prompt.BeginDialogAsync(dc);
        });
        Assert.AreEqual(ExceptionCode.ChannelNotSupported, ex.Code);
    }

    //[TestMethod]
    //public async Task TeamsBotSsoPromptBeginDialogShouldSuccess()
    //{
    //    var loggerMock = new Mock<ILogger<TeamsBotSsoPrompt>>();
    //    var ex = await Assert.ThrowsExceptionAsync<ExceptionWithCode>(async () =>
    //    {
    //        var prompt = new TeamsBotSsoPrompt(fakeDialogId, teamsBotSsoPromptSettingsMock, loggerMock.Object);
    //        var convoState = new ConversationState(new MemoryStorage());
    //        var dialogState = convoState.CreateProperty<DialogState>("dialogState");

    //        var adapter = new TestAdapter()
    //            .Use(new AutoSaveStateMiddleware(convoState));

    //        // Create new DialogSet.
    //        var dialogs = new DialogSet(dialogState);
    //        dialogs.Add(prompt);

    //        var tc = new TurnContext(adapter, new Activity() { Type = ActivityTypes.Message, Conversation = new ConversationAccount() { Id = "123" }, ChannelId = Bot.Connector.Channels.Msteams });

    //        var dc = await dialogs.CreateContextAsync(tc);

    //        await prompt.BeginDialogAsync(dc);
    //    });
    //    Assert.AreEqual(ExceptionCode.ChannelNotSupported, ex.Code);
    //}

    #endregion
}
