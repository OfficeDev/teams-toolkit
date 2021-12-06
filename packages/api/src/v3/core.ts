import { Core, FxError, Result, Void } from "..";
import { Context, InputsWithProjectPath } from "../v2";

export interface CoreV3 extends Core {
  /**
   * init means enable TeamsFx feature for current project folder. There are two cases:
   * 1. Init in an empty folder
   * 2.	Init in existing project folder
   * Whether current folder is empty or not, core will create ".fx" folder and "templates" folder with necessary files, similar to what "git init" command do.
   */
  init: (inputs: InputsWithProjectPath) => Promise<Result<Void, FxError>>;
  /**
   * scaffold will be an independent stage
   */
  scaffoldSourceCode: (
    ctx: Context,
    inputs: InputsWithProjectPath
  ) => Promise<Result<Void, FxError>>;
}
