import Module from "module";
import { FxError, Inputs, Json, QTreeNode, Result, TokenProvider, v2, Void } from "..";
import { Context, DeepReadonly, InputsWithProjectPath } from "../v2/types";
import { ScaffoldTemplate } from "./plugins";
import { EnvInfoV3 } from "./types";

export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type SolutionPluginV3 = StrictOmit<v2.SolutionPlugin, "getQuestions"> & {
  /**
   * Source code template descriptions
   */
  getTemplates: (ctx: Context, inputs: Inputs) => Promise<Result<ScaffoldTemplate[], FxError>>;

  /**
   * scaffold will be an independent stage
   */
  scaffoldSourceCode: (
    ctx: Context,
    inputs: InputsWithProjectPath
  ) => Promise<Result<Void, FxError>>;
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

  provisionLocalResource?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    localSettings: Json,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;

  provisionResource?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: EnvInfoV3,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;
};
