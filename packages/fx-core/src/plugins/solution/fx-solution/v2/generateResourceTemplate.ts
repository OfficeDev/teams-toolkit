import { v2, Inputs, FxError, Result, Json, ok } from "@microsoft/teamsfx-api";
import { isArmSupportEnabled } from "../../../../common/tools";
import { generateArmTemplate } from "../arm";
import { ScaffoldingContextAdapter } from "./adaptor";

export async function generateResourceTemplate(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<Json, FxError>> {
  if (!isArmSupportEnabled()) {
    return ok({});
  }
  const legacyContext = new ScaffoldingContextAdapter([ctx, inputs]);
  // todo(yefuwang): replace generateArmTemplate when v2 implementation is ready.
  const armResult = await generateArmTemplate(legacyContext);
  return armResult;
}
