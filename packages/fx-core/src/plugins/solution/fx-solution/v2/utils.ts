import {
  v2,
  Inputs,
  FxError,
  LogProvider,
  Result,
  ok,
  err,
  AzureSolutionSettings,
} from "@microsoft/teamsfx-api";
import { getActivatedV2ResourcePlugins } from "../ResourcePluginContainer";

export function getSelectedPlugins(ctx: v2.Context): v2.ResourcePlugin[] {
  const settings = getAzureSolutionSettings(ctx);
  const plugins = getActivatedV2ResourcePlugins(settings);
  settings.activeResourcePlugins = plugins.map((p) => p.name);
  return plugins;
}

export function getAzureSolutionSettings(ctx: v2.Context): AzureSolutionSettings {
  return ctx.projectSetting.solutionSettings as AzureSolutionSettings;
}
