import { FxError, Inputs, Json, Result, v2 } from "@microsoft/teamsfx-api";
import { armV2 } from "../arm";
import { NamedArmResourcePluginAdaptor, ScaffoldingContextAdapter } from "./adaptor";
import { showUpdateArmTemplateNotice } from "./executeUserTask";
import { getSelectedPlugins } from "./utils";

export async function generateResourceTemplate(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<Json, FxError>> {
  showUpdateArmTemplateNotice(ctx.userInteraction);
  const legacyContext = new ScaffoldingContextAdapter([ctx, inputs]);
  const plugins = getSelectedPlugins(ctx.projectSetting).map(
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
  const armResult = await armV2.generateArmTemplate(legacyContext, plugins);
  return armResult;
}
