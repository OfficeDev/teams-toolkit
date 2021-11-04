import {
  v2,
  Inputs,
  FxError,
  Result,
  err,
  Void,
  returnSystemError,
  SystemError,
  NotImplementedError,
} from "@microsoft/teamsfx-api";
import { PluginNames, SolutionError, SolutionSource } from "../constants";
import Container from "typedi";
import { ResourcePluginsV2 } from "../ResourcePluginContainer";

export async function createPackage(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<Void, FxError>> {
  const appStudioPlugin = Container.get<v2.ResourcePlugin>(ResourcePluginsV2.AppStudioPlugin);
  if (!appStudioPlugin?.executeUserTask) {
    return err(
      returnSystemError(
        new Error("package() not implemented"),
        SolutionSource,
        SolutionError.InternelError
      )
    );
  }
  const func = {
    namespace: `${PluginNames.SOLUTION}/${PluginNames.APPST}`,
    method: "buildPackage",
  };

  // return (await appStudioPlugin.executeUserTask(ctx, inputs, func)).map((_) => Void);
  throw new NotImplementedError(SolutionSource, "createPackage");
}
