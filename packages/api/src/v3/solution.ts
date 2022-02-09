// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Result } from "neverthrow";
import { FxError } from "../error";
import { Func, QTreeNode } from "../qm/question";
import { Inputs, Void } from "../types";
import { AppStudioTokenProvider, TokenProvider } from "../utils/login";
import { Context, DeepReadonly, InputsWithProjectPath } from "../v2/types";
import { EnvInfoV3 } from "./types";

export interface SolutionAddFeatureInputs extends InputsWithProjectPath {
  feature: string;
}

export interface ISolution {
  name: string;
  /**
   * init
   */
  getQuestionsForInit?: (
    ctx: Context,
    inputs: Inputs
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  init?: (ctx: Context, inputs: InputsWithProjectPath) => Promise<Result<Void, FxError>>;

  /**
   *  add feature
   */
  getQuestionsForAddFeature?: (
    ctx: Context,
    inputs: InputsWithProjectPath
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  /**
   * triggered by add feature event, this API aims to add/modify files in local workspace
   *
   * @param {Context} ctx - plugin's runtime context shared by all lifecycles.
   * @param {InputsWithProjectPath} inputs
   * @param {EnvInfoV3} envInfo optional
   * @returns Void
   */
  addFeature?: (ctx: Context, inputs: SolutionAddFeatureInputs) => Promise<Result<Void, FxError>>;

  //provision (remote or local)
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
  ) => Promise<Result<Void, FxError>>;

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
    envInfo: DeepReadonly<EnvInfoV3>,
    tokenProvider: TokenProvider
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  executeUserTask?: (
    ctx: Context,
    inputs: Inputs,
    func: Func,
    envInfo: EnvInfoV3,
    tokenProvider: TokenProvider
  ) => Promise<Result<any, FxError>>;
}
