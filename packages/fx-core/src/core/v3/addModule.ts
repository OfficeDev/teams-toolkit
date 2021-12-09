import { FxError, ok, Result, v2, Void } from "@microsoft/teamsfx-api";
import { CoreHookContext } from "../..";

export async function addModule(
  inputs: v2.InputsWithProjectPath & { capabilities?: string[] },
  ctx?: CoreHookContext
): Promise<Result<Void, FxError>> {
  if (!inputs.capabilities) inputs.capabilities = [];
  if (ctx && ctx.solutionV3 && ctx.contextV2) {
    return await ctx.solutionV3.addModule(
      ctx.contextV2,
      {},
      inputs as v2.InputsWithProjectPath & { capabilities: string[] }
    );
  }
  return ok(Void);
}
