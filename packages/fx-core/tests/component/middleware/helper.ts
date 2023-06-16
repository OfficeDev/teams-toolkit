import "mocha";
import {
  Context,
  Effect,
  FxError,
  InputsWithProjectPath,
  IProgressHandler,
  ok,
  Result,
} from "@microsoft/teamsfx-api";
import { hooks } from "@feathersjs/hooks/lib";
import { StepDriver } from "../../../src/component/driver/interface/stepDriver";
import { DriverContext } from "../../../src/component/driver/interface/commonArgs";
import { addStartAndEndTelemetry } from "../../../src/component/driver/middleware/addStartAndEndTelemetry";

export class MockDriver implements StepDriver {
  @hooks([addStartAndEndTelemetry("mock", "mock")])
  async run(args: unknown, context: DriverContext): Promise<Result<Map<string, string>, FxError>> {
    return ok(new Map<string, string>());
  }
}
