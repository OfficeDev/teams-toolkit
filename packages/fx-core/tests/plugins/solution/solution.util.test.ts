// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { err, ok, Platform, UserError, v2, v3 } from "@microsoft/teamsfx-api";
import chai from "chai";
import { it } from "mocha";
import * as sinon from "sinon";
import { ComponentNames } from "../../../src/component/constants";
import * as arm from "../../../src/component/arm";
import * as backup from "../../../src/component/utils/backupFiles";
import { BuiltInFeaturePluginNames } from "../../../src/component/constants";
import { MockContext } from "../../component/feature/apiconnector/utils";
import {
  handleConfigFilesWhenSwitchAccount,
  hasBotServiceCreated,
} from "../../../src/component/provisionUtils";
const tool = require("../../../src/common/tools");
const expect = chai.expect;

describe("util: handleConfigFilesWhenSwitchAccount", async () => {
  const mocker = sinon.createSandbox();
  const context = MockContext();
  const mockInput = {
    capabilities: ["Tab"],
    platform: Platform.VSCode,
    projectPath: "project-path",
  };
  afterEach(async () => {
    mocker.restore();
  });

  it("return if not switch accounts", async () => {
    // Arrange
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: { solution: {}, [BuiltInFeaturePluginNames.bot]: { resourceId: "mockResourceId" } },
      config: {},
    };

    // Act
    const res = await handleConfigFilesWhenSwitchAccount(
      envInfo,
      context,
      mockInput,
      false,
      false,
      true,
      false
    );

    // Assert
    expect(res.isOk()).equal(true);
  });

  it("success", async () => {
    // Arrange
    const spy = mocker.stub(arm, "updateAzureParameters").resolves(ok(undefined));
    mocker.stub(backup, "backupFiles").resolves(ok(undefined));
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: { solution: {}, [BuiltInFeaturePluginNames.bot]: { resourceId: "mockResourceId" } },
      config: {},
    };
    const appName = "ut";
    const projectPath = "project-path";

    // Act
    const res = await handleConfigFilesWhenSwitchAccount(
      envInfo,
      context,
      mockInput,
      true,
      true,
      true,
      false
    );

    // Assert
    expect(spy.calledOnceWithExactly(projectPath, appName, "dev", true, true, true)).equal(true);
    expect(res.isOk()).equal(true);
  });

  it("error when updating parameters", async () => {
    // Arrange
    mocker.stub(backup, "backupFiles").resolves(ok(undefined));
    const spy = mocker
      .stub(arm, "updateAzureParameters")
      .resolves(err(new UserError("solution", "error", "error")));
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: { solution: {} },
      config: {},
    };
    const appName = "ut";
    const projectPath = "project-path";

    // Act
    const res = await handleConfigFilesWhenSwitchAccount(
      envInfo,
      context,
      mockInput,
      true,
      true,
      false,
      false
    );

    // Assert
    expect(spy.calledOnceWithExactly(projectPath, appName, "dev", true, true, false)).equal(true);
    expect(res.isErr()).equal(true);
  });

  it("error when backup files", async () => {
    // Arrange
    mocker.stub(backup, "backupFiles").resolves(err(new UserError("solution", "error", "error")));
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: { solution: {} },
      config: {},
    };

    // Act
    const res = await handleConfigFilesWhenSwitchAccount(
      envInfo,
      context,
      mockInput,
      true,
      true,
      false,
      false
    );

    // Assert
    expect(res.isErr()).equal(true);
    if (res.isErr()) {
      expect(res.error.name).equal("error");
    }
  });
});

describe("util: hasBotServiceCreated", async () => {
  const mocker = sinon.createSandbox();
  afterEach(async () => {
    mocker.restore();
  });

  it("v2 bot with resourceId", async () => {
    // Arrange
    const envInfo: v2.EnvInfoV2 = {
      envName: "dev",
      state: { solution: {}, [BuiltInFeaturePluginNames.bot]: { resourceId: "mockResourceId" } },
      config: {},
    };

    // Act
    const res = hasBotServiceCreated(envInfo as v3.EnvInfoV3);

    // Assert
    expect(res).equal(true);
  });

  it("v2 bot without resourceId", async () => {
    // Arrange
    const envInfo: v2.EnvInfoV2 = {
      envName: "dev",
      state: { solution: {}, [BuiltInFeaturePluginNames.bot]: { botId: "mockResourceId" } },
      config: {},
    };

    // Act
    const res = hasBotServiceCreated(envInfo as v3.EnvInfoV3);

    // Assert
    expect(res).equal(false);
  });

  it("v3 bot with resourceId", async () => {
    // Arrange
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: { solution: {}, [ComponentNames.TeamsBot]: { resourceId: "mockResourceId" } },
      config: {},
    };

    // Act
    const res = hasBotServiceCreated(envInfo);

    // Assert
    expect(res).equal(true);
  });

  it("v3 bot without resourceId", async () => {
    // Arrange
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: { solution: {}, [ComponentNames.TeamsBot]: { botId: "mockResourceId" } },
      config: {},
    };

    // Act
    const res = hasBotServiceCreated(envInfo);

    // Assert
    expect(res).equal(false);
  });

  it("empty state", async () => {
    // Arrange
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: { solution: {} },
      config: {},
    };

    // Act
    const res = hasBotServiceCreated(envInfo);

    // Assert
    expect(res).equal(false);
  });

  it("empty state", async () => {
    // Arrange
    const envInfo = {};

    // Act
    const res = hasBotServiceCreated({} as v3.EnvInfoV3);

    // Assert
    expect(res).equal(false);
  });
});
