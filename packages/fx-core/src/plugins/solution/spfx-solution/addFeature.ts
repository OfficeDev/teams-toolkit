// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AppStudioTokenProvider,
  err,
  FxError,
  Inputs,
  ok,
  QTreeNode,
  Result,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { Container } from "typedi";
import { DefaultManifestProvider } from "../fx-solution/v3/addFeature";
import { BuiltInFeaturePluginNames } from "../fx-solution/v3/constants";

export async function getQuestionsForAddFeature(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<QTreeNode | undefined, FxError>> {
  const plugin = Container.get<v3.FeaturePlugin>(BuiltInFeaturePluginNames.spfx);
  if (plugin.getQuestionsForAddFeature) {
    const childNode = await plugin.getQuestionsForAddFeature(ctx, inputs);
    if (childNode.isErr()) return err(childNode.error);
    if (childNode.value) {
      return ok(childNode.value);
    }
  }
  return ok(undefined);
}

export async function addFeature(
  ctx: v2.Context,
  inputs: v3.SolutionAddFeatureInputs
): Promise<Result<Void, FxError>> {
  const plugin = Container.get<v3.FeaturePlugin>(BuiltInFeaturePluginNames.spfx);
  if (plugin.addFeature) {
    const contextWithManifestProvider: v3.ContextWithManifestProvider = {
      ...ctx,
      appManifestProvider: new DefaultManifestProvider(),
    };
    const res = await plugin.addFeature(contextWithManifestProvider, inputs);
    if (res.isErr()) return err(res.error);
  }
  return ok(Void);
}

export async function publishApplication(
  ctx: v2.Context,
  inputs: Inputs,
  envInfo: v2.EnvInfoV2,
  tokenProvider: AppStudioTokenProvider
): Promise<Result<Void, FxError>> {
  return ok(Void);
}
