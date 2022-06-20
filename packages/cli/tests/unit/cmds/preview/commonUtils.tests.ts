// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  IProgressHandler,
  err,
  ok,
  UserError,
  ProjectConfig,
  ConfigMap,
} from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import {
  createTaskStartCb,
  createTaskStopCb,
  getAutomaticNpmInstallSetting,
  generateAccountHint,
  getBotOutlookChannelLink,
} from "../../../../src/cmds/preview/commonUtils";
import { expect } from "../../utils";
import { UserSettings } from "../../../../src/userSetttings";
import { cliSource } from "../../../../src/constants";
import M365TokenInstance from "../../../../src/commonlib/m365Login";
import { signedIn, signedOut } from "../../../../src/commonlib/common/constant";
import fs from "fs-extra";
import * as chai from "chai";

describe("commonUtils", () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  describe("createTaskStartCb", () => {
    it("happy path", async () => {
      const progressHandler = sandbox.createStubInstance(MockProgressHandler);
      const taskStartCallback = createTaskStartCb(progressHandler, "start message");
      await taskStartCallback("start", true);
      expect(progressHandler.start.calledOnce).to.be.true;
    });
  });
  describe("createTaskStopCb", () => {
    it("happy path", async () => {
      const progressHandler = sandbox.createStubInstance(MockProgressHandler);
      const taskStopCallback = createTaskStopCb(progressHandler);
      await taskStopCallback("stop", true, {
        command: "command",
        success: true,
        stdout: [],
        stderr: [],
        exitCode: null,
      });
      expect(progressHandler.end.calledOnce).to.be.true;
    });
  });

  describe("getAutomaticNpmInstallSetting", () => {
    const automaticNpmInstallOption = "automatic-npm-install";

    it("on", () => {
      sandbox.stub(UserSettings, "getConfigSync").returns(
        ok({
          [automaticNpmInstallOption]: "on",
        })
      );
      expect(getAutomaticNpmInstallSetting()).to.be.true;
    });

    it("off", () => {
      sandbox.stub(UserSettings, "getConfigSync").returns(
        ok({
          [automaticNpmInstallOption]: "off",
        })
      );
      expect(getAutomaticNpmInstallSetting()).to.be.false;
    });

    it("others", () => {
      sandbox.stub(UserSettings, "getConfigSync").returns(
        ok({
          [automaticNpmInstallOption]: "others",
        })
      );
      expect(getAutomaticNpmInstallSetting()).to.be.false;
    });

    it("none", () => {
      sandbox.stub(UserSettings, "getConfigSync").returns(ok({}));
      expect(getAutomaticNpmInstallSetting()).to.be.false;
    });

    it("getConfigSync error", () => {
      const error = new UserError(cliSource, "Test", "Test");
      sandbox.stub(UserSettings, "getConfigSync").returns(err(error));
      expect(getAutomaticNpmInstallSetting()).to.be.false;
    });

    it("getConfigSync exception", () => {
      sandbox.stub(UserSettings, "getConfigSync").throws("Test");
      expect(getAutomaticNpmInstallSetting()).to.be.false;
    });
  });

  describe("generateAccountHint", () => {
    it("not signed", async () => {
      sandbox.stub(M365TokenInstance, "getStatus").returns(
        Promise.resolve(
          ok({
            status: signedOut,
            accountInfo: undefined,
          })
        )
      );
      const tenantIdFromConfig = "tenantIdFromConfig";
      expect(await generateAccountHint(tenantIdFromConfig, true)).to.deep.equals(
        `appTenantId=${tenantIdFromConfig}&login_hint=login_your_m365_account`
      );
      expect(await generateAccountHint(tenantIdFromConfig, false)).to.deep.equals(
        "login_hint=login_your_m365_account"
      );
    });

    it("signed", async () => {
      const tenantId = "tenantId";
      const upn = "upn";
      sandbox.stub(M365TokenInstance, "getStatus").returns(
        Promise.resolve(
          ok({
            status: signedIn,
            accountInfo: {
              tid: tenantId,
              upn,
            },
          })
        )
      );
      const tenantIdFromConfig = "tenantIdFromConfig";
      expect(await generateAccountHint(tenantIdFromConfig, true)).to.deep.equals(
        `appTenantId=${tenantId}&login_hint=${upn}`
      );
      expect(await generateAccountHint(tenantIdFromConfig, false)).to.deep.equals(
        `login_hint=${upn}`
      );
    });

    it("getBotOutlookChannelLink", async () => {
      const s = await getBotOutlookChannelLink("folder", "local", undefined, "abc");
      chai.assert.isNotEmpty(s);

      sinon
        .stub(fs, "readFileSync")
        .onFirstCall()
        .returns(
          `{
          "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
          "contentVersion": "1.0.0.0",
          "parameters": {
            "provisionParameters": {
              "value": {
                "resourceBaseName": "{{state.solution.resourceNameSuffix}}",
                "m365ClientId": "{{state.fx-resource-aad-app-for-teams.clientId}}",
                "m365ClientSecret": "{{state.fx-resource-aad-app-for-teams.clientSecret}}",
                "m365TenantId": "{{state.fx-resource-aad-app-for-teams.tenantId}}",
                "m365OauthAuthorityHost": "{{state.fx-resource-aad-app-for-teams.oauthHost}}"
              }
            }
          }
        }`
        )
        .onSecondCall().returns(`{
          "solution": {
              "teamsAppTenantId": "teamsAppTenantId",
              "subscriptionId": "subscriptionId",
              "subscriptionName": "subscriptionName",
              "tenantId": "tenantId",
              "needCreateResourceGroup": true,
              "resourceGroupName": "resourceGroupName",
              "location": "Central US",
              "resourceNameSuffix": "2c1fcd",
              "provisionSucceeded": true
          }
      }`);
      const solutionConfig = new Map<string, ConfigMap>();
      const jsonString = `{
        "subscriptionId": "subscriptionId",
        "tenantId": "tenantId",
        "resourceGroupName": "resourceGroupName"
      }`;
      const map = ConfigMap.fromJSON(JSON.parse(jsonString));
      if (map) {
        solutionConfig.set("solution", map);
      }
      const projectConfig: ProjectConfig = {
        config: solutionConfig,
      };
      const s2 = await getBotOutlookChannelLink("folder", "abc", projectConfig, "abc");
      chai.assert.isNotEmpty(s2);
      sinon.restore();
    });
  });
});

class MockProgressHandler implements IProgressHandler {
  start(detail?: string): Promise<void> {
    return Promise.resolve();
  }
  next(detail?: string): Promise<void> {
    return Promise.resolve();
  }
  end(success: boolean): Promise<void> {
    return Promise.resolve();
  }
}
