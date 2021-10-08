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
import { blockV1Project } from "./utils";

export async function createPackage(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<Void, FxError>> {
  const blockResult = blockV1Project(ctx.projectSetting.solutionSettings);
  if (blockResult.isErr()) {
    return err(blockResult.error);
  }
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
