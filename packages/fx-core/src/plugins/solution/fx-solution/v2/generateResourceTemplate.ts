import { v2, Inputs, FxError, Result, Json, UserInteraction, v3 } from "@microsoft/teamsfx-api";
import { getStrings } from "../../../../common/tools";
import arm, { armV2 } from "../arm";
import { getActivatedV2ResourcePlugins } from "../ResourcePluginContainer";
import { NamedArmResourcePluginAdaptor, ScaffoldingContextAdapter } from "./adaptor";
import { getAzureSolutionSettings, getSelectedPlugins } from "./utils";
import * as util from "util";

export function showUpdateArmTemplateNotice(ui?: UserInteraction): void {
  const msg: string = util.format(getStrings().solution.UpdateArmTemplateNotice);
  ui?.showMessage("info", msg, false);
}

export async function generateResourceTemplate(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<Json, FxError>> {
  const legacyContext = new ScaffoldingContextAdapter([ctx, inputs]);
  const azureSolutionSettings = getAzureSolutionSettings(ctx);
  const plugins = getSelectedPlugins(azureSolutionSettings).map(
    (plugin) => new NamedArmResourcePluginAdaptor(plugin)
  );
  const armResult = await armV2.generateArmTemplate(legacyContext, plugins);
  return armResult;
}

export async function generateResourceTemplateForPlugins(
  ctx: v3.ContextWithManifest,
  inputs: v3.PluginAddResourceInputs,
  plugins: v2.ResourcePlugin[]
): Promise<Result<Json, FxError>> {
  showUpdateArmTemplateNotice(ctx.userInteraction);
  const azureSolutionSettings = getAzureSolutionSettings(ctx);
  const allPlugins = getActivatedV2ResourcePlugins(azureSolutionSettings);
  const armResult = await arm.generateArmTemplate(ctx, inputs, allPlugins, plugins);
  return armResult;
}
