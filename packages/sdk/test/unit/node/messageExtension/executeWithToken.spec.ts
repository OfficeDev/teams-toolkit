/* eslint-disable no-secrets/no-secrets */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { AccessToken } from "@azure/identity";
import { ErrorCode, ErrorWithCode } from "../../../../src/core/errors";
import {
  handleMessageExtensionQueryWithSSO,
  handleMessageExtensionLinkQueryWithSSO,
} from "../../../../src/messageExtension/executeWithSSO";
import { MessageExtensionTokenResponse } from "../../../../src/messageExtension/teamsMsgExtTokenResponse";
import { OnBehalfOfUserCredential } from "../../../../src/credential/onBehalfOfUserCredential";
import { assert, use as chaiUse } from "chai";
const jwtBuilder = require("jwt-builder");
import * as sinon from "sinon";
import * as chaiPromises from "chai-as-promised";
import {
  TurnContext,
  BotAdapter,
  Activity,
  ResourceResponse,
  ConversationReference,
} from "botbuilder-core";
import mockedEnv from "mocked-env";
import { OnBehalfOfCredentialAuthConfig } from "../../../../src/models/configuration";
chaiUse(chaiPromises);
let restore: () => void;

class SimpleAdapter extends BotAdapter {
  sendActivities(
    context: TurnContext,
    activities: Partial<Activity>[]
  ): Promise<ResourceResponse[]> {
    const responses: ResourceResponse[] = [];
    return Promise.resolve(responses);
  }
  updateActivity(
    context: TurnContext,
    activity: Partial<Activity>
  ): Promise<ResourceResponse | void> {
    return Promise.resolve();
  }
  deleteActivity(context: TurnContext, reference: Partial<ConversationReference>): Promise<void> {
    return Promise.resolve();
  }
  continueConversation(
    reference: Partial<ConversationReference>,
    logic: (revocableContext: TurnContext) => Promise<void>
  ): Promise<void> {
    return Promise.resolve();
  }
}

