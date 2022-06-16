// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  err,
  FxError,
  Inputs,
  M365TokenProvider,
  ok,
  QTreeNode,
  Result,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { Container } from "typedi";
import { BuiltInFeaturePluginNames } from "../fx-solution/v3/constants";

export async function getQuestionsForAddFeature(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<QTreeNode | undefined, FxError>> {
  const plugin = Container.get<v3.PluginV3>(BuiltInFeaturePluginNames.spfx);
  if (plugin.getQuestionsForAddInstance) {
    const childNode = await plugin.getQuestionsForAddInstance(ctx, inputs);
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
  return ok(Void);
}

export async function publishApplication(
  ctx: v2.Context,
  inputs: Inputs,
  envInfo: v2.EnvInfoV2,
  tokenProvider: M365TokenProvider
): Promise<Result<Void, FxError>> {
  return ok(Void);
}
