import { v2, Inputs, FxError, Result, Json, ok } from "@microsoft/teamsfx-api";
import { isArmSupportEnabled } from "../../../../common/tools";
import { armV2, generateArmTemplate } from "../arm";
import { NamedArmResourcePluginAdaptor, ScaffoldingContextAdapter } from "./adaptor";
import { showUpdateArmTemplateNotice } from "./executeUserTask";
import { getAzureSolutionSettings, getSelectedPlugins } from "./utils";

export async function generateResourceTemplate(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<Json, FxError>> {
  if (!isArmSupportEnabled()) {
    return ok({});
  }
  const legacyContext = new ScaffoldingContextAdapter([ctx, inputs]);
  const azureSolutionSettings = getAzureSolutionSettings(ctx);
  const plugins = getSelectedPlugins(azureSolutionSettings).map(
    (plugin) => new NamedArmResourcePluginAdaptor(plugin)
  );
  const armResult = await armV2.generateArmTemplate(legacyContext, plugins);
  return armResult;
}

export async function generateResourceTemplateForPlugins(
  ctx: v2.Context,
  inputs: Inputs,
  plugins: v2.ResourcePlugin[]
): Promise<Result<Json, FxError>> {
  showUpdateArmTemplateNotice(ctx.userInteraction);
  const legacyContext = new ScaffoldingContextAdapter([ctx, inputs]);
  // todo(yefuwang): replace generateArmTemplate when v2 implementation is ready.
  const namedArmResourcePlugins = plugins.map(
    (plugin) => new NamedArmResourcePluginAdaptor(plugin)
  );
  const armResult = await armV2.generateArmTemplate(legacyContext, namedArmResourcePlugins);
  return armResult;
}
