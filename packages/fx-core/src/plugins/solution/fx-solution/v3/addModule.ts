// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  err,
  FxError,
  IBot,
  IComposeExtension,
  IConfigurableTab,
  IStaticTab,
  Json,
  ok,
  QTreeNode,
  Result,
  v2,
  v3,
} from "@microsoft/teamsfx-api";
import { Container } from "typedi";
import { AppStudioPluginV3 } from "../../../resource/appstudio/v3";
import { scaffoldLocalDebugSettings } from "../debug/scaffolding";
import { BotOptionItem, MessageExtensionItem, TabOptionItem } from "../question";
import { BuiltInResourcePluginNames } from "./constants";
import { CapabilityAlreadyAddedError } from "./error";
import { selectCapabilitiesQuestion } from "../../utils/questions";

export async function getQuestionsForAddModule(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<QTreeNode | undefined, FxError>> {
  return ok(new QTreeNode(selectCapabilitiesQuestion));
}
export async function addModule(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath & { capabilities: string[] },
  localSettings?: Json
): Promise<Result<Json, FxError>> {
  const solutionSettings = ctx.projectSetting.solutionSettings as v3.TeamsFxSolutionSettings;
  const inputCapabilities = inputs.capabilities;
  // 1. update solution settings
  const module: v3.Module = {
    capabilities: inputCapabilities,
  };
  const capSet = new Set<string>();
  solutionSettings.modules.forEach((m) => m.capabilities.forEach((c) => capSet.add(c)));
  for (const cap of inputCapabilities) {
    if (capSet.has(cap)) {
      return err(new CapabilityAlreadyAddedError(cap));
    } else {
      capSet.add(cap);
    }
  }
  solutionSettings.capabilities = Array.from(capSet);
  solutionSettings.modules.push(module);

  // 2. scaffold local debug settings
  const scaffoldLocalDebugSettingsResult = await scaffoldLocalDebugSettings(
    ctx,
    inputs,
    localSettings
  );
  if (scaffoldLocalDebugSettingsResult.isErr()) {
    return scaffoldLocalDebugSettingsResult;
  }

  // 3. call appStudio.addCapabilities() to update manifest templates
  if (inputCapabilities.length > 0) {
    const appStudio = Container.get<AppStudioPluginV3>(BuiltInResourcePluginNames.appStudio);
    const manifestInputs: (
      | { name: "staticTab"; snippet?: { local: IStaticTab; remote: IStaticTab } }
      | { name: "configurableTab"; snippet?: { local: IConfigurableTab; remote: IConfigurableTab } }
      | { name: "Bot"; snippet?: { local: IBot; remote: IBot } }
      | {
          name: "MessageExtension";
          snippet?: { local: IComposeExtension; remote: IComposeExtension };
        }
    )[] = [];
    if (inputCapabilities.includes(TabOptionItem.id)) manifestInputs.push({ name: "staticTab" });
    if (inputCapabilities.includes(BotOptionItem.id)) manifestInputs.push({ name: "Bot" });
    if (inputCapabilities.includes(MessageExtensionItem.id))
      manifestInputs.push({ name: "MessageExtension" });
    const addRes = await appStudio.addCapabilities(ctx, inputs, manifestInputs);
    if (addRes.isErr()) return err(addRes.error);
  }
  return ok(scaffoldLocalDebugSettingsResult.value);
}
