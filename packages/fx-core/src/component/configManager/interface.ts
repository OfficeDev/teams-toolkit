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

export type Output = Map<string, string>;

export interface ILifecycle {
  name: LifecycleName;
  run(ctx: DriverContext): Promise<Result<Output, FxError>>;
}

export interface IYamlParser {
  parse(path: string): Promise<Result<ProjectModel, FxError>>;
}
