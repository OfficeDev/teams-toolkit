// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ResourceManagementClient } from "@azure/arm-resources";
import { TokenCredential } from "@azure/identity";
import {
  AzureAccountProvider,
  FuncValidation,
  Inputs,
  Json,
  Platform,
  ProjectSettings,
  Settings,
  Stage,
  SubscriptionInfo,
  SystemError,
  UserError,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import mockedEnv from "mocked-env";
import os from "os";
import * as path from "path";
import sinon from "sinon";
import { executeCommand, tryExecuteCommand } from "../../src/common/cpUtils";
import { isFeatureFlagEnabled } from "../../src/common/featureFlags";
import { execPowerShell, execShell } from "../../src/common/local/process";
import { TaskDefinition } from "../../src/common/local/taskDefinition";
import { getLocalizedString } from "../../src/common/localizeUtils";
import { isValidProject } from "../../src/common/projectSettingsHelper";
import {
  ContextUpgradeError,
  FetchSampleError,
  ProjectFolderExistError,
  ReadFileError,
  TaskNotSupportError,
  WriteFileError,
} from "../../src/core/error";
import {
  upgradeDefaultFunctionName,
  upgradeProgrammingLanguage,
} from "../../src/core/middleware/envInfoLoaderV3";
import { createAppNameQuestion } from "../../src/core/question";
import { resourceGroupHelper } from "../../src/component/utils/ResourceGroupHelper";
import { parseTeamsAppTenantId } from "../../src/component/provisionUtils";
import { MyTokenCredential } from "../plugins/solution/util";
import { randomAppName } from "./utils";

export class MockedAzureTokenProvider implements AzureAccountProvider {
  getIdentityCredentialAsync(showDialog?: boolean): Promise<TokenCredential> {
    return Promise.resolve(new MyTokenCredential());
  }
  signout(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  setStatusChangeCallback(
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>
  ): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  setStatusChangeMap(
    name: string,
    statusChange: (
      status: string,
      token?: string,
      accountInfo?: Record<string, unknown>
    ) => Promise<void>,
    immediateCall?: boolean
  ): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  removeStatusChangeMap(name: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  async getJsonObject(showDialog?: boolean): Promise<Record<string, unknown>> {
    return {
      tid: "222",
    };
  }
  async listSubscriptions(): Promise<SubscriptionInfo[]> {
    return [
      {
        subscriptionName: "mockedSubscriptionName",
        subscriptionId: "subscriptionId",
        tenantId: "mockedTenantId",
      },
    ];
  }
  async setSubscription(subscriptionId: string): Promise<void> {
    return;
  }
  getAccountInfo(): Record<string, string> | undefined {
    return {};
  }
  getSelectedSubscription(): Promise<SubscriptionInfo | undefined> {
    const selectedSub = {
      subscriptionId: "subscriptionId",
      tenantId: "tenantId",
      subscriptionName: "subscriptionName",
    };
    return Promise.resolve(selectedSub);
  }
}

describe("Other test case", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });
  it("question: app name question validation", async () => {
    const folder = os.tmpdir();
    const inputs: Inputs = { platform: Platform.VSCode, folder: folder };
    let appName = "1234";
    const appNameQuestion = createAppNameQuestion();
    let validRes = await (appNameQuestion.validation as FuncValidation<string>).validFunc(
      appName,
      inputs
    );

    assert.isTrue(validRes === getLocalizedString("core.QuestionAppName.validation.pattern"));

    appName = randomAppName();
    const projectPath = path.resolve(folder, appName);

    sandbox.stub<any, any>(fs, "pathExists").withArgs(projectPath).resolves(true);
    inputs.folder = folder;
    validRes = await (appNameQuestion.validation as FuncValidation<string>).validFunc(
      appName,
      inputs
    );
    assert.isTrue(
      validRes === getLocalizedString("core.QuestionAppName.validation.pathExist", projectPath)
    );

    sandbox.restore();
    sandbox.stub<any, any>(fs, "pathExists").withArgs(projectPath).resolves(false);
    validRes = await (appNameQuestion.validation as FuncValidation<string>).validFunc(
      appName,
      inputs
    );
    assert.isTrue(validRes === undefined);
  });

  it("error: ProjectFolderExistError", async () => {
    const error = new ProjectFolderExistError(os.tmpdir());
    assert.isTrue(error.name === "ProjectFolderExistError");
    assert.isTrue(
      error.message === `Path ${os.tmpdir()} already exists. Select a different folder.`
    );
  });

  it("error: WriteFileError", async () => {
    const msg = "file not exist";
    const error = WriteFileError(new Error(msg));
    assert.isTrue(error.name === "WriteFileError");
    assert.isTrue(error.message === msg);
  });

  it("error: ReadFileError", async () => {
    const msg = "file not exist";
    const error = ReadFileError(new Error(msg));
    assert.isTrue(error.name === "ReadFileError");
    assert.isTrue(error.message === msg);
  });

  it("error: TaskNotSupportError", async () => {
    const error = new TaskNotSupportError(Stage.createEnv);
    assert.isTrue(error.name === "TaskNotSupportError");
  });

  it("error: FetchSampleError", async () => {
    const error = new FetchSampleError("hello world app");
    assert.isTrue(error.name === "FetchSampleError");
    assert.isTrue(error.message.includes("hello world app"));
  });

  it("isFeatureFlagEnabled: return true when related environment variable is set to 1 or true", () => {
    const featureFlagName = "FEATURE_FLAG_UNIT_TEST";

    let restore = mockedEnv({
      [featureFlagName]: "1",
    });
    assert.isTrue(isFeatureFlagEnabled(featureFlagName));
    assert.isTrue(isFeatureFlagEnabled(featureFlagName, false)); // default value should be override
    restore();

    restore = mockedEnv({
      [featureFlagName]: "true",
    });
    assert.isTrue(isFeatureFlagEnabled(featureFlagName));
    restore();

    restore = mockedEnv({
      [featureFlagName]: "TruE", // should allow some characters be upper case
    });
    assert.isTrue(isFeatureFlagEnabled(featureFlagName));
    restore();
  });

  it("isFeatureFlagEnabled: return default value when related environment variable is not set", () => {
    const featureFlagName = "FEATURE_FLAG_UNIT_TEST";

    const restore = mockedEnv({
      [featureFlagName]: undefined, // delete it from process.env
    });
    assert.isFalse(isFeatureFlagEnabled(featureFlagName));
    assert.isFalse(isFeatureFlagEnabled(featureFlagName, false));
    assert.isTrue(isFeatureFlagEnabled(featureFlagName, true));
    restore();
  });

  it("isFeatureFlagEnabled: return false when related environment variable is set to non 1 or true value", () => {
    const featureFlagName = "FEATURE_FLAG_UNIT_TEST";

    let restore = mockedEnv({
      [featureFlagName]: "one",
    });
    assert.isFalse(isFeatureFlagEnabled(featureFlagName));
    assert.isFalse(isFeatureFlagEnabled(featureFlagName, true)); // default value should be override
    restore();

    restore = mockedEnv({
      [featureFlagName]: "",
    });
    assert.isFalse(isFeatureFlagEnabled(featureFlagName));
    restore();
  });

  it("ContextUpgradeError", async () => {
    const userError = ContextUpgradeError(new Error("11"), true);
    assert.isTrue(userError instanceof UserError);
    const sysError = ContextUpgradeError(new Error("11"), false);
    assert.isTrue(sysError instanceof SystemError);
  });

  it("parseTeamsAppTenantId", async () => {
    const res1 = parseTeamsAppTenantId({ tid: "123" });
    assert.isTrue(res1.isOk());
    const res2 = parseTeamsAppTenantId();
    assert.isTrue(res2.isErr());
    const res3 = parseTeamsAppTenantId({ abd: "123" });
    assert.isTrue(res3.isErr());
  });

  it("executeCommand", async () => {
    {
      try {
        const res = await executeCommand("ls", []);
        assert.isTrue(res !== undefined);
      } catch (e) {}
    }
    {
      try {
        const res = await tryExecuteCommand("ls", []);
        assert.isTrue(res !== undefined);
      } catch (e) {}
    }
    {
      try {
        const res = await execShell("ls");
        assert.isTrue(res !== undefined);
      } catch (e) {}
    }
    {
      try {
        const res = await execPowerShell("ls");
        assert.isTrue(res !== undefined);
      } catch (e) {}
    }
  });
  it("TaskDefinition", async () => {
    const appName = randomAppName();
    const projectPath = path.resolve(os.tmpdir(), appName);
    {
      const res = TaskDefinition.frontendStart(projectPath);
      assert.isTrue(res !== undefined);
    }
    {
      const res = TaskDefinition.backendStart(projectPath, "javascript", "echo", true);
      assert.isTrue(res !== undefined);
    }
    {
      const res = TaskDefinition.backendWatch(projectPath);
      assert.isTrue(res !== undefined);
    }
    {
      const res = TaskDefinition.authStart(projectPath, "");
      assert.isTrue(res !== undefined);
    }
    {
      const res = TaskDefinition.botStart(projectPath, "javascript", true);
      assert.isTrue(res !== undefined);
    }
    {
      const res = TaskDefinition.ngrokStart(projectPath, true, []);
      assert.isTrue(res !== undefined);
    }
    {
      const res = TaskDefinition.frontendInstall(projectPath);
      assert.isTrue(res !== undefined);
    }
    {
      const res = TaskDefinition.backendInstall(projectPath);
      assert.isTrue(res !== undefined);
    }
    {
      const res = TaskDefinition.backendExtensionsInstall(projectPath, "");
      assert.isTrue(res !== undefined);
    }
    {
      const res = TaskDefinition.botInstall(projectPath);
      assert.isTrue(res !== undefined);
    }
    {
      const res = TaskDefinition.spfxInstall(projectPath);
      assert.isTrue(res !== undefined);
    }
    {
      const res = TaskDefinition.gulpCert(projectPath);
      assert.isTrue(res !== undefined);
    }
    {
      const res = TaskDefinition.gulpServe(projectPath);
      assert.isTrue(res !== undefined);
    }
  });
  it("isValidProject: true", async () => {
    const projectSettings: ProjectSettings = {
      appName: "myapp",
      version: "1.0.0",
      projectId: "123",
    };
    sandbox.stub(fs, "readJsonSync").returns(projectSettings);
    sandbox.stub(fs, "existsSync").returns(true);
    const isValid = isValidProject("aaa");
    assert.isTrue(isValid);
  });
  it("isValidProject v3: true", async () => {
    const mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    try {
      const settings: Settings = {
        version: "1.0.0",
        trackingId: "123",
      };
      sandbox.stub(fs, "readJsonSync").returns(settings);
      sandbox.stub(fs, "existsSync").returns(true);
      const isValid = isValidProject("aaa");
      assert.isTrue(isValid);
    } finally {
      mockedEnvRestore();
    }
  });
  it("isValidProject v3: false case 1", async () => {
    const mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    try {
      const settings: any = {
        version: "1.0.0",
        isFromSample: false,
      };
      sandbox.stub(fs, "readJsonSync").returns(settings);
      const isValid = isValidProject("aaa");
      assert.isFalse(isValid);
    } finally {
      mockedEnvRestore();
    }
  });
  it("isValidProject v3: false case 2", async () => {
    const mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "true",
    });
    try {
      const settings: any = {
        projectId: "123",
        isFromSample: false,
      };
      sandbox.stub(fs, "readJsonSync").returns(settings);
      const isValid = isValidProject("aaa");
      assert.isFalse(isValid);
    } finally {
      mockedEnvRestore();
    }
  });
  it("getQuestionsForResourceGroup", async () => {
    const mockSubscriptionId = "mockSub";
    const accountProvider = new MockedAzureTokenProvider();
    const mockToken = await accountProvider.getIdentityCredentialAsync();
    const mockRmClient = new ResourceManagementClient(mockToken, mockSubscriptionId);
    const node = await resourceGroupHelper.getQuestionsForResourceGroup(
      "defaultRG",
      [["g1", "East US"]],
      ["East US", "Center US"],
      mockRmClient
    );
    assert.isTrue(node !== undefined);
  });
  it("upgradeProgrammingLanguage", async () => {
    const projectSettings: ProjectSettings = {
      appName: "myapp",
      version: "1.0.0",
      projectId: "123",
    };
    const state: Json = { solution: { programmingLanguage: "javascript" } };
    upgradeProgrammingLanguage(state, projectSettings);
    assert.equal(projectSettings.programmingLanguage, "javascript");
    assert.isUndefined(state.solution.programmingLanguage);
  });
  it("upgradeDefaultFunctionName", async () => {
    const projectSettings: ProjectSettings = {
      appName: "myapp",
      version: "1.0.0",
      projectId: "123",
    };
    const state = { solution: { defaultFunctionName: "getUserProfile" } };
    upgradeDefaultFunctionName(state, projectSettings);
    assert.equal(projectSettings.defaultFunctionName, "getUserProfile");
    assert.isUndefined(state.solution.defaultFunctionName);
  });
});
