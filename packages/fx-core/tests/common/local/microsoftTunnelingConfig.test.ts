// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import mockFs from "mock-fs";
import * as chai from "chai";
import fs from "fs-extra";
import path from "path";
import * as uuid from "uuid";
import { ProjectSettings } from "@microsoft/teamsfx-api";
import {
  loadTunnelInfo,
  storeTunnelInfo,
  TunnelPorts,
} from "../../../src/common/local/microsoftTunnelingConfig";
import { environmentManager } from "../../../src/core/environment";
import { PluginNames } from "../../../src/plugins/solution/fx-solution/constants";
import { BotOptionItem, TabOptionItem } from "../../../src/plugins/solution/fx-solution/question";

const localEnvConfig = {
  $schema: "https://aka.ms/teamsfx-env-config-schema",
  description: "",
  manifest: {
    appName: {
      short: "appname",
      full: "fullname",
    },
  },
};

describe("microsoftTunnelingConfig", () => {
  describe("TunnelPorts", () => {
    it("bot port for bot app", async () => {
      // Arrange
      const projectSettings: ProjectSettings = {
        appName: "test app",
        projectId: uuid.v4(),
        solutionSettings: {
          name: "fx-solution-azure",
          version: "1.0.0",
          hostType: "Azure",
          capabilities: [BotOptionItem.id],
          activeResourcePlugins: [PluginNames.BOT],
        },
      };
      // Act
      const result = TunnelPorts.bot.tunnelNeeded(projectSettings);
      // Assert
      chai.assert.isTrue(result, "Bot app should use bot ports");
    });
    it("bot port for non-bot app", async () => {
      // Arrange
      const projectSettings: ProjectSettings = {
        appName: "test tab app",
        projectId: uuid.v4(),
        solutionSettings: {
          name: "fx-solution-azure",
          version: "1.0.0",
          hostType: "Azure",
          capabilities: [TabOptionItem.id],
          activeResourcePlugins: [PluginNames.FE],
        },
      };
      // Act
      const result = TunnelPorts.bot.tunnelNeeded(projectSettings);
      // Assert
      chai.assert.isFalse(result, "Tab app should not use bot ports");
    });
  });
  describe("loadTunnelInfo()", () => {
    const workspaceFolder = "some workspace folder";
    const sandbox = sinon.createSandbox();
    beforeEach(() => {});
    afterEach(() => {
      sandbox.restore();
      mockFs.restore();
    });

    it("Can get existing valid tunnel info", async () => {
      // Arrange
      const clusterId = "cluster id";
      const tunnelId = "cluster id";

      const projectId = "project id";
      const envStatePath = environmentManager.getEnvStateFilesPath(
        environmentManager.getLocalEnvName(),
        workspaceFolder
      ).envState;
      const envConfigPath = environmentManager.getEnvConfigPath(
        environmentManager.getLocalEnvName(),
        workspaceFolder
      );
      mockFs({
        [envConfigPath]: JSON.stringify(localEnvConfig),
        [envStatePath]: JSON.stringify({
          [PluginNames.SOLUTION]: {
            tunnelClusterId: clusterId,
            tunnelId: tunnelId,
          },
        }),
      });

      // Act
      const tunnelInfo = await loadTunnelInfo(workspaceFolder, projectId);

      // Assert
      chai.assert.isTrue(tunnelInfo.isOk());
      chai.assert.deepEqual(tunnelInfo._unsafeUnwrap(), {
        tunnelClusterId: clusterId,
        tunnelId: tunnelId,
      });
    });

    it("Can filter out invalid tunnel info", async () => {
      // Arrange
      const invalidClusterId = 3.14;
      const invalidTunnelId = 1234;

      const projectId = "project id";
      const envStatePath = environmentManager.getEnvStateFilesPath(
        environmentManager.getLocalEnvName(),
        workspaceFolder
      ).envState;
      const envConfigPath = environmentManager.getEnvConfigPath(
        environmentManager.getLocalEnvName(),
        workspaceFolder
      );
      mockFs({
        [envConfigPath]: JSON.stringify(localEnvConfig),
        [envStatePath]: JSON.stringify({
          [PluginNames.SOLUTION]: {
            tunnelClusterId: invalidClusterId,
            tunnelId: invalidTunnelId,
          },
        }),
      });

      // Act
      const tunnelInfo = await loadTunnelInfo(workspaceFolder, projectId);

      // Assert
      chai.assert.isTrue(tunnelInfo.isOk());
      chai.assert.deepEqual(tunnelInfo._unsafeUnwrap(), {
        tunnelClusterId: undefined,
        tunnelId: undefined,
      });
    });

    it("Don't fail when the config does not exist for first time local debug.", async () => {
      // Arrange
      const projectId = "project id";
      const envConfigPath = environmentManager.getEnvConfigPath(
        environmentManager.getLocalEnvName(),
        workspaceFolder
      );
      mockFs({ [envConfigPath]: JSON.stringify(localEnvConfig) });

      // Act
      const tunnelInfo = await loadTunnelInfo(workspaceFolder, projectId);

      // Assert
      chai.assert.isTrue(tunnelInfo.isOk());
      chai.assert.deepEqual(tunnelInfo._unsafeUnwrap(), {
        tunnelClusterId: undefined,
        tunnelId: undefined,
      });
    });
  });
  describe("storeTunnelInfo()", () => {
    const workspaceFolder = "some workspace folder";
    const projectId = "test project id";
    const sandbox = sinon.createSandbox();
    const files: { [filePath: string]: string } = {};
    const envConfigPath = environmentManager.getEnvConfigPath(
      environmentManager.getLocalEnvName(),
      workspaceFolder
    );
    beforeEach(() => {
      sandbox
        .stub(fs, "writeFile")
        .callsFake(async (filePath: fs.PathLike | number, data: string | ArrayBufferView) => {
          const p = path.resolve(filePath.toString());
          if (typeof data !== "string") {
            throw new Error("Not supported non string writeFile");
          }
          files[p] = data;
        });
    });
    afterEach(() => {
      sandbox.restore();
      mockFs.restore();
    });

    it("can create new file", async () => {
      mockFs({ [envConfigPath]: JSON.stringify(localEnvConfig) });
      const tunnelInfo = {
        tunnelId: "test tunnel id",
        tunnelClusterId: "test cluster id",
      };
      const result = await storeTunnelInfo(workspaceFolder, projectId, tunnelInfo);

      // Assert
      chai.assert.isTrue(result.isOk());
      const stateFileContent =
        files[
          path.resolve(
            workspaceFolder,
            environmentManager.getEnvStateFilesPath(
              environmentManager.getLocalEnvName(),
              workspaceFolder
            ).envState
          )
        ];
      chai.assert.isNotEmpty(stateFileContent, "env state file is empty");
      const localState = JSON.parse(stateFileContent);
      chai.assert.deepEqual(localState[PluginNames.SOLUTION], tunnelInfo);
    });

    it("overwrites existing tunnel info and does not touch other things", async () => {
      const envStatePath = environmentManager.getEnvStateFilesPath(
        environmentManager.getLocalEnvName(),
        workspaceFolder
      ).envState;
      mockFs({
        [envConfigPath]: JSON.stringify(localEnvConfig),
        [envStatePath]: JSON.stringify({
          [PluginNames.SOLUTION]: { solutionKey1: "solutionValue1" },
          [PluginNames.BOT]: { pluginKey1: "pluginValue1" },
        }),
      });
      const tunnelInfo = {
        tunnelId: "test tunnel id",
        tunnelClusterId: "test cluster id",
      };
      const result = await storeTunnelInfo(workspaceFolder, projectId, tunnelInfo);

      // Assert
      chai.assert.isTrue(result.isOk());
      const stateFileContent =
        files[
          path.resolve(
            workspaceFolder,
            environmentManager.getEnvStateFilesPath(
              environmentManager.getLocalEnvName(),
              workspaceFolder
            ).envState
          )
        ];
      chai.assert.isNotEmpty(stateFileContent, "env state file is empty");
      const localState = JSON.parse(stateFileContent);
      chai.assert.deepEqual(
        localState[PluginNames.SOLUTION],
        Object.assign({ solutionKey1: "solutionValue1" }, tunnelInfo)
      );
      chai.assert.deepEqual(localState[PluginNames.BOT], { pluginKey1: "pluginValue1" });
    });
  });
});
