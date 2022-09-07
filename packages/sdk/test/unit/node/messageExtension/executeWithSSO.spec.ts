// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ErrorCode, ErrorWithCode } from "../../../../src/core/errors";
import { queryWithToken } from "../../../../src/messageExtension/executeWithSSO";
import { TeamsMsgExtTokenResponse } from "../../../../src/messageExtension/teamsMsgExtTokenResponse";
import { AuthenticationConfiguration } from "../../../../src/models/configuration";
import { assert, use as chaiUse, expect } from "chai";
import * as sinon from "sinon";
import * as chaiPromises from "chai-as-promised";
import { TurnContext, TestAdapter, InvokeResponse } from "botbuilder-core";
import mockedEnv from "mocked-env";
chaiUse(chaiPromises);
let restore: () => void;

describe("Message Extension Query With Token Tests - Node", () => {
  afterEach(function () {
    restore();
  });

  it("queryWithToken failed in Message Extension Query", async () => {
    try {
      await queryWithToken(
        { activity: { name: "composeExtension/queryLink" } } as TurnContext,
        null,
        "",
        async (token: TeamsMsgExtTokenResponse) => {
          token;
        }
      );
    } catch (err) {
      assert.isTrue(err instanceof ErrorWithCode);
      assert.strictEqual(
        (err as ErrorWithCode).message,
        "The queryWithToken only support in handleTeamsMessagingExtensionQuery with composeExtension/query type."
      );
      assert.strictEqual((err as ErrorWithCode).code, "FailedOperation");
    }
  });
  it("queryWithToken get SignIn link on the first time in Message Extension Query", async () => {
    restore = mockedEnv({
      M365_CLIENT_ID: "fake_M365_client_id",
      M365_TENANT_ID: "fake_M365_tennant_id",
      M365_AUTHORITY_HOST: "https://login.microsoftonline.com",
      INITIATE_LOGIN_ENDPOINT: "https://fake_domain/auth-start.html",
      M365_CLIENT_SECRET: "fake_password",
    });
    const res = await queryWithToken(
      { activity: { name: "composeExtension/query" } } as TurnContext,
      null,
      "fake_scope",
      async (token: TeamsMsgExtTokenResponse) => {
        token;
      }
    );
    assert.isNotNull(res);
    assert.isNotNull(res!.composeExtension);
    const signInLink =
      "https://fake_domain/auth-start.html?scope=fake_scope&clientId=fake_M365_client_id&tenantId=fake_M365_tennant_id";
    const comparedRes = {
      composeExtension: {
        type: "silentAuth",
        suggestedActions: {
          actions: [
            {
              type: "openUrl",
              value: signInLink,
              title: "Message Extension OAuth",
            },
          ],
        },
      },
    };
    assert.equal(res! as any, comparedRes);
  });
});
