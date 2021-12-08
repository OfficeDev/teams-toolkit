// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { FxError } from "../error";
import { Func, QTreeNode } from "../qm/question";
import { Inputs, Json, Void } from "../types";
import { AppStudioTokenProvider, TokenProvider } from "../utils/login";
import { Context, DeepReadonly, InputsWithProjectPath } from "../v2/types";
import { EnvInfoV3 } from "./types";

// export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export interface ISolution {
  name: string;

  /**
   * init
   */
  getQuestionsForInit?: (
    ctx: Context,
    inputs: InputsWithProjectPath
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  init: (
    ctx: Context,
    inputs: InputsWithProjectPath & { capabilities: string[] }
  ) => Promise<Result<Void, FxError>>;

  /**
   * scaffold
   */
  getQuestionsForScaffolding?: (
    ctx: Context,
    inputs: InputsWithProjectPath
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  scaffold: (
    ctx: Context,
    inputs: InputsWithProjectPath & { moduleIndex: number; templateName: string }
  ) => Promise<Result<Void, FxError>>;

  /**
   * addResource
   */
  getQuestionsForAddResource?: (
    ctx: Context,
    inputs: InputsWithProjectPath
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  addResource: (
    ctx: Context,
    inputs: InputsWithProjectPath & { moduleIndex: number; pluginName: string }
  ) => Promise<Result<Void, FxError>>;

  /**
   * addModule
   */
  getQuestionsForAddModule?: (
    ctx: Context,
    inputs: InputsWithProjectPath
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  addModule: (
    ctx: Context,
    inputs: InputsWithProjectPath & { capabilities: string[] }
  ) => Promise<Result<Void, FxError>>;

  //provision
  getQuestionsForProvision?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  provisionResources?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: EnvInfoV3,
    tokenProvider: TokenProvider
  ) => Promise<Result<EnvInfoV3, FxError>>;

  //local provision
  getQuestionsForLocalProvision?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    localSettings: DeepReadonly<Json>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  provisionLocalResources?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    localSettings: Json,
    tokenProvider: TokenProvider
  ) => Promise<Result<Json, FxError>>;

  //deploy
  getQuestionsForDeploy?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  deploy?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<Void, FxError>>;

  //publish
  getQuestionsForPublish?: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: AppStudioTokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  publishApplication: (
    ctx: Context,
    inputs: InputsWithProjectPath,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: AppStudioTokenProvider
  ) => Promise<Result<Void, FxError>>;

  //user task
  getQuestionsForUserTask?: (
    ctx: Context,
    inputs: Inputs,
    func: Func,
    localSettings: Json,
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  executeUserTask?: (
    ctx: Context,
    inputs: Inputs,
    func: Func,
    localSettings: Json,
    envInfo: EnvInfoV3,
    tokenProvider: TokenProvider
  ) => Promise<Result<unknown, FxError>>;
}