describe("Message Extension Query With SSO Tests - Node", () => {
  const sandbox = sinon.createSandbox();
  const now = Math.floor(Date.now() / 1000);
  const timeInterval = 4000;
  const testDisplayName = "Teams Framework Unit Test";
  const testObjectId = "11111111-2222-3333-4444-555555555555";
  const testTenantId = "11111111-2222-3333-4444-555555555555";
  const testPreferredUserName = "test@microsoft.com";
  const ssoToken = jwtBuilder({
    algorithm: "HS256",
    secret: "super-secret",
    aud: "test_audience",
    iss: "https://login.microsoftonline.com/test_aad_id/v2.0",
    iat: now,
    nbf: now,
    exp: timeInterval,
    aio: "test_aio",
    name: testDisplayName,
    oid: testObjectId,
    preferred_username: testPreferredUserName,
    rh: "test_rh",
    scp: "access_as_user",
    sub: "test_sub",
    tid: testTenantId,
    uti: "test_uti",
    ver: "2.0",
  });
  const activityContext = {
    name: "composeExtension/query",
    value: { authentication: { token: ssoToken } },
  };
  const loginUrl = "https://fake_domain/auth-start.html";
  const authConfig: OnBehalfOfCredentialAuthConfig = {
    clientId: "fake_M365_client_id",
    clientSecret: "fake_password",
    authorityHost: "https://login.microsoftonline.com",
    tenantId: "fake_M365_tenant_id",
  };

  beforeEach(() => {
    restore = mockedEnv({
      M365_CLIENT_ID: "fake_M365_client_id",
      M365_TENANT_ID: "fake_M365_tenant_id",
      M365_AUTHORITY_HOST: "https://login.microsoftonline.com",
      INITIATE_LOGIN_ENDPOINT: "https://fake_domain/auth-start.html",
      M365_CLIENT_SECRET: "fake_password",
    });
  });
  afterEach(() => {
    sandbox.restore();
    restore();
  });

  it("handleMessageExtensionQueryWithSSO failed in Message Extension Query", async () => {
    try {
      await handleMessageExtensionQueryWithSSO(
        { activity: { name: "composeExtension/queryLink", value: {} } } as TurnContext,
        authConfig,
        loginUrl,
        "",
        async (token: MessageExtensionTokenResponse) => {
          token;
        }
      );
    } catch (err) {
      assert.isTrue(err instanceof ErrorWithCode);
      assert.strictEqual(
        (err as ErrorWithCode).message,
        "The handleMessageExtensionQueryWithToken only support in handleTeamsMessagingExtensionQuery with composeExtension/query type."
      );
      assert.strictEqual((err as ErrorWithCode).code, "FailedOperation");
    }
  });

  it("handleMessageExtensionQueryWithSSO getSignIn link with config in MessageExtensionQuery", async () => {
    const res = await handleMessageExtensionQueryWithSSO(
      { activity: { name: "composeExtension/query", value: {} } } as TurnContext,
      authConfig,
      loginUrl,
      ["fake_scope1", "fake_scope2"],
      async (token: MessageExtensionTokenResponse) => {
        token;
      }
    );
    assert.isNotNull(res);
    assert.isNotNull(res!.composeExtension);
    const signInLink = `${loginUrl}?scope=fake_scope1%20fake_scope2&clientId=${authConfig.clientId}&tenantId=${authConfig.tenantId}`;
    assert.equal(res!.composeExtension!.type as string, "silentAuth");
    assert.isNotNull(res!.composeExtension!.suggestedActions!.actions);
    const action = res!.composeExtension!.suggestedActions!.actions![0];
    assert.equal(action.type, "openUrl");
    assert.equal(action.value, signInLink);
    assert.equal(action.title, "Message Extension OAuth");
  });

  it("handleMessageExtensionQueryWithSSO get 412 response in Message Extension query", async () => {
    const adapter = new SimpleAdapter();
    const context: TurnContext = new TurnContext(adapter, activityContext);
    const spy = sinon.spy(adapter, "sendActivities");
    sandbox
      .stub(OnBehalfOfUserCredential.prototype, "getToken")
      .throws(
        new ErrorWithCode(
          "Failed to get access token from authentication server, please login first.",
          ErrorCode.UiRequiredError
        )
      );
    await handleMessageExtensionQueryWithSSO(context, authConfig, loginUrl, "", async (token) => {
      token;
    });
    spy.restore();
    sinon.assert.calledOnce(spy);
    assert.equal(spy.getCall(0).args[1][0].value.status, 412);
    assert.equal(spy.getCall(0).args[1][0].type, "invokeResponse");
  });

  it("handleMessageExtensionLinkQueryWithSSO get error response without compose/linkQuery type", async () => {
    const adapter = new SimpleAdapter();
    const activityContext = {
      name: "composeExtension/query",
      value: { authentication: { token: ssoToken } },
    };
    const context: TurnContext = new TurnContext(adapter, activityContext);
    try {
      await handleMessageExtensionLinkQueryWithSSO(
        context,
        authConfig,
        loginUrl,
        "fake_scope1",
        async (token) => {
          token;
        }
      );
    } catch (err) {
      assert.isTrue(err instanceof ErrorWithCode);
      assert.strictEqual(
        (err as ErrorWithCode).message,
        "The handleMessageExtensionLinkQueryWithSSO only support in handleTeamsAppBasedLinkQuery with composeExtension/queryLink type."
      );
      assert.strictEqual((err as ErrorWithCode).code, "FailedOperation");
    }
  });

  it("handleMessageExtensionLinkQueryWithSSO get AuthCard response in Message Extension link unfurling", async () => {
    const adapter = new SimpleAdapter();
    const activityContext = {
      name: "composeExtension/queryLink",
      value: { authentication: { token: ssoToken } },
    };
    const context: TurnContext = new TurnContext(adapter, activityContext);
    const spy = sinon.spy(adapter, "sendActivities");
    sandbox
      .stub(OnBehalfOfUserCredential.prototype, "getToken")
      .throws(
        new ErrorWithCode(
          "Failed to get access token from authentication server, please login first.",
          ErrorCode.UiRequiredError
        )
      );
    await handleMessageExtensionLinkQueryWithSSO(
      context,
      authConfig,
      loginUrl,
      "fake_scope1",
      async (token) => {
        token;
      }
    );
    spy.restore();
    sinon.assert.calledOnce(spy);
    const signInLink = `${loginUrl}?scope=fake_scope1&clientId=${authConfig.clientId}&tenantId=${authConfig.tenantId}`;
    assert.equal(spy.getCall(0).args[1][0].value.status, "200");
    assert.isNotNull(spy.getCall(0).args[1][0].value.body);
    const resBody = spy.getCall(0).args[1][0].value.body;
    assert.equal(resBody.composeExtension.type, "auth");
    assert.equal(resBody.composeExtension.suggestedActions.actions[0].value, signInLink);
    assert.equal(resBody.composeExtension.suggestedActions.actions[0].type, "openUrl");
  });

  it("handleMessageExtensionQueryWithSSO with expected token in message extension query", async () => {
    const tokenRes: AccessToken = {
      token: "fake_access_token",
      expiresOnTimestamp: now,
    };
    sandbox.stub(OnBehalfOfUserCredential.prototype, "getToken").resolves(tokenRes);
    const context: TurnContext = new TurnContext(new SimpleAdapter(), activityContext);
    const logic = (token: MessageExtensionTokenResponse) => {};
    const callbackSpy = sinon.spy(logic);
    const res = await handleMessageExtensionQueryWithSSO(
      context,
      authConfig,
      loginUrl,
      "",
      async (token) => {
        callbackSpy(token);
      }
    );
    sinon.assert.calledOnce(callbackSpy);
    assert.equal(callbackSpy.getCall(0).args[0].ssoToken, ssoToken);
    assert.equal(callbackSpy.getCall(0).args[0].token, "fake_access_token");
    assert.equal(callbackSpy.getCall(0).args[0].expiration, now.toString());
    assert.equal(
      callbackSpy.getCall(0).args[0].ssoTokenExpiration,
      new Date((now + timeInterval) * 1000).toISOString()
    );
    assert.isEmpty(callbackSpy.getCall(0).args[0].connectionName);
  });

  it("shold throw err once catch exceptions", async () => {
    sandbox
      .stub(OnBehalfOfUserCredential.prototype, "getToken")
      .throws(
        new ErrorWithCode(
          "Failed to acquire access token on behalf of user",
          ErrorCode.ServiceError
        )
      );
    const adapter = new SimpleAdapter();
    const context: TurnContext = new TurnContext(adapter, activityContext);
    try {
      await handleMessageExtensionQueryWithSSO(context, authConfig, loginUrl, "", async (token) => {
        token;
      });
    } catch (err) {
      assert.isNotNull(err);
      assert.isTrue(err instanceof ErrorWithCode);
      assert.strictEqual(
        (err as ErrorWithCode).message,
        "Failed to acquire access token on behalf of user"
      );
      assert.strictEqual((err as ErrorWithCode).code, ErrorCode.ServiceError);
    }
  });
});
