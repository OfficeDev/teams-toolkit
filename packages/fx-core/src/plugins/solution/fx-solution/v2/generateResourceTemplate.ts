import {
  v2,
  Inputs,
  FxError,
  Result,
  ok,
  err,
  Void,
  returnSystemError,
} from "@microsoft/teamsfx-api";
import { isArmSupportEnabled } from "../../../../common/tools";
import { generateArmTemplate } from "../arm";
import { SolutionError } from "../constants";
import { ScaffoldingContextAdapter } from "./adaptor";

export async function generateResourceTemplate(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<unknown, FxError>> {
  if (!isArmSupportEnabled()) {
    return err(
      returnSystemError(
        new Error("Feature not supported"),
        "Solution",
        SolutionError.FeatureNotSupported
      )
    );
  }
  const legacyContext = new ScaffoldingContextAdapter([ctx, inputs]);
  // todo(yefuwang): replace generateArmTemplate when v2 implementation is ready.
  const armResult = await generateArmTemplate(legacyContext);
  return armResult;
}
