// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

using Microsoft.VisualStudio.TestTools.UnitTesting;
using Microsoft.Bot.Builder.Adapters;
using Microsoft.Bot.Builder;
using Microsoft.Bot.Builder.Dialogs;
using Microsoft.Bot.Schema;
using Microsoft.TeamsFx.Bot;
using Microsoft.TeamsFx.Configuration;
using Microsoft.Bot.Connector;
using Moq;
using Microsoft.QualityTools.Testing.Fakes;
using Microsoft.Bot.Schema.Teams;
using Newtonsoft.Json.Linq;
using Microsoft.Identity.Client;
using Microsoft.TeamsFx.Helper;
using System.Text.Json;

namespace Microsoft.TeamsFx.Test;

public static class SsoResult
{
    public const string Success = "Success";
    public const string Fail = "Fail";
};

[TestClass]
public class TeamsBotSsoPromptTest
{
    private static TeamsBotSsoPromptSettings teamsBotSsoPromptSettingsMock;
    private static readonly string fakeClientId = Guid.NewGuid().ToString();
    private static readonly string fakeClientSecret = Guid.NewGuid().ToString();
    private static readonly string fakeTenantId = Guid.NewGuid().ToString();
    private static readonly string fakeApplicationIdUri = "fake_application_id_url";
    private static readonly string fakeOAuthAuthority = $"https://login.microsoftonline.com/{fakeTenantId}";
    private static readonly string fakeLoginStartPageEndpoint = "https://fake_bot_domain/bot-auth-start";
    private static readonly string testDialogId = "TEST_TEAMS_BOT_SSO_PROMPT";
    private const string Name = "test_name";
    private const string userId = "test_user_id";
    private const string userPrincipalName = "test_user_principal_name";
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
        var ex = Assert.ThrowsException<ExceptionWithCode>(() => new TeamsBotSsoPrompt(string.Empty, teamsBotSsoPromptSettingsMock));
        Assert.AreEqual(ExceptionCode.InvalidParameter, ex.Code);
        Assert.AreEqual("Parameter dialogId is null or empty.", ex.Message);
    }

    [TestMethod]
    public void TeamsBotSsoPromptWithEmptySettingShouldFail()
    {
        var ex = Assert.ThrowsException<ExceptionWithCode>(() => new TeamsBotSsoPrompt(testDialogId, null));
        Assert.AreEqual(ExceptionCode.InvalidParameter, ex.Code);
        Assert.AreEqual("Parameter settings is null or empty.", ex.Message);
    }
    #endregion

    #region BeginDialog
    [TestMethod]
    public async Task TeamsBotSsoPromptBeginDialogWithNoDialogContextShouldFail()
    {
        var ex = await Assert.ThrowsExceptionAsync<ExceptionWithCode>(async () =>
        {
            var prompt = new TeamsBotSsoPrompt(testDialogId, teamsBotSsoPromptSettingsMock);
            await prompt.BeginDialogAsync(null);
        });
        Assert.AreEqual(ExceptionCode.InvalidParameter, ex.Code);
        Assert.AreEqual("Parameter dialogContext is null or empty.", ex.Message);
    }

    [TestMethod]
    public async Task TeamsBotSsoPromptBeginDialogNotInTeamsShouldFail()
    {
        var ex = await Assert.ThrowsExceptionAsync<ExceptionWithCode>(async () =>
        {
            var prompt = new TeamsBotSsoPrompt(testDialogId, teamsBotSsoPromptSettingsMock);
            var convoState = new ConversationState(new MemoryStorage());
            var dialogState = convoState.CreateProperty<DialogState>("dialogState");

            var adapter = new TestAdapter()
                .Use(new AutoSaveStateMiddleware(convoState));

            // Create new DialogSet.
            var dialogs = new DialogSet(dialogState);
            dialogs.Add(prompt);

            var tc = new TurnContext(adapter, new Activity() { Type = ActivityTypes.Message, Conversation = new ConversationAccount() { Id = userId }, ChannelId = "not-teams" });

            var dc = await dialogs.CreateContextAsync(tc);

            await prompt.BeginDialogAsync(dc);
        });
        Assert.AreEqual(ExceptionCode.ChannelNotSupported, ex.Code);
    }

    [TestMethod]
    public async Task TeamsBotSsoPromptBeginDialogShouldSuccess()
    {
        // Shims can be used only in a ShimsContext:
        using (ShimsContext.Create())
        {
            // Arrange:
            // Shim TeamsInfo.GetMemberAsync to return a mocked account:
            Microsoft.Bot.Builder.Teams.Fakes.ShimTeamsInfo.GetMemberAsyncITurnContextStringCancellationToken = (ITurnContext turnContext, string userId, CancellationToken cancellationToken) =>
            {
                TeamsChannelAccount account = new TeamsChannelAccount()
                {
                    Id = userId,
                    Name = Name,
                    UserPrincipalName = userPrincipalName
                };
                return Task.FromResult(account);
            };
            var ccaMock = new Mock<IIdentityClientAdapter>();
            var mockAuthenticationResult = new AuthenticationResult(fakeAccessToken, true, null, DateTimeOffset.Now, DateTimeOffset.Now, string.Empty, null, null, null, Guid.Empty);
            ccaMock.Setup(_ => _.GetAccessToken(It.IsAny<string>(), It.IsAny<IEnumerable<string>>())).ReturnsAsync(mockAuthenticationResult);

            var convoState = new ConversationState(new MemoryStorage());
            var dialogState = convoState.CreateProperty<DialogState>("dialogState");

            var adapter = new TestAdapter()
                .Use(new AutoSaveStateMiddleware(convoState));

            // Create new DialogSet.
            var dialogs = new DialogSet(dialogState);
            var prompt = new TeamsBotSsoPrompt(testDialogId, teamsBotSsoPromptSettingsMock);
            prompt._identityClientAdapter = ccaMock.Object;
            dialogs.Add(prompt);

            BotCallbackHandler botCallbackHandler = async (turnContext, cancellationToken) =>
            {
                var dc = await dialogs.CreateContextAsync(turnContext, cancellationToken);

                var results = await dc.ContinueDialogAsync(cancellationToken);
                if (results.Status == DialogTurnStatus.Empty)
                {
                    await dc.PromptAsync(testDialogId, new PromptOptions(), cancellationToken: cancellationToken);
                }
                else if (results.Status == DialogTurnStatus.Complete)
                {
                    if (results.Result is TokenResponse)
                    {
                        await turnContext.SendActivityAsync(MessageFactory.Text(SsoResult.Success), cancellationToken);
                        await turnContext.SendActivityAsync(MessageFactory.Text(JsonSerializer.Serialize(results.Result)), cancellationToken);
                    }
                    else
                    {
                        await turnContext.SendActivityAsync(MessageFactory.Text(SsoResult.Fail), cancellationToken);
                    }
                }
            };

            await new TestFlow(adapter, botCallbackHandler)
            .Send(new Activity()
            {
                ChannelId = Channels.Msteams,
                Text = "hello",
                Conversation = new ConversationAccount() { Id = userId }
            })
            .AssertReply(activity =>
            {
                Assert.AreEqual(1, ((Activity)activity).Attachments.Count);
                Assert.AreEqual(OAuthCard.ContentType, ((Activity)activity).Attachments[0].ContentType);
                OAuthCard card = ((Activity)activity).Attachments[0].Content as OAuthCard;
                Assert.AreEqual(1, card.Buttons.Count);
                Assert.AreEqual(ActionTypes.Signin, card.Buttons[0].Type);
                Assert.AreEqual($"{fakeLoginStartPageEndpoint}?scope=User.Read&clientId={fakeClientId}&tenantId={fakeTenantId}&loginHint={userPrincipalName}", card.Buttons[0].Value);
                Assert.AreEqual($"{fakeApplicationIdUri}/access_as_user", card.TokenExchangeResource.Uri);
            })
            .Send(new Activity()
            {
                ChannelId = Channels.Msteams,
                Type = ActivityTypes.Invoke,
                Name = SignInConstants.TokenExchangeOperationName,
                Value = JObject.FromObject(new TokenExchangeInvokeRequest()
                {
                    Id = "fake_id",
                    Token = fakeSsoToken
                })
            })
            .AssertReply(a =>
            {
                Assert.AreEqual("invokeResponse", a.Type);
                var response = ((Activity)a).Value as InvokeResponse;
                Assert.IsNotNull(response);
                Assert.AreEqual(200, response.Status);
            })
            .AssertReply(SsoResult.Success)
            .StartTestAsync();
        }
    }

    #endregion
}
