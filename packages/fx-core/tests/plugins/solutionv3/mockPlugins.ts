// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, ok, Result, v2, v3 } from "@microsoft/teamsfx-api";
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
  ): Promise<Result<v2.ResourceTemplate | undefined, FxError>> {
    ctx.projectSetting.solutionSettings!.capabilities.push("Tab");
    return ok(undefined);
  }
}
