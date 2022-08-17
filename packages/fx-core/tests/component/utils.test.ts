import { InputsWithProjectPath, Platform, v3 } from "@microsoft/teamsfx-api";
import { expect } from "chai";
import { newEnvInfoV3 } from "../../src";
import { convertContext } from "../../src/component/resource/aadApp/utils";
import {
  addFeatureNotify,
  createContextV3,
  resetEnvInfoWhenSwitchM365,
} from "../../src/component/utils";
import { BuiltInFeaturePluginNames } from "../../src/plugins/solution/fx-solution/v3/constants";

describe("resetEnvInfoWhenSwitchM365", () => {
  it("clear keys and apim", () => {
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: {
        solution: { subscriptionId: "subId" },
        [BuiltInFeaturePluginNames.aad]: {},
        [BuiltInFeaturePluginNames.appStudio]: {},
        [BuiltInFeaturePluginNames.apim]: {
          apimClientAADObjectId: "mockId",
          apimClientAADClientSecret: "mockSecret",
        },
        [BuiltInFeaturePluginNames.function]: { resourceId: "mockResourceId" },
      },
      config: {},
    };

    resetEnvInfoWhenSwitchM365(envInfo);

    const expected = {
      envName: "dev",
      state: {
        solution: { subscriptionId: "subId" },
        [BuiltInFeaturePluginNames.apim]: {},
        [BuiltInFeaturePluginNames.function]: { resourceId: "mockResourceId" },
      },
      config: {},
    };
    expect(envInfo).to.eql(expected);
  });

  it("clear bot id", () => {
    const envInfo: v3.EnvInfoV3 = {
      envName: "dev",
      state: {
        solution: { subscriptionId: "subId" },
        [BuiltInFeaturePluginNames.appStudio]: {},
        [BuiltInFeaturePluginNames.bot]: {
          resourceId: "mockResourceId",
          botId: "mockBotId",
          random: "random",
        },
        [BuiltInFeaturePluginNames.function]: { resourceId: "mockResourceId" },
      },
      config: {},
    };

    resetEnvInfoWhenSwitchM365(envInfo);

    const expected = {
      envName: "dev",
      state: {
        solution: { subscriptionId: "subId" },
        [BuiltInFeaturePluginNames.bot]: {
          random: "random",
        },
        [BuiltInFeaturePluginNames.function]: { resourceId: "mockResourceId" },
      },
      config: {},
    };
    expect(envInfo).to.eql(expected);
  });

  it("convertContext", () => {
    const inputs: InputsWithProjectPath = {
      projectPath: "",
      platform: Platform.VSCode,
    };
    const envInfo = newEnvInfoV3();
    const context = createContextV3();
    context.envInfo = envInfo;
    const ctx = convertContext(context, inputs);
    expect(ctx !== undefined).to.eql(true);
  });
  it("addFeatureNotify", () => {
    const inputs: InputsWithProjectPath = {
      projectPath: "",
      platform: Platform.VSCode,
    };
    const context = createContextV3();
    addFeatureNotify(inputs, context.userInteraction, "Resource", ["sql", "apim"]);
    addFeatureNotify(inputs, context.userInteraction, "Capability", ["Tab"]);
    expect(true).to.eql(true);
  });
});
