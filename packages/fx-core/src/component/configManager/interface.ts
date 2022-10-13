import { FxError, Result } from "@microsoft/teamsfx-api";
import { DriverContext } from "../driver/interface/commonArgs";
import { StepDriver } from "../driver/interface/stepDriver";

export type TemplateDefinitions = {
  registerApp: ILifecycle;
  provision: ILifecycle;
  configureApp: ILifecycle;
  deploy: ILifecycle;
  publish: ILifecycle;
};

export type DriverDefinition = {
  name: string;
  uses: string;
  with: unknown;
};

export type DriverInstance = DriverDefinition & { instance: StepDriver };

export type LifecycleName = "registerApp" | "configureApp" | "provision" | "deploy" | "publish";

export type Output = Map<string, string>;

export interface ILifecycle {
  name: LifecycleName;
  run(ctx: DriverContext): Promise<Result<Output, FxError>>;
}
