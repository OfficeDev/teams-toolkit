// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureAccountProvider,
  FxError,
  Inputs,
  ok,
  QTreeNode,
  Result,
  TokenProvider,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { QuestionAppName } from "../../../src/core/question";

export const MockFeaturePluginNames = {
  tab: "fx-feature-test-tab",
  bot: "fx-feature-test-bot",
};
@Service(MockFeaturePluginNames.tab)
export class MockTabFrontendPlugin implements v3.PluginV3 {
  displayName = "MockTabFrontendPlugin";
  description = "MockTabFrontendPlugin";
  name = MockFeaturePluginNames.tab;
  async addInstance(
    ctx: v3.ContextWithManifestProvider,
    inputs: v2.InputsWithProjectPath,
    envInfo?: v3.EnvInfoV3
  ): Promise<Result<string[], FxError>> {
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
    tokenProvider: TokenProvider
  ): Promise<Result<Void, FxError>> {
    return ok(Void);
  }

  async getQuestionsForDeploy(
    ctx: v2.Context,
    inputs: Inputs,
    envInfo: v2.DeepReadonly<v3.EnvInfoV3>,
    tokenProvider: TokenProvider
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return ok(new QTreeNode(QuestionAppName));
  }
}
