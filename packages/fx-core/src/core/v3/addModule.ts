import { err, FxError, NotImplementedError, Result, v2, Void } from "@microsoft/teamsfx-api";

export async function addModule(
  inputs: v2.InputsWithProjectPath & { capabilities?: string[] }
): Promise<Result<Void, FxError>> {
  return err(new NotImplementedError("CoreV3", "addModule"));
}
