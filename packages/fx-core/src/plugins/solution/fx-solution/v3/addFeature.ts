// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AppManifest,
  err,
  FxError,
  Json,
  ok,
  OptionItem,
  QTreeNode,
  Result,
  TeamsAppManifest,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { Container } from "typedi";
import { AzureSolutionSettings, Inputs } from "../../../../../../api/build/types";
import { AppStudioPluginV3 } from "../../../resource/appstudio/v3";
import "../../../resource/appstudio/v3";
import { selectSingleFeatureQuestion } from "../../utils/questions";
import arm from "../arm";
import { BuiltInFeaturePluginNames, TeamsFxAzureSolutionNameV3 } from "./constants";
import { ensureSolutionSettings } from "../utils/solutionSettingsHelper";

function getAllFeaturePlugins(): v3.FeaturePlugin[] {
  return [
    Container.get<v3.FeaturePlugin>(BuiltInFeaturePluginNames.frontend),
    Container.get<v3.FeaturePlugin>(BuiltInFeaturePluginNames.aad),
  ];
}

export async function getQuestionsForAddFeature(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<QTreeNode | undefined, FxError>> {
  const plugins = getAllFeaturePlugins();
  const featureNode = new QTreeNode(selectSingleFeatureQuestion);
  const staticOptions: OptionItem[] = [];
  for (const plugin of plugins) {
    staticOptions.push({
      id: plugin.name,
      label: plugin.description || "",
    });
    if (plugin.getQuestionsForAddFeature) {
      const childNode = await plugin.getQuestionsForAddFeature(ctx, inputs);
      if (childNode.isErr()) return err(childNode.error);
      if (childNode.value) {
        childNode.value.condition = { equals: plugin.name };
        featureNode.addChild(childNode.value);
      }
    }
  }
  selectSingleFeatureQuestion.staticOptions = staticOptions;
  return ok(featureNode);
}

export class DefaultManifestProvider implements v3.AppManifestProvider {
  async loadManifest(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath
  ): Promise<Result<AppManifest, FxError>> {
    const appStudioV3 = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
    const res = await appStudioV3.loadManifest(ctx, inputs);
    if (res.isErr()) return err(res.error);
    return ok(res.value.remote);
  }

  async saveManifest(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    manifest: AppManifest
  ): Promise<Result<Void, FxError>> {
    const appStudioV3 = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
    const res = await appStudioV3.saveManifest(ctx, inputs, {
      local: manifest as TeamsAppManifest,
      remote: manifest as TeamsAppManifest,
    });
    if (res.isErr()) return err(res.error);
    return ok(Void);
  }

  async addCapabilities(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    capabilities: (
      | { name: "staticTab"; snippet?: Json; existing?: boolean }
      | { name: "configurableTab"; snippet?: Json; existing?: boolean }
      | { name: "Bot"; snippet?: Json; existing?: boolean }
      | {
          name: "MessageExtension";
          snippet?: Json;
          existing?: boolean;
        }
    )[]
  ): Promise<Result<Void, FxError>> {
    const appStudioV3 = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
    const res = await appStudioV3.addCapabilities(ctx, inputs, []);
    return ok(Void);
  }
}

export async function addFeature(
  ctx: v2.Context,
  inputs: v3.SolutionAddFeatureInputs
): Promise<Result<Void, FxError>> {
  ensureSolutionSettings(ctx.projectSetting);
  const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
  const existingResources = new Set<string>();
  const allResources = new Set<string>();
  const pluginNames = solutionSettings.activeResourcePlugins;
  pluginNames.forEach((p) => {
    existingResources.add(p);
    allResources.add(p);
  });
  allResources.add(inputs.feature);
  const resolveRes = await resolveResourceDependencies(ctx, inputs, allResources);
  if (resolveRes.isErr()) return err(resolveRes.error);
  const contextWithManifestProvider: v3.ContextWithManifestProvider = {
    ...ctx,
    appManifestProvider: new DefaultManifestProvider(),
  };
  for (const resource of allResources.values()) {
    if (!existingResources.has(resource)) {
      const generateArmRes = await arm.addFeature(contextWithManifestProvider, inputs);
      if (generateArmRes.isErr()) {
        return err(generateArmRes.error);
      }
    }
  }
  return ok(Void);
}

async function resolveResourceDependencies(
  ctx: v2.Context,
  inputs: Inputs,
  resourceNameSet: Set<string>
): Promise<Result<undefined, FxError>> {
  while (true) {
    const size1 = resourceNameSet.size;
    for (const name of resourceNameSet) {
      const plugin = Container.get<v3.FeaturePlugin>(name);
      if (plugin.pluginDependencies) {
        const depRes = await plugin.pluginDependencies(ctx, inputs);
        if (depRes.isErr()) {
          return err(depRes.error);
        }
        for (const dep of depRes.value) {
          resourceNameSet.add(dep);
        }
      }
    }
    const size2 = resourceNameSet.size;
    if (size1 === size2) break;
  }
  return ok(undefined);
}
