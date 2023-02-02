/**
 * @author huajiezhang <huajiezhang@microsoft.com>
 */
import { err, FxError, Result, UserError } from "@microsoft/teamsfx-api";
import { Service } from "typedi";
import { DriverContext } from "../interface/commonArgs";
import { ExecutionResult, StepDriver } from "../interface/stepDriver";

const ACTION_NAME = "script";

@Service(ACTION_NAME)
export class ScriptStepDriver implements StepDriver {
  async run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>> {
    return err(new UserError({}));
  }
  async execute(args: unknown, ctx: DriverContext): Promise<ExecutionResult> {
    return { result: err(new UserError({})), summaries: [] };
  }
}
