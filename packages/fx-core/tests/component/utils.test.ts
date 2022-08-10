import { v3 } from "@microsoft/teamsfx-api";
import { expect } from "chai";
import { resetEnvInfoWhenSwitchM365 } from "../../src/component/utils";
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
});
