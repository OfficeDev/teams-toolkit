// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import {
  BotFrameworkAdapter,
  ConversationReference,
  ConversationState,
  MemoryStorage,
  TurnContext,
  UserState,
} from "botbuilder";
import * as sinon from "sinon";
import { CustomStorage } from "../testUtils";
import mockedEnv from "mocked-env";
import { DefaultSsoExecutionActivityHandler } from "../../../../../src/conversation/sso/defaultSsoExecutionActivityHandler";
import { SsoExecutionDialog } from "../../../../../src/conversation/sso/ssoExecutionDialog";
import { SsoConfig } from "../../../../../types/src/conversation/interface";

describe("DefaultSsoExecutionActivityHandler Tests - Node", () => {
  let mockedEnvRestore: () => void;

  const sandbox = sinon.createSandbox();

  const clientId = "fake_client_id";
  const clientSecret = "fake_client_secret";
  const tenantId = "fake_tenant";
  const authorityHost = "fake_authority_host";
  const initiateLoginEndpoint = "fake_initiate_login_endpoint";
  const applicationIdUri = "fake_application_id_uri";

  beforeEach(() => {
    mockedEnvRestore = mockedEnv({
      INITIATE_LOGIN_ENDPOINT: initiateLoginEndpoint,
      M365_CLIENT_ID: clientId,
      M365_CLIENT_SECRET: clientSecret,
      M365_TENANT_ID: tenantId,
      M365_AUTHORITY_HOST: authorityHost,
      M365_APPLICATION_ID_URI: applicationIdUri,
    });
  });

  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });

  it("create default sso execution activity handler should work", () => {
    const defaultSsoExecutionActivityHandler: any = new DefaultSsoExecutionActivityHandler(
      undefined
    );
    const ssoExecutionDialog = defaultSsoExecutionActivityHandler.ssoExecutionDialog;
    assert.isDefined(ssoExecutionDialog);

    const userState = defaultSsoExecutionActivityHandler.userState;
    assert.isDefined(userState);
    assert.isTrue(userState.storage instanceof MemoryStorage);

    const conversationState = defaultSsoExecutionActivityHandler.conversationState;
    assert.isDefined(conversationState);
    assert.isTrue(userState.storage instanceof MemoryStorage);

    const dialogState = defaultSsoExecutionActivityHandler.dialogState;
    assert.isDefined(dialogState);
  });

  it("create default sso execution activity handler should work with custom config", () => {
    const storage = new CustomStorage();

    const ssoConfig: SsoConfig = {
      CustomSsoExecutionActivityHandler: DefaultSsoExecutionActivityHandler,
      scopes: ["User.Read"],
      userState: new UserState(storage),
      conversationState: new ConversationState(storage),
      dedupStorage: storage,
    };
    const defaultSsoExecutionActivityHandler: any = new DefaultSsoExecutionActivityHandler(
      ssoConfig
    );

    const ssoExecutionDialog = defaultSsoExecutionActivityHandler.ssoExecutionDialog;
    assert.isDefined(ssoExecutionDialog);

    const userState = defaultSsoExecutionActivityHandler.userState;
    assert.isDefined(userState);
    assert.isTrue(userState.storage instanceof CustomStorage);

    const conversationState = defaultSsoExecutionActivityHandler.conversationState;
    assert.isDefined(conversationState);
    assert.isTrue(userState.storage instanceof CustomStorage);
  });

  it("trigger sign in function should call sso execution dialog", () => {
    const defaultSsoExecutionActivityHandler: any = new DefaultSsoExecutionActivityHandler(
      undefined
    );
    const ssoExecutionDialog =
      defaultSsoExecutionActivityHandler.ssoExecutionDialog as SsoExecutionDialog;
    const stub = sinon.stub(ssoExecutionDialog, "run").resolves();
    const context = sandbox.createStubInstance(TurnContext);

    defaultSsoExecutionActivityHandler.handleTeamsSigninVerifyState(context);
    assert.isTrue(stub.callCount === 1);

    defaultSsoExecutionActivityHandler.handleTeamsSigninTokenExchange(context);
    assert.isTrue(stub.callCount === 2);

    defaultSsoExecutionActivityHandler.onSignInInvoke(context);
    assert.isTrue(stub.callCount === 3);
  });
});
