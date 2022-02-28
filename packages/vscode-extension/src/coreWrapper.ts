// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { HookContext, hooks, Middleware, NextFunction } from "@feathersjs/hooks";
import {
  getAppDirectory,
  globalStateUpdate,
  InvalidProjectError,
  isConfigUnifyEnabled,
  isUserCancelError,
  LocalEnvManager,
  ProjectSettingsHelper,
} from "@microsoft/teamsfx-core";
import {
  AppPackageFolderName,
  assembleError,
  BuildFolderName,
  err,
  Func,
  FxError,
  Inputs,
  ok,
  Result,
  SystemError,
  v2,
  Void,
} from "@microsoft/teamsfx-api";
import { kebabCase } from "lodash";
import {
  askTargetEnvironment,
  checkCoreNotEmpty,
  core,
  getSystemInputs,
  getTriggerFromProperty,
  getWorkspacePath,
  processResult,
} from "./handlers";
import { ExtTelemetry } from "./telemetry/extTelemetry";
import * as envTree from "./envTree";
import { TreatmentVariableValue } from "./exp/treatmentVariables";
import * as uuid from "uuid";
import { vscodeHelper } from "./debug/depsChecker/vscodeHelper";
import VsCodeLogInstance from "./commonlib/log";
import { automaticNpmInstallHandler } from "./debug/npmInstallHandler";
import { ext } from "./extensionVariables";
import { VS_CODE_UI } from "./extension";
import { CommandsTreeViewProvider } from "./treeview/commandsTreeViewProvider";
import * as fs from "fs-extra";
import * as util from "util";
import * as vscode from "vscode";
import * as StringResources from "./resources/Strings.json";
import { ExtensionSource } from "./error";
import { FxCore } from "@microsoft/teamsfx-core";
import { FxCore } from "@microsoft/teamsfx-core";
export interface ErrorHandleOption {
  startFn?: (ctx: HookContext) => Promise<Result<any, FxError>>;
  endFn?: (ctx: HookContext) => Promise<void>;
}

export function CommonErrorHandlerMW(option?: ErrorHandleOption): Middleware {
  return async (ctx: HookContext, next: NextFunction) => {
    const firstParam = ctx.arguments[0] as any[] | undefined;
    const inputs = getSystemInputs();
    ctx.arguments.push(inputs);
    const startEvent = kebabCase(ctx.method!) + "-start";
    const endEvent = kebabCase(ctx.method!);
    if (option?.startFn) {
      const res = await option?.startFn(ctx);
      if (res.isErr()) {
        ctx.result = err(res.error);
      }
    }
    ExtTelemetry.sendTelemetryEvent(startEvent, getTriggerFromProperty(firstParam));
    let result: Result<any, FxError>;
    let fxError: FxError | undefined = undefined;
    try {
      //1. pre check core is not undefined
      const checkCoreRes = checkCoreNotEmpty();
      if (checkCoreRes.isErr()) {
        throw checkCoreRes.error;
      }
      await next();
      if (option?.endFn) {
        await option?.endFn(ctx);
      }
      result = ctx.result as Result<any, FxError>;
      if (result.isErr()) {
        fxError = result.error;
      }
    } catch (e) {
      fxError = assembleError(e);
      result = err(fxError);
      ctx.result = result;
    }
    if (option?.endFn) {
      await option?.endFn(ctx);
    }
    await processResult(endEvent, result, inputs);
  };
}

