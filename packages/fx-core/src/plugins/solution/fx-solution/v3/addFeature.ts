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
import { selectMultipleFeaturesQuestion } from "../../utils/questions";
import arm from "../arm";
import { BuiltInFeaturePluginNames } from "./constants";
import { ensureSolutionSettings } from "../utils/solutionSettingsHelper";
import { ProgrammingLanguageQuestion } from "../../../../core/question";

function getAllFeaturePlugins(): v3.PluginV3[] {
  return [
    Container.get<v3.PluginV3>(BuiltInFeaturePluginNames.frontend),
    Container.get<v3.PluginV3>(BuiltInFeaturePluginNames.aad),
    Container.get<v3.PluginV3>(BuiltInFeaturePluginNames.function),
    Container.get<v3.PluginV3>(BuiltInFeaturePluginNames.apim),
    Container.get<v3.PluginV3>(BuiltInFeaturePluginNames.keyVault),
    Container.get<v3.PluginV3>(BuiltInFeaturePluginNames.identity),
    Container.get<v3.PluginV3>(BuiltInFeaturePluginNames.sql),
    Container.get<v3.PluginV3>(BuiltInFeaturePluginNames.spfx),
  ];
}

export async function getQuestionsForAddFeature(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<QTreeNode | undefined, FxError>> {
  const node = new QTreeNode({ type: "group" });
  const plugins = getAllFeaturePlugins();
  const featureNode = new QTreeNode(selectMultipleFeaturesQuestion);
  if (!ctx.projectSetting.solutionSettings?.programmingLanguage) {
    const programmingLanguage = new QTreeNode(ProgrammingLanguageQuestion);
    node.addChild(programmingLanguage);
  }
  const staticOptions: OptionItem[] = [];
  for (const plugin of plugins) {
    staticOptions.push({
      id: plugin.name,
      label: plugin.description || "",
    });
    if (plugin.getQuestionsForAddFeature || plugin.getQuestionsForAddInstance) {
      const childNode = plugin.getQuestionsForAddFeature
        ? await plugin.getQuestionsForAddFeature(ctx, inputs)
        : await plugin.getQuestionsForAddInstance!(ctx, inputs);
      if (childNode.isErr()) return err(childNode.error);
      if (childNode.value) {
        childNode.value.condition = { contains: plugin.name };
        featureNode.addChild(childNode.value);
      }
    }
  }
  selectMultipleFeaturesQuestion.staticOptions = staticOptions;
  node.addChild(featureNode);
  return ok(node);
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
    capabilities: v3.ManifestCapability[]
  ): Promise<Result<Void, FxError>> {
    const appStudioV3 = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
    const res = await appStudioV3.addCapabilities(ctx, inputs, capabilities);
    if (res.isErr()) return err(res.error);
    return ok(Void);
  }
}

export async function addFeature(
  ctx: v2.Context,
  inputs: v3.SolutionAddFeatureInputs,
  telemetryProps?: Json
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
  inputs.features.forEach((f) => {
    allResources.add(f);
  });
  const contextWithManifestProvider: v3.ContextWithManifestProvider = {
    ...ctx,
    appManifestProvider: new DefaultManifestProvider(),
  };
  const resolveRes = await resolveResourceDependencies(
    contextWithManifestProvider,
    inputs,
    allResources
  );
  if (resolveRes.isErr()) return err(resolveRes.error);
  const existingPluginNames: string[] = Array.from(existingResources);
  const addedPluginNames: string[] = [];
  for (const pluginName of allResources.values()) {
    if (!existingResources.has(pluginName)) {
      addedPluginNames.push(pluginName);
    }
  }

  const addFeatureRes = await arm.addFeature(
    contextWithManifestProvider,
    inputs,
    addedPluginNames,
    existingPluginNames
  );
  if (addFeatureRes.isErr()) {
    return err(addFeatureRes.error);
  }
  return ok(Void);
}

async function resolveResourceDependencies(
  ctx: v3.ContextWithManifestProvider,
  inputs: Inputs,
  resourceNameSet: Set<string>
): Promise<Result<undefined, FxError>> {
  while (true) {
    const size1 = resourceNameSet.size;
    for (const name of resourceNameSet) {
      const plugin = Container.get<v3.PluginV3>(name);
      if (plugin.pluginDependencies || plugin.addInstance) {
        const depRes = plugin.pluginDependencies
          ? await plugin.pluginDependencies(ctx, inputs)
          : await plugin.addInstance!(ctx, inputs);
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
