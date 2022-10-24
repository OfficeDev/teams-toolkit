import { FxError, Result } from "@microsoft/teamsfx-api";
import { DriverContext } from "../driver/interface/commonArgs";
import { StepDriver } from "../driver/interface/stepDriver";

export type RawProjectModel = {
  registerApp?: DriverDefinition[];
  provision?: DriverDefinition[];
  configureApp?: DriverDefinition[];
  deploy?: DriverDefinition[];
  publish?: DriverDefinition[];
};

export type ProjectModel = {
  registerApp?: ILifecycle;
  provision?: ILifecycle;
  configureApp?: ILifecycle;
  deploy?: ILifecycle;
  publish?: ILifecycle;
};

export type DriverDefinition = {
  name?: string;
  uses: string;
  with: unknown;
};

export type DriverInstance = DriverDefinition & { instance: StepDriver };

export type LifecycleNames = ["registerApp", "configureApp", "provision", "deploy", "publish"];
export const LifecycleNames: LifecycleNames = [
  "registerApp",
  "configureApp",
  "provision",
  "deploy",
  "publish",
];
type AnyElementOf<T extends unknown[]> = T[number];
export type LifecycleName = AnyElementOf<LifecycleNames>;

export type Output = { env: Map<string, string>; unresolvedPlaceHolders: string[] };

export interface ILifecycle {
  name: LifecycleName;
  // When run, the lifecycle will try to resolve all placeholders in the driver's arguments
  // based on the environment variables. If there are unresolved placeholders, the lifecycle
  // will return ok with the list of unresolved placeholders.
  // If there are no unresolved placeholders, the lifecycle will run the drivers in order and
  // return ok with the output of all drivers.
  // If there is any driver error, run will return early with the error.
  run(ctx: DriverContext): Promise<Result<Output, FxError>>;
}

export interface IYamlParser {
  parse(path: string): Promise<Result<ProjectModel, FxError>>;
}
