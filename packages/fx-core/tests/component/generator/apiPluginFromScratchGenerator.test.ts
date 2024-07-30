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
  QuestionNames,
} from "../../../src/question";
import { ApiPluginFromScratchGenerator } from "../../../src/component/generator/apiPluginFromScratch/generator";
describe("apiPluginFromScratch", async () => {
  describe("activate and get template name", async () => {
    it("api plugin", async () => {
      const generator = new ApiPluginFromScratchGenerator();
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
        assert.isTrue(filterFn?.("test.json"));
      }
    });

    it("declarative Copilot", async () => {
      const generator = new ApiPluginFromScratchGenerator();
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

      if (info.isOk()) {
        const filterFn = info.value[0].filterFn;
        assert.isTrue(filterFn?.("repairDeclarativeCopilot.json"));
        assert.isTrue(filterFn?.("test.json"));
      }
    });
  });
});
