// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yuqzho@microsoft.com
 */

import { Inputs, Platform } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import { createContext } from "../../../src/common/globalVars";
import {
  ApiAuthOptions,
  ApiPluginStartOptions,
  CapabilityOptions,
  DeclarativeCopilotTypeOptions,
  QuestionNames,
} from "../../../src/question";
import { CopilotExtensionGenerator } from "../../../src/component/generator/copilotExtension/generator";
import { TemplateNames } from "../../../src/component/generator/templates/templateNames";
import mockedEnv, { RestoreFn } from "mocked-env";
import sinon from "sinon";
import { FeatureFlagName } from "../../../src/common/featureFlags";

describe("copilotExtension", async () => {
  let mockedEnvRestore: RestoreFn | undefined;
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
    if (mockedEnvRestore) {
      mockedEnvRestore();
    }
  });
  describe("activate and get template name", async () => {
    it("api plugin", async () => {
      const generator = new CopilotExtensionGenerator();
      const context = createContext();
      const inputs: Inputs = {
        platform: Platform.CLI,
        projectPath: "./",
        [QuestionNames.Capabilities]: CapabilityOptions.apiPlugin().id,
        [QuestionNames.ApiPluginType]: ApiPluginStartOptions.newApi().id,
        [QuestionNames.ApiAuth]: ApiAuthOptions.none().id,
        [QuestionNames.AppName]: "app",
      };
      let res = await generator.activate(context, inputs);
      let info = await generator.getTemplateInfos(context, inputs, ".");
      assert.isTrue(res);
      assert.equal(info.isOk() && info.value[0].templateName, "api-plugin-from-scratch");

      inputs[QuestionNames.ApiAuth] = ApiAuthOptions.apiKey().id;
      res = await generator.activate(context, inputs);
      info = await generator.getTemplateInfos(context, inputs, ".");
      assert.isTrue(res);
      assert.equal(info.isOk() && info.value[0].templateName, "api-plugin-from-scratch-bearer");

      inputs[QuestionNames.ApiAuth] = ApiAuthOptions.oauth().id;
      res = await generator.activate(context, inputs);
      info = await generator.getTemplateInfos(context, inputs, ".");
      assert.isTrue(res);
      assert.equal(info.isOk() && info.value[0].templateName, "api-plugin-from-scratch-oauth");
      if (info.isOk()) {
        const filterFn = info.value[0].filterFn;
        assert.isFalse(filterFn?.("repairDeclarativeCopilot.json"));
        assert.isFalse(filterFn?.("instruction.txt"));
        assert.isTrue(filterFn?.("test.json"));
      }
    });

    it("declarative Copilot: Env func enabled", async () => {
      mockedEnvRestore = mockedEnv({ [FeatureFlagName.EnvFileFunc]: "true" });
      const generator = new CopilotExtensionGenerator();
      const context = createContext();
      const inputs: Inputs = {
        platform: Platform.CLI,
        projectPath: "./",
        [QuestionNames.Capabilities]: CapabilityOptions.declarativeCopilot().id,
        [QuestionNames.ApiPluginType]: ApiPluginStartOptions.newApi().id,
        [QuestionNames.ApiAuth]: ApiAuthOptions.none().id,
        [QuestionNames.AppName]: "app",
      };
      let res = await generator.activate(context, inputs);
      let info = await generator.getTemplateInfos(context, inputs, ".");
      assert.isTrue(res);
      assert.equal(info.isOk() && info.value[0].templateName, "api-plugin-from-scratch");

      inputs[QuestionNames.ApiAuth] = ApiAuthOptions.apiKey().id;
      res = await generator.activate(context, inputs);
      info = await generator.getTemplateInfos(context, inputs, ".");
      assert.isTrue(res);
      assert.equal(info.isOk() && info.value[0].templateName, "api-plugin-from-scratch-bearer");

      inputs[QuestionNames.ApiAuth] = ApiAuthOptions.oauth().id;
      res = await generator.activate(context, inputs);
      info = await generator.getTemplateInfos(context, inputs, ".");
      assert.isTrue(res);
      assert.equal(info.isOk() && info.value[0].templateName, "api-plugin-from-scratch-oauth");

      inputs[QuestionNames.ApiPluginType] = "";
      res = await generator.activate(context, inputs);
      info = await generator.getTemplateInfos(context, inputs, ".");
      assert.isTrue(res);
      assert.equal(info.isOk() && info.value[0].templateName, TemplateNames.BasicGpt);

      if (info.isOk()) {
        const filterFn = info.value[0].filterFn;
        assert.isTrue(filterFn?.("repairDeclarativeCopilot.json"));
        assert.isTrue(filterFn?.("instruction.txt"));
        assert.isTrue(filterFn?.("test.json"));
      }
    });

    it("declarative Copilot: Env func disabled", async () => {
      mockedEnvRestore = mockedEnv({ [FeatureFlagName.EnvFileFunc]: "false" });
      const generator = new CopilotExtensionGenerator();
      const context = createContext();
      const inputs: Inputs = {
        platform: Platform.CLI,
        projectPath: "./",
        [QuestionNames.Capabilities]: CapabilityOptions.declarativeCopilot().id,
        [QuestionNames.WithPlugin]: DeclarativeCopilotTypeOptions.noPlugin().id,
        [QuestionNames.AppName]: "app",
      };

      const res = await generator.activate(context, inputs);
      const info = await generator.getTemplateInfos(context, inputs, ".");
      assert.isTrue(res);
      assert.equal(info.isOk() && info.value[0].templateName, TemplateNames.BasicGpt);

      if (info.isOk()) {
        const filterFn = info.value[0].filterFn;
        assert.isTrue(filterFn?.("repairDeclarativeCopilot.json"));
        assert.isFalse(filterFn?.("instruction.txt"));
        assert.isTrue(filterFn?.("test.json"));
      }
    });
  });
});
