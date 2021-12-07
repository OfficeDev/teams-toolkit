import Module from "module";
import { FxError, Inputs, Json, QTreeNode, Result, TokenProvider, v2, Void } from "..";
import { Context, DeepReadonly, InputsWithProjectPath } from "../v2/types";
import { EnvInfoV3 } from "./types";

export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type SolutionPluginV3 = StrictOmit<v2.SolutionPlugin, "getQuestions"> & {
  /**
   * add resource is no more implemented in executeUserTask
   * steps:
   * 1. update project settings
   * 2. update local settings
   * 3. generate arm template
   * 4. re-generate local debug scripts
   */
  addResource: (
    ctx: Context,
    localSettings: Json,
    inputs: InputsWithProjectPath & { module?: keyof Module }
  ) => Promise<Result<Void, FxError>>;

  /**
   * add capability is no more implemented in executeUserTask
   * steps:
   * 1. update project settings
   * 2. update local settings
   * 3. re-generate local debug scripts
   */
  addCapability: (
    ctx: Context,
    localSettings: Json,
    inputs: InputsWithProjectPath
  ) => Promise<Result<Void, FxError>>;

  /**
   * customize questions needed for add resource operation
   */
  getQuestionsForAddResource?: (
    ctx: Context,
    inputs: Inputs
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  /**
   * customize questions needed for local debug
   */
  getQuestionsForLocalProvision?: (
    ctx: Context,
    inputs: Inputs,
    localSettings: DeepReadonly<Json>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  /**
   * customize questions needed for provision
   */
  getQuestionsForProvision?: (
    ctx: Context,
    inputs: Inputs,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  /**
   * customize questions needed for deploy
   */
  getQuestionsForDeploy?: (
    ctx: Context,
    inputs: Inputs,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  /**
   * 1. modify the envInfo type to EnvInfoV3
   * 2. modify the return type, to simplify the implementation cost, for partial success scenario, solution will directly update the envInfo input
   */
  provisionResource?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: EnvInfoV3,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;
};
