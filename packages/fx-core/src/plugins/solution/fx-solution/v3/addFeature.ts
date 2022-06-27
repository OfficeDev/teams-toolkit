// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings,
  err,
  FxError,
  Json,
  ok,
  OptionItem,
  QTreeNode,
  Result,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { Container } from "typedi";
import { AppStudioPluginV3 } from "../../../resource/appstudio/v3";
import { selectMultipleFeaturesQuestion } from "../../utils/questions";
import arm from "../arm";
import { BuiltInFeaturePluginNames } from "./constants";
import { ensureSolutionSettings } from "../utils/solutionSettingsHelper";
import { ProgrammingLanguageQuestion } from "../../../../core/question";
import { HostTypeOptionAzure, HostTypeOptionSPFx } from "../question";
import { scaffoldLocalDebugSettings } from "../debug/scaffolding";
import { cloneDeep } from "lodash";
import { hasAzureResource, hasSPFx } from "../../../../common/projectSettingsHelper";

function getAllFeaturePlugins(): v3.PluginV3[] {
  return [
    Container.get<v3.PluginV3>(BuiltInFeaturePluginNames.frontend),
    Container.get<v3.PluginV3>(BuiltInFeaturePluginNames.bot),
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
  if (!ctx.projectSetting.programmingLanguage) {
    const programmingLanguage = new QTreeNode(ProgrammingLanguageQuestion);
    node.addChild(programmingLanguage);
  }
  const staticOptions: OptionItem[] = [];
  for (const plugin of plugins) {
    staticOptions.push({
      id: plugin.name,
      label: plugin.description || plugin.displayName || plugin.name,
    });
    if (plugin.getQuestionsForAddInstance) {
      const childNode = await plugin.getQuestionsForAddInstance(ctx, inputs);
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
  async updateCapability(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    capability: v3.ManifestCapability
  ): Promise<Result<Void, FxError>> {
    const appStudioV3 = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
    return await appStudioV3.updateCapability(ctx, inputs, capability);
  }
  async deleteCapability(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    capability: v3.ManifestCapability
  ): Promise<Result<Void, FxError>> {
    const appStudioV3 = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
    return await appStudioV3.deleteCapability(ctx, inputs, capability);
  }
  async capabilityExceedLimit(
    ctx: v2.Context,
    inputs: v2.InputsWithProjectPath,
    capability: "staticTab" | "configurableTab" | "Bot" | "MessageExtension" | "WebApplicationInfo"
  ): Promise<Result<boolean, FxError>> {
    const appStudioV3 = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
    return await appStudioV3.capabilityExceedLimit(ctx, inputs, capability);
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
  if (!ctx.projectSetting.programmingLanguage && inputs[ProgrammingLanguageQuestion.name])
    ctx.projectSetting.programmingLanguage = inputs[ProgrammingLanguageQuestion.name];
  let solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
  const existingSet = new Set<string>();
  let newSet = new Set<string>();
  solutionSettings.activeResourcePlugins.forEach((p) => {
    existingSet.add(p);
  });
  inputs.features.forEach((f) => {
    newSet.add(f);
  });

  const contextWithManifestProvider: v3.ContextWithManifestProvider = {
    ...ctx,
    appManifestProvider: new DefaultManifestProvider(),
  };
  const projectSettingsOld = cloneDeep(ctx.projectSetting);
  const resolveRes = await resolveResourceDependencies(
    contextWithManifestProvider,
    inputs,
    existingSet,
    newSet
  );
  const projectSettingsNew = ctx.projectSetting;
  if (resolveRes.isErr()) return err(resolveRes.error);
  newSet = resolveRes.value;
  newSet.forEach((s) => {
    existingSet.delete(s);
  });
  const existingArray: string[] = Array.from(existingSet);
  const newArray: string[] = Array.from(newSet);
  const allPluginsAfterAdd = existingArray.concat(newArray);

  const addFeatureInputs: v3.AddFeatureInputs = {
    ...inputs,
    allPluginsAfterAdd: allPluginsAfterAdd,
  };
  contextWithManifestProvider.projectSetting = projectSettingsOld;
  for (const pluginName of newArray) {
    const plugin = Container.get<v3.PluginV3>(pluginName);
    if (plugin.generateCode) {
      const res = await plugin.generateCode(contextWithManifestProvider, addFeatureInputs);
      if (res.isErr()) return err(res.error);
    }
  }
  const bicepRes = await arm.generateBicep(
    contextWithManifestProvider,
    inputs,
    newArray,
    existingArray
  );
  if (bicepRes.isErr()) {
    return err(bicepRes.error);
  }

  ctx.projectSetting = projectSettingsNew;
  solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;

  if (hasAzureResource(ctx.projectSetting)) {
    solutionSettings.hostType = HostTypeOptionAzure.id;
  } else if (hasSPFx(ctx.projectSetting)) {
    solutionSettings.hostType = HostTypeOptionSPFx.id;
  }

  const scaffoldRes = await scaffoldLocalDebugSettings(ctx, inputs, undefined, false);
  if (scaffoldRes.isErr()) return err(scaffoldRes.error);

  return ok(Void);
}

/**
 * make sure all dependencies in the dependency chain are collected
 * make sure all newly added dependencies's addInstance method are called once
 * @param existingSet existing set
 * @param addedSet set to add
 * @returns new added set (include resolved dependencies in the chain)
 */
async function resolveResourceDependencies(
  ctx: v3.ContextWithManifestProvider,
  inputs: v2.InputsWithProjectPath,
  existingSet: Set<string>,
  addedSet: Set<string>
): Promise<Result<Set<string>, FxError>> {
  const originalSet = new Set<string>();
  const all = new Set<string>();
  const calledSet = new Set<string>();
  existingSet.forEach((s) => {
    originalSet.add(s);
    all.add(s);
    calledSet.add(s);
  });
  addedSet.forEach((s) => {
    all.add(s);
  });
  // call addInstance APIs for a plugins in addedSet
  for (const pluginName of addedSet.values()) {
    const plugin = Container.get<v3.PluginV3>(pluginName);
    if (plugin.addInstance) {
      const depRes = await plugin.addInstance(ctx, inputs);
      if (depRes.isErr()) {
        return err(depRes.error);
      }
      calledSet.add(pluginName);
      for (const dep of depRes.value) {
        all.add(dep);
      }
    }
  }
  // check all to make all dependencies are resolved
  while (true) {
    const size1 = all.size;
    for (const pluginName of all.values()) {
      const plugin = Container.get<v3.PluginV3>(pluginName);
      if (plugin.addInstance && !calledSet.has(pluginName)) {
        const depRes = await plugin.addInstance(ctx, inputs);
        if (depRes.isErr()) {
          return err(depRes.error);
        }
        calledSet.add(pluginName);
        for (const dep of depRes.value) {
          all.add(dep);
        }
      }
    }
    const size2 = all.size;
    if (size1 === size2) break;
  }
  const netSet = new Set<string>();
  for (const pluginName of all.values()) {
    if (!originalSet.has(pluginName)) {
      netSet.add(pluginName);
    }
  }
  addedSet.forEach((s) => {
    netSet.add(s);
  });
  return ok(netSet);
}
