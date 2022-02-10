// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { AzureAccountProvider, FxError, ok, Result, v2, v3, Void } from "@microsoft/teamsfx-api";
import { Service } from "typedi";

export const MockFeaturePluginNames = {
  tab: "fx-feature-test-tab",
  bot: "fx-feature-test-bot",
};
@Service(MockFeaturePluginNames.tab)
export class MockTabFrontendPlugin implements v3.FeaturePlugin {
  displayName = "MockTabFrontendPlugin";
  description = "MockTabFrontendPlugin";
  name = MockFeaturePluginNames.tab;
  async addFeature(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath,
    envInfo?: v3.EnvInfoV3
  ): Promise<Result<v2.ResourceTemplate[], FxError>> {
    const capabilities = ctx.projectSetting.solutionSettings?.capabilities;
    const activeResourcePlugins = ctx.projectSetting.solutionSettings?.activeResourcePlugins;
    if (capabilities && !capabilities.includes("Tab")) capabilities.push("Tab");
    if (activeResourcePlugins && !activeResourcePlugins.includes(MockFeaturePluginNames.tab))
      activeResourcePlugins.push(MockFeaturePluginNames.tab);
    return ok([]);
  }

  async deploy(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: AzureAccountProvider
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
  }
}
