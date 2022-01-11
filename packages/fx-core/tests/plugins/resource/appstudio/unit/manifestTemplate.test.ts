// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import sinon from "sinon";
import fs, { PathLike } from "fs-extra";
import path from "path";
import { ConfigMap, PluginContext, v2, Platform } from "@microsoft/teamsfx-api";
import Container from "typedi";
import { AppStudioPluginV3 } from "./../../../../../src/plugins/resource/appstudio/v3";
import { LocalCrypto } from "../../../../../src/core/crypto";
import { newEnvInfo } from "../../../../../src/core/tools";
import { getAzureProjectRoot, MockUserInteraction } from "../helper";
import { MockedLogProvider, MockedTelemetryReporter } from "../../../solution/util";
import { BuiltInResourcePluginNames } from "../../../../../src/plugins/solution/fx-solution/v3/constants";

describe("Load and Save manifest template", () => {
  const sandbox = sinon.createSandbox();
  let plugin: AppStudioPluginV3;
  let ctx: v2.Context;
  let inputs: v2.InputsWithProjectPath;

  beforeEach(async () => {
    plugin = Container.get<AppStudioPluginV3>(BuiltInResourcePluginNames.appStudio);
    ctx = {
      cryptoProvider: new LocalCrypto(""),
      userInteraction: new MockUserInteraction(),
      logProvider: new MockedLogProvider(),
      telemetryReporter: new MockedTelemetryReporter(),
      projectSetting: {
        appName: "test",
        projectId: "",
        solutionSettings: {
          name: "",
          activeResourcePlugins: [plugin.name],
        },
      },
    };
    inputs = {
      platform: Platform.VSCode,
      projectPath: getAzureProjectRoot(),
    };
  });

  afterEach(async () => {
    sandbox.restore();
  });

  it("Load and Save manifest template file", async () => {
    const loadedManifestTemplate = await plugin.loadManifest(ctx, inputs);
    chai.assert.isTrue(loadedManifestTemplate.isOk());
    if (loadedManifestTemplate.isOk()) {
      const saveManifestResult = await plugin.saveManifest(
        ctx,
        inputs,
        loadedManifestTemplate.value
      );
      chai.assert.isTrue(saveManifestResult.isOk());
    }
  });
});

describe("Add capability", () => {
  const sandbox = sinon.createSandbox();
  let plugin: AppStudioPluginV3;
  let ctx: v2.Context;
  let inputs: v2.InputsWithProjectPath;

  beforeEach(async () => {
    plugin = new AppStudioPluginV3();
    ctx = {
      cryptoProvider: new LocalCrypto(""),
      userInteraction: new MockUserInteraction(),
      logProvider: new MockedLogProvider(),
      telemetryReporter: new MockedTelemetryReporter(),
      projectSetting: {
        appName: "test",
        projectId: "",
        solutionSettings: {
          name: "",
          activeResourcePlugins: [plugin.name],
        },
      },
    };
    inputs = {
      platform: Platform.VSCode,
      projectPath: getAzureProjectRoot(),
    };
  });

  afterEach(async () => {
    sandbox.restore();
  });

  it("Check capability exceed limit: should return false", async () => {
    const result = await plugin.capabilityExceedLimit(ctx, inputs, "staticTab");
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      chai.assert.isFalse(result.value);
    }
  });

  it("Check capability exceed limit: should return true", async () => {
    const result = await plugin.capabilityExceedLimit(ctx, inputs, "configurableTab");
    chai.assert.isTrue(result.isOk());
    if (result.isOk()) {
      chai.assert.isTrue(result.value);
    }
  });

  it("Add static tab capability", async () => {
    const fileContent: Map<string, any> = new Map();
    sandbox.stub(fs, "writeFile").callsFake(async (filePath: number | PathLike, data: any) => {
      fileContent.set(path.normalize(filePath.toString()), data);
    });

    sandbox.stub(fs, "readJson").callsFake(async (filePath: string) => {
      const content = fileContent.get(path.normalize(filePath));
      if (content) {
        return JSON.parse(content);
      } else {
        return await fs.readJSON(path.normalize(filePath));
      }
    });

    const capabilities = [{ name: "staticTab" as const }];
    const addCapabilityResult = await plugin.addCapabilities(ctx, inputs, capabilities);
    chai.assert.isTrue(addCapabilityResult.isOk());

    const loadedManifestTemplate = await plugin.loadManifest(ctx, inputs);
    chai.assert.isTrue(loadedManifestTemplate.isOk());

    if (loadedManifestTemplate.isOk()) {
      chai.assert.equal(loadedManifestTemplate.value.local.staticTabs!.length, 2);
      chai.assert.equal(loadedManifestTemplate.value.remote.staticTabs!.length, 2);

      chai.assert.equal(loadedManifestTemplate.value.local.staticTabs![1].entityId, "index1");
      chai.assert.equal(loadedManifestTemplate.value.remote.staticTabs![1].entityId, "index1");
    }
  });
});
