import {
  v2,
  Inputs,
  FxError,
  LogProvider,
  Result,
  ok,
  err,
  AzureSolutionSettings,
  combine,
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

export function combineRecords(
  records: { name: string; result: { output: Record<string, string> } }[]
): Record<string, { output: Record<string, string> }> {
  const ret: Record<v2.PluginName, { output: Record<string, string> }> = {};
  for (const record of records) {
    ret[record.name] = record.result;
  }

  return ret;
}
