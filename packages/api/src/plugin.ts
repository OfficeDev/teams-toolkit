// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Context, PluginContext } from "./context";
import { Result } from "neverthrow";
import { FxError } from "./error";
import { Stage } from "./constants";
import { Func, QTreeNode } from "./qm";
import { AzureSolutionSettings } from "./types";
/**
 * Plugin.
 */
export interface Plugin {
  name: string;

  displayName: string;

  /**
   * resource plugin decide whether it need to be activated
   * @param solutionSettings solution settings
   */
  activate(solutionSettings: AzureSolutionSettings): boolean;

  /**
   * prerequisiteCheck will check the whether required software has been installed. e.g. dotnet runtime of a required version.
   * If the check fails, please return a human read-able msg that tells what software is missing.
   */
  prerequisiteCheck?: (
    ctx: Readonly<Context>
  ) => Promise<Result<{ pass: true } | { pass: false; msg: string }, FxError>>;

  /**
   * user questions
   */
  getQuestions?: (
    stage: Stage,
    ctx: PluginContext
  ) => Promise<Result<QTreeNode | undefined, FxError>>;

  /**
   * func entry for dymanic question
   */
  callFunc?: (func: Func, ctx: PluginContext) => Promise<Result<any, FxError>>;

  /**
   * for local debug
   */
  localDebug?: (ctx: PluginContext) => Promise<Result<any, FxError>>;
  postLocalDebug?: (ctx: PluginContext) => Promise<Result<any, FxError>>;

  preProvision?: (ctx: PluginContext) => Promise<Result<any, FxError>>;
  provision?: (ctx: PluginContext) => Promise<Result<any, FxError>>;
  postProvision?: (ctx: PluginContext) => Promise<Result<any, FxError>>;

  preScaffold?: (ctx: PluginContext) => Promise<Result<any, FxError>>;
  scaffold?: (ctx: PluginContext) => Promise<Result<any, FxError>>;
  postScaffold?: (ctx: PluginContext) => Promise<Result<any, FxError>>;

  preDeploy?: (ctx: PluginContext) => Promise<Result<any, FxError>>;
  deploy?: (ctx: PluginContext) => Promise<Result<any, FxError>>;
  postDeploy?: (ctx: PluginContext) => Promise<Result<any, FxError>>;

  generateArmTemplates?: (ctx: PluginContext) => Promise<Result<any, FxError>>;
  updateArmTemplates?: (ctx: PluginContext) => Promise<Result<any, FxError>>;

  /**
   * publish
   */
  publish?: (ctx: PluginContext) => Promise<Result<any, FxError>>;

  /**
   * user questions for user customized task
   */
  getQuestionsForUserTask?: (
    func: Func,
    ctx: PluginContext
  ) => Promise<Result<QTreeNode | undefined, FxError>>;
  /**
   * execute user customized task
   */
  executeUserTask?: (func: Func, ctx: PluginContext) => Promise<Result<any, FxError>>;

  /**
   * For grant and check permission in remote collaboration
   */
  grantPermission?: (
    ctx: PluginContext,
    userInfo: Record<string, any>
  ) => Promise<Result<any, FxError>>;

  checkPermission?: (
    ctx: PluginContext,
    userInfo: Record<string, any>
  ) => Promise<Result<any, FxError>>;

  listCollaborator?: (
    ctx: PluginContext,
    userInfo: Record<string, any>
  ) => Promise<Result<any, FxError>>;
}