export class FxCoreWrapper {
  core: FxCore;
  constructor(core: FxCore) {
    this.core = core;
  }
  @hooks([CommonErrorHandlerMW()])
  async init(args: any[], inputs?: Inputs): Promise<Result<Void, FxError>> {
    return await core.init(inputs! as v2.InputsWithProjectPath);
  }
  @hooks([CommonErrorHandlerMW()])
  async addFeature(args: any[], inputs?: Inputs): Promise<Result<Void, FxError>> {
    return await core.addFeature(inputs! as v2.InputsWithProjectPath);
  }
  @hooks([CommonErrorHandlerMW()])
  async createProject(args: any[], inputs?: Inputs): Promise<Result<any, FxError>> {
    if (TreatmentVariableValue.removeCreateFromSample) {
      inputs!["scratch"] = inputs!["scratch"] ?? "yes";
      inputs!.projectId = inputs!.projectId ?? uuid.v4();
    }
    const tmpResult = await core.createProject(inputs!);
    if (tmpResult.isErr()) {
      return err(tmpResult.error);
    } else {
      const uri = vscode.Uri.file(tmpResult.value);
      return ok(uri);
    }
  }
  @hooks([CommonErrorHandlerMW()])
  async provision(args: any[], inputs?: Inputs): Promise<Result<Void, FxError>> {
    const result = await core.provisionResources(inputs!);
    if (result.isErr() && isUserCancelError(result.error)) {
      return result;
    } else {
      // refresh env tree except provision cancelled.
      await envTree.registerEnvTreeHandler();
      return result;
    }
  }
  @hooks([CommonErrorHandlerMW()])
  async deploy(args: any[], inputs?: Inputs): Promise<Result<Void, FxError>> {
    return await core.deployArtifacts(inputs!);
  }
  @hooks([CommonErrorHandlerMW()])
  async debug(args: any[], inputs?: Inputs): Promise<Result<Void, FxError>> {
    if (isConfigUnifyEnabled()) {
      inputs!.ignoreEnvInfo = false;
    } else {
      inputs!.ignoreEnvInfo = true;
    }
    inputs!.checkerInfo = {
      skipNgrok: !vscodeHelper.isNgrokCheckerEnabled(),
      trustDevCert: vscodeHelper.isTrustDevCertEnabled(),
    };
    return await core.localDebug(inputs!);
  }
  @hooks([CommonErrorHandlerMW()])
  async publish(args: any[], inputs?: Inputs): Promise<Result<Void, FxError>> {
    return await core.publishApplication(inputs!);
  }
  @hooks([CommonErrorHandlerMW()])
  async createEnv(args: any[], inputs?: Inputs): Promise<Result<Void, FxError>> {
    return await core.createEnv(inputs!);
  }
  @hooks([CommonErrorHandlerMW()])
  async activateEnv(args: any[], inputs?: Inputs): Promise<Result<Void, FxError>> {
    return await core.activateEnv(inputs!);
  }
  @hooks([CommonErrorHandlerMW()])
  async encrypt(args: any[], plaintext: string, inputs?: Inputs): Promise<Result<string, FxError>> {
    return await core.encrypt(plaintext, inputs!);
  }
  @hooks([CommonErrorHandlerMW()])
  async decrypt(
    args: any[],
    ciphertext: string,
    inputs?: Inputs
  ): Promise<Result<string, FxError>> {
    return await core.decrypt(ciphertext, inputs!);
  }
  @hooks([CommonErrorHandlerMW()])
  async grantPermission(args: any[], inputs?: Inputs): Promise<Result<any, FxError>> {
    return await core.grantPermission(inputs!);
  }
  @hooks([CommonErrorHandlerMW()])
  async checkPermission(args: any[], inputs?: Inputs): Promise<Result<any, FxError>> {
    return await core.checkPermission(inputs!);
  }
  @hooks([CommonErrorHandlerMW()])
  async listCollaborator(args: any[], inputs?: Inputs): Promise<Result<any, FxError>> {
    return await core.listCollaborator(inputs!);
  }
  @hooks([CommonErrorHandlerMW()])
  async addResource(args: any[], inputs?: Inputs): Promise<Result<any, FxError>> {
    const func: Func = {
      namespace: "fx-solution-azure",
      method: "addResource",
    };
    let excludeBackend = true;
    try {
      const localEnvManager = new LocalEnvManager(
        VsCodeLogInstance,
        ExtTelemetry.reporter,
        VS_CODE_UI
      );
      const projectSettings = await localEnvManager.getProjectSettings(ext.workspaceUri.fsPath);
      excludeBackend = ProjectSettingsHelper.includeBackend(projectSettings);
    } catch (error) {
      VsCodeLogInstance.warning(`${error}`);
    }
    inputs!.ignoreEnvInfo = true;
    const result = await core.executeUserTask(func, inputs!);
    if (result.isOk() && !excludeBackend) {
      await globalStateUpdate("automaticNpmInstall", true);
      automaticNpmInstallHandler(true, excludeBackend, true);
    }
    return result;
  }
  @hooks([CommonErrorHandlerMW()])
  async addCapability(args: any[], inputs?: Inputs): Promise<Result<any, FxError>> {
    const func: Func = {
      namespace: "fx-solution-azure",
      method: "addCapability",
    };
    let excludeFrontend = true,
      excludeBot = true;
    try {
      const localEnvManager = new LocalEnvManager(
        VsCodeLogInstance,
        ExtTelemetry.reporter,
        VS_CODE_UI
      );
      const projectSettings = await localEnvManager.getProjectSettings(ext.workspaceUri.fsPath);
      excludeFrontend = ProjectSettingsHelper.includeFrontend(projectSettings);
      excludeBot = ProjectSettingsHelper.includeBot(projectSettings);
    } catch (error) {
      VsCodeLogInstance.warning(`${error}`);
    }
    inputs!.ignoreEnvInfo = true;
    const result = await core.executeUserTask(func, inputs!);
    if (result.isOk()) {
      await globalStateUpdate("automaticNpmInstall", true);
      automaticNpmInstallHandler(excludeFrontend, true, excludeBot);
    }
    return result;
  }
  @hooks([CommonErrorHandlerMW()])
  async validateManifest(args: any[], inputs?: Inputs): Promise<Result<any, FxError>> {
    const func: Func = {
      namespace: "fx-solution-azure",
      method: "validateManifest",
    };
    return await core.executeUserTask(func, inputs!);
  }
  @hooks([CommonErrorHandlerMW()])
  async build(args: any[], inputs?: Inputs): Promise<Result<any, FxError>> {
    const func: Func = {
      namespace: "fx-solution-azure",
      method: "buildPackage",
      params: {
        type: "",
      },
    };
    if (args && args.length > 0 && args[0] != CommandsTreeViewProvider.TreeViewFlag) {
      func.params.type = args[0];
      const isLocalDebug = args[0] === "localDebug";
      if (isLocalDebug) {
        inputs!.ignoreEnvInfo = true;
        return await core.executeUserTask(func, inputs!);
      } else {
        inputs!.ignoreEnvInfo = false;
        inputs!.env = args[1];
        return await core.executeUserTask(func, inputs!);
      }
    } else {
      const selectedEnv = await askTargetEnvironment();
      if (selectedEnv.isErr()) {
        return err(selectedEnv.error);
      }
      const env = selectedEnv.value;
      const isLocalDebug = env === "local";
      if (isLocalDebug) {
        func.params.type = "localDebug";
        inputs!.ignoreEnvInfo = true;
        return await core.executeUserTask(func, inputs!);
      } else {
        func.params.type = "remote";
        inputs!.ignoreEnvInfo = false;
        inputs!.env = env;
        return await core.executeUserTask(func, inputs!);
      }
    }
  }
  @hooks([CommonErrorHandlerMW()])
  async openManifestEditor(args: any[], inputs?: Inputs): Promise<Result<any, FxError>> {
    const projectPath = getWorkspacePath();
    if (!projectPath) {
      return err(InvalidProjectError());
    }
    const appDirectory = await getAppDirectory(projectPath!);
    if (!(await fs.pathExists(appDirectory))) {
      const invalidProjectError: FxError = InvalidProjectError();
      return err(invalidProjectError);
    }
    const selectedEnv = await askTargetEnvironment();
    if (selectedEnv.isErr()) {
      return err(selectedEnv.error);
    }
    const env = selectedEnv.value;
    const func: Func = {
      namespace: "fx-solution-azure/fx-resource-appstudio",
      method: "getManifestTemplatePath",
      params: {
        type: env === "local" ? "localDebug" : "remote",
      },
    };
    inputs!.ignoreEnvInfo = true;
    const res = await core.executeUserTask(func, inputs!);
    if (res.isOk()) {
      const manifestFile = res.value as string;
      if (fs.existsSync(manifestFile)) {
        vscode.workspace.openTextDocument(manifestFile).then((document) => {
          vscode.window.showTextDocument(document);
        });
        return ok(null);
      } else {
        const FxError = new SystemError(
          "FileNotFound",
          util.format(StringResources.vsc.handlers.fileNotFound, manifestFile),
          ExtensionSource
        );
        return err(FxError);
      }
    } else {
      return err(res.error);
    }
  }
  @hooks([CommonErrorHandlerMW()])
  async updatePreviewManifest(args: any[], inputs?: Inputs): Promise<Result<any, FxError>> {
    let env: string | undefined;
    if (args && args.length > 0) {
      const segments = args[0].fsPath.split(".");
      env = segments[segments.length - 2];
    }

    if (env && env !== "local") {
      const inputs = getSystemInputs();
      inputs.env = env;
      await core.activateEnv(inputs);
    }
    const func: Func = {
      namespace: "fx-solution-azure/fx-resource-appstudio",
      method: "updateManifest",
      params: {
        envName: env,
      },
    };
    inputs!.ignoreEnvInfo = env && env === "local" ? true : false;
    inputs!.env = env;
    const result = await core.executeUserTask(func, inputs!);
    if (!args || args.length === 0) {
      const workspacePath = getWorkspacePath();
      const inputs = getSystemInputs();
      inputs.ignoreEnvInfo = true;
      const env = await core.getSelectedEnv(inputs);
      if (env.isErr()) {
        return err(env.error);
      }
      const manifestPath = `${workspacePath}/${BuildFolderName}/${AppPackageFolderName}/manifest.${env.value}.json`;
      vscode.workspace.openTextDocument(manifestPath).then((document) => {
        vscode.window.showTextDocument(document);
      });
    }
    return result;
  }
}
