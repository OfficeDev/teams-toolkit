import { FxError, Inputs, Json, Result, v2, v3 } from "@microsoft/teamsfx-api";
import arm, { armV2 } from "../arm";
import { getActivatedV2ResourcePlugins } from "../ResourcePluginContainer";
import { NamedArmResourcePluginAdaptor, ScaffoldingContextAdapter } from "./adaptor";
import { showUpdateArmTemplateNotice } from "./executeUserTask";
import { getAzureSolutionSettings, getSelectedPlugins } from "./utils";

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
