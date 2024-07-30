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
describe.only("apiPluginFromScratch", async () => {
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
      };
      const res = await generator.activate(context, inputs);
      const info = await generator.getTemplateInfos(context, inputs, ".");
      assert.isTrue(res);
      assert.equal(info.isOk() && info.value[0].templateName, "api-plugin-from-scratch");
    });
  });
});
