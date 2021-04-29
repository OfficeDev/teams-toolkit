// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ActionTypes,
  Activity,
  ActivityTypes,
  CardFactory,
  Channels,
  ConversationState,
  InputHints,
  MemoryStorage,
  StatePropertyAccessor,
  StatusCodes,
  TestAdapter,
  tokenExchangeOperationName,
  verifyStateOperationName
} from "botbuilder-core";
import { DialogSet, DialogState, DialogTurnStatus } from "botbuilder-dialogs";
import {
  TeamsBotSsoPrompt,
  TeamsBotSsoPromptTokenResponse,
  OnBehalfOfUserCredential,
  ErrorWithCode,
  ErrorCode,
  TeamsBotSsoPromptSettings,
  loadConfiguration,
  Configuration
} from "../../../../src";
import { assert, use as chaiUse } from "chai";
import chaiPromises from "chai-as-promised";
import sinon from "sinon";
import mockedEnv from "mocked-env";
import { AccessToken } from "@azure/identity";
import { promisify } from "util";

chaiUse(chaiPromises);
let mockedEnvRestore: () => void;

describe("TeamsBotSsoPrompt Tests - Node", () => {
  const sleep = promisify(setTimeout);

  const clientId = "fake_client_id";
  const clientSecret = "fake_client_secret";
  const tenantId = "fake_tenant";
  const authorityHost = "fake_authority_host";
  const initiateLoginEndpoint = "fake_initiate_login_endpoint";
  const applicationIdUri = "fake_application_id_uri";

  const TeamsBotSsoPromptId = "TEAMS_BOT_SSO_PROMPT";
  const requiredScopes: string[] = ["User.Read"];
  const expiresOnTimestamp = 12345678;
  const invokeResponseActivityType = "invokeResponse";
  const id = "fake_id";
  const exchangeToken = "fake_exchange_token";

  /**
   * {
   * "aud": "test_audience",
   * "iss": "https://login.microsoftonline.com/test_aad_id/v2.0",
   * "iat": 1537231048,
   * "nbf": 1537231048,
   * "exp": 1537234948,
   * "aio": "test_aio",
   * "name": "Teams App Framework SDK Unit Test",
   * "oid": "11111111-2222-3333-4444-555555555555",
   * "preferred_username": "test@microsoft.com",
   * "rh": "test_rh",
   * "scp": "access_as_user",
   * "sub": "test_sub",
   * "tid": "test_tenant_id",
   * "uti": "test_uti",
   * "ver": "2.0"
   * }
   */
  const ssoToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJ0ZXN0X2F1ZGllbmNlIiwiaXNzIjoiaHR0cHM6Ly9sb2dpbi5taWNyb3NvZnRvbmxpbmUuY29tL3Rlc3RfYWFkX2lkL3YyLjAiLCJpYXQiOjE1MzcyMzEwNDgsIm5iZiI6MTUzNzIzMTA0OCwiZXhwIjoxNTM3MjM0OTQ4LCJhaW8iOiJ0ZXN0X2FpbyIsIm5hbWUiOiJNT0RTIFRvb2xraXQgU0RLIFVuaXQgVGVzdCIsIm9pZCI6IjExMTExMTExLTIyMjItMzMzMy00NDQ0LTU1NTU1NTU1NTU1NSIsInByZWZlcnJlZF91c2VybmFtZSI6InRlc3RAbWljcm9zb2Z0LmNvbSIsInJoIjoidGVzdF9yaCIsInNjcCI6ImFjY2Vzc19hc191c2VyIiwic3ViIjoidGVzdF9zdWIiLCJ0aWQiOiJ0ZXN0X3RlbmFudF9pZCIsInV0aSI6InRlc3RfdXRpIiwidmVyIjoiMi4wIn0.SshbL1xuE1aNZD5swrWOQYgTR9QCNXkZqUebautBvKM";
  const ssoTokenExpiration = "2018-09-18T01:42:28.000Z";
  const timeoutValue = 50;
  const sleepTimeOffset: number = timeoutValue + 20;
  enum SsoLogInResult {
    Success = "Success",
    Fail = "Fail"
  }
  const sandbox = sinon.createSandbox();

  beforeEach(function () {
    mockedEnvRestore = mockedEnv({
      INITIATE_LOGIN_ENDPOINT: initiateLoginEndpoint,
      M365_CLIENT_ID: clientId,
      M365_CLIENT_SECRET: clientSecret,
      M365_TENANT_ID: tenantId,
      M365_AUTHORITY_HOST: authorityHost,
      M365_APPLICATION_ID_URI: applicationIdUri
    });

    // Mock onBehalfOfUserCredential implementation
    const onBehalfOfUserCredentialStub_GetToken = sandbox.stub(
      OnBehalfOfUserCredential.prototype,
      "getToken"
    );
    onBehalfOfUserCredentialStub_GetToken.onCall(0).callsFake(async () => {
      throw new ErrorWithCode(
        "The user or administrator has not consented to use the application\nFail to get access token because user has not consent scope.",
        ErrorCode.UiRequiredError
      );
    });
    onBehalfOfUserCredentialStub_GetToken.onCall(1).callsFake(async () => {
      return new Promise<AccessToken>((resolve) => {
        resolve({
          token: exchangeToken,
          expiresOnTimestamp: expiresOnTimestamp
        });
      });
    });
  });

  afterEach(function () {
    sandbox.restore();
    mockedEnvRestore();
  });

  it("TeamsBotSsoPrompt: Should be able to sign user in and get exchange tokens", async function () {
    this.timeout(500);

    const adapter: TestAdapter = await initializeTestEnv();

    await adapter
      .send("Hello")
      .assertReply((activity) => {
        // Assert bot send out OAuthCard
        assertTeamsSsoOauthCardActivity(activity);

        // Mock Teams sends signin/tokenExchange message with SSO token back to the bot
        mockTeamsSendsTokenExchangeInvokeActivityWithSsoToken(adapter, activity);
      })
      .assertReply((activity) => {
        // User has not consent. Assert bot send out 412
        assert.strictEqual(activity.type, invokeResponseActivityType);
        assert.strictEqual(activity.value.status, StatusCodes.PRECONDITION_FAILED);
        assert.strictEqual(
          activity.value.body.failureDetail,
          "The bot is unable to exchange token. Ask for user consent."
        );

        // Mock Teams sends signin/verifyState message after user consent back to the bot
        const invokeActivity: Partial<Activity> = createReply(ActivityTypes.Invoke, activity);
        invokeActivity.name = verifyStateOperationName;
        adapter.send(invokeActivity);
      })
      .assertReply((activity) => {
        // Assert bot send out OAuthCard gain to get SSO token
        assertTeamsSsoOauthCardActivity(activity);

        // Mock Teams sends signin/tokenExchange message with SSO token back to the bot
        mockTeamsSendsTokenExchangeInvokeActivityWithSsoToken(adapter, activity);
      })
      .assertReply((activity) => {
        // Assert bot send out invoke response status 200 to Teams to signal verifivation invoke has been received
        assert.strictEqual(activity.type, invokeResponseActivityType);
        assert.strictEqual(activity.value.status, StatusCodes.OK);
      })
      .assertReply((activity) => {
        // Assert bot send out invoke response status 200 to Teams to signal token response request invoke has been received
        assert.strictEqual(activity.type, invokeResponseActivityType);
        assert.strictEqual(activity.value.status, StatusCodes.OK);
        assert.strictEqual(activity.value.body.id, id);
      })
      .assertReply(SsoLogInResult.Success)
      .assertReply((activity) => {
        // Assert prompt result has exchanged token and sso token.
        const result = JSON.parse(activity.text as string) as TeamsBotSsoPromptTokenResponse;
        assert.strictEqual(result.token, exchangeToken);
        assert.strictEqual(result.ssoToken, ssoToken);
        assert.strictEqual(result.ssoTokenExpiration, ssoTokenExpiration);
      });
  });

  it("TeamsBotSsoPrompt: Should timeout with teams verification invoke activity", async function () {
    const adapter: TestAdapter = await initializeTestEnv(timeoutValue);

    await adapter
      .send("Hello")
      .assertReply((activity) => {
        // Assert bot send out OAuthCard
        assertTeamsSsoOauthCardActivity(activity);

        // Mock Teams sends signin/tokenExchange message with SSO token back to the bot
        mockTeamsSendsTokenExchangeInvokeActivityWithSsoToken(adapter, activity);
      })
      .assertReply(async (activity) => {
        // User has not consent. Assert bot send out 412
        assert.strictEqual(activity.type, invokeResponseActivityType);
        assert.strictEqual(activity.value.status, StatusCodes.PRECONDITION_FAILED);
        assert.strictEqual(
          activity.value.body.failureDetail,
          "The bot is unable to exchange token. Ask for user consent."
        );

        await sleep(sleepTimeOffset);

        // Mock Teams sends signin/verifyState message after user consent back to the bot after timeout
        const invokeActivity: Partial<Activity> = createReply(ActivityTypes.Invoke, activity);
        invokeActivity.name = verifyStateOperationName;
        adapter.send(invokeActivity);
      })
      .assertReply(SsoLogInResult.Fail);
  });

  it("TeamsBotSsoPrompt: Should timeout with token exchange activity", async function () {
    const adapter: TestAdapter = await initializeTestEnv(timeoutValue);

    await adapter
      .send("Hello")
      .assertReply(async (activity) => {
        // Assert bot send out OAuthCard
        assertTeamsSsoOauthCardActivity(activity);

        await sleep(sleepTimeOffset);

        // Mock Teams sends signin/tokenExchange message with SSO token back to the bot
        mockTeamsSendsTokenExchangeInvokeActivityWithSsoToken(adapter, activity);
      })
      .assertReply(SsoLogInResult.Fail);
  });

  it("TeamsBotSsoPrompt: Should timeout with message activity", async function () {
    const adapter: TestAdapter = await initializeTestEnv(timeoutValue);

    await adapter
      .send("Hello")
      .assertReply(async (activity) => {
        // Assert bot send out OAuthCard
        assertTeamsSsoOauthCardActivity(activity);

        await sleep(sleepTimeOffset);

        // Mock message activity sent to the bot
        const messageActivity: Partial<Activity> = createReply(ActivityTypes.Message, activity);
        messageActivity.text = "message sent to bot.";
        adapter.send(messageActivity);
      })
      .assertReply(SsoLogInResult.Fail);
  });

  it("TeamsBotSsoPrompt: Should end on invalid message when endOnInvalidMessage default to true", async function () {
    const adapter: TestAdapter = await initializeTestEnv(undefined);

    await adapter
      .send("Hello")
      .assertReply((activity) => {
        // Assert bot send out OAuthCard
        assertTeamsSsoOauthCardActivity(activity);

        // Mock User send invalid message
        const messageActivity = createReply(ActivityTypes.Message, activity);
        messageActivity.text = "user sends invalid message during auth flow";
        adapter.send(messageActivity);
      })
      .assertReply(SsoLogInResult.Fail);
  });

  it("TeamsBotSsoPrompt: Should not end on invalid message when endOnInvalidMessage set to false", async function () {
    const adapter: TestAdapter = await initializeTestEnv(undefined, false);

    await adapter
      .send("Hello")
      .assertReply((activity) => {
        // Assert bot send out OAuthCard
        assertTeamsSsoOauthCardActivity(activity);

        // Mock User send invalid message, wchich should be ignored.
        const messageActivity = createReply(ActivityTypes.Message, activity);
        messageActivity.text = "user sends invalid message during auth flow";
        adapter.send(messageActivity);

        // Mock Teams sends signin/tokenExchange message with SSO token back to the bot
        mockTeamsSendsTokenExchangeInvokeActivityWithSsoToken(adapter, activity);
      })
      .assertReply((activity) => {
        // User has not consent. Assert bot send out 412
        assert.strictEqual(activity.type, invokeResponseActivityType);
        assert.strictEqual(activity.value.status, StatusCodes.PRECONDITION_FAILED);
        assert.strictEqual(
          activity.value.body.failureDetail,
          "The bot is unable to exchange token. Ask for user consent."
        );

        // Mock Teams sends signin/verifyState message after user consent back to the bot
        const invokeActivity: Partial<Activity> = createReply(ActivityTypes.Invoke, activity);
        invokeActivity.name = verifyStateOperationName;
        adapter.send(invokeActivity);
      })
      .assertReply((activity) => {
        // Assert bot send out OAuthCard gain to get SSO token
        assertTeamsSsoOauthCardActivity(activity);

        // Mock Teams sends signin/tokenExchange message with SSO token back to the bot
        mockTeamsSendsTokenExchangeInvokeActivityWithSsoToken(adapter, activity);
      })
      .assertReply((activity) => {
        // Assert bot send out invoke response status 200 to Teams to signal verifivation invoke has been received
        assert.strictEqual(activity.type, invokeResponseActivityType);
        assert.strictEqual(activity.value.status, StatusCodes.OK);
      })
      .assertReply((activity) => {
        // Assert bot send out invoke response status 200 to Teams to signal token response request invoke has been received
        assert.strictEqual(activity.type, invokeResponseActivityType);
        assert.strictEqual(activity.value.status, StatusCodes.OK);
        assert.strictEqual(activity.value.body.id, id);
      })
      .assertReply(SsoLogInResult.Success)
      .assertReply((activity) => {
        // Assert prompt result has exchanged token and sso token.
        const result = JSON.parse(activity.text as string) as TeamsBotSsoPromptTokenResponse;
        assert.strictEqual(result.token, exchangeToken);
        assert.strictEqual(result.ssoToken, ssoToken);
        assert.strictEqual(result.ssoTokenExpiration, ssoTokenExpiration);
      });
  });

  it("TeamsBotSsoPrompt: Should only work in MS Teams Channel", async function () {
    const adapter: TestAdapter = await initializeTestEnv(undefined, undefined, Channels.Test);

    await adapter.send("Hello").catch((error) => {
      assert.strictEqual(
        error.message,
        "Teams Bot SSO Prompt is only supported in MS Teams Channel"
      );
    });
  });

  it("TeamsBotSsoPrompt: scopes should have string | string[] type", async function () {
    // TODO
  });

  function createReply(type: ActivityTypes, activity: Partial<Activity>): Partial<Activity> {
    return {
      type: type,
      from: { id: activity.recipient!.id, name: activity.recipient!.name },
      recipient: { id: activity.from!.id, name: activity.from!.name },
      replyToId: activity.id,
      serviceUrl: activity.serviceUrl,
      channelId: activity.channelId,
      conversation: {
        isGroup: activity.conversation!.isGroup,
        id: activity.conversation!.id,
        name: activity.conversation!.name,
        conversationType: "personal",
        tenantId: tenantId
      }
    };
  }

  function assertTeamsSsoOauthCardActivity(activity: Partial<Activity>): void {
    assert.isArray(activity.attachments);
    assert.strictEqual(activity.attachments?.length, 1);
    assert.strictEqual(activity.attachments![0].contentType, CardFactory.contentTypes.oauthCard);
    assert.strictEqual(activity.inputHint, InputHints.AcceptingInput);

    assert.strictEqual(activity.attachments![0].content.buttons[0].type, ActionTypes.Signin);
    assert.strictEqual(activity.attachments![0].content.buttons[0].title, "Teams SSO Sign In");
    assert.strictEqual(
      activity.attachments![0].content.tokenExchangeResource.uri,
      applicationIdUri + "/access_as_user"
    );

    assert.strictEqual(
      activity.attachments![0].content.buttons[0].value,
      `${initiateLoginEndpoint}?scope=${encodeURI(
        requiredScopes.join(" ")
      )}&clientId=${clientId}&tenantId=${tenantId}`
    );
  }

  function mockTeamsSendsTokenExchangeInvokeActivityWithSsoToken(
    adapter: TestAdapter,
    activity: Partial<Activity>
  ): void {
    const invokeActivity: Partial<Activity> = createReply(ActivityTypes.Invoke, activity);
    invokeActivity.name = tokenExchangeOperationName;
    invokeActivity.value = {
      id: id,
      token: ssoToken
    };
    adapter.send(invokeActivity);
  }

  /**
   * Initialize dialogs, adds teamsBotSsoPrompt in dialog set and initialize testAdapter for test case.
   * @param timeout_value positive number set to teamsSsoPromptSettings.timeout property
   * @param endOnInvalidMessage boolean value set to teamsSsoPromptSettings.endOnInvalidMessage property
   * @param channelId value set to dialog context activity channel. Defaults to `Channels.MSteams`.
   */
  async function initializeTestEnv(
    timeout_value?: number,
    endOnInvalidMessage?: boolean,
    channelId?: Channels,
    config?: Configuration
  ): Promise<TestAdapter> {
    // Create new ConversationState with MemoryStorage
    const convoState: ConversationState = new ConversationState(new MemoryStorage());

    // Create a DialogState property, DialogSet and TeamsBotSsoPrompt
    const dialogState: StatePropertyAccessor<DialogState> = convoState.createProperty(
      "dialogState"
    );
    const dialogs: DialogSet = new DialogSet(dialogState);
    const settings: TeamsBotSsoPromptSettings = {
      scopes: requiredScopes,
      timeout: timeout_value,
      endOnInvalidMessage: endOnInvalidMessage
    };

    loadConfiguration(config);

    dialogs.add(new TeamsBotSsoPrompt(TeamsBotSsoPromptId, settings));

    // Initialize TestAdapter.
    const adapter: TestAdapter = new TestAdapter(async (turnContext) => {
      const dc = await dialogs.createContext(turnContext);
      dc.context.activity.channelId = channelId === undefined ? Channels.Msteams : channelId;

      const results = await dc.continueDialog();
      if (results.status === DialogTurnStatus.empty) {
        await dc.beginDialog(TeamsBotSsoPromptId);
      } else if (results.status === DialogTurnStatus.complete) {
        if (results.result?.token) {
          await turnContext.sendActivity(SsoLogInResult.Success);
          const resultStr = JSON.stringify(results.result);
          await turnContext.sendActivity(resultStr);
        } else {
          await turnContext.sendActivity(SsoLogInResult.Fail);
        }
      }
      await convoState.saveChanges(turnContext);
    });
    return adapter;
  }
});
