// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  err,
  UserError,
  SystemError,
  v2,
  TokenProvider,
  FxError,
  Result,
  Inputs,
  Json,
  Func,
  ok,
  QTreeNode,
  ProjectSettings,
  SingleSelectQuestion,
  Platform,
} from "@microsoft/teamsfx-api";

import { FxResult, FxCICDPluginResultFactory as ResultFactory } from "./result";
import { CICDImpl } from "./plugin";
import { ErrorType, InternalError, NoProjectOpenedError, PluginError } from "./errors";
import { LifecycleFuncNames } from "./constants";
import { Service } from "typedi";
import { ResourcePluginsV2 } from "../../solution/fx-solution/ResourcePluginContainer";
import { ResourcePlugin, Context, DeepReadonly } from "@microsoft/teamsfx-api/build/v2";
import {
  githubOption,
  azdoOption,
  jenkinsOption,
  ciOption,
  cdOption,
  provisionOption,
  publishOption,
  questionNames,
} from "./questions";
import { Logger } from "./logger";
import { environmentManager } from "../../../core/environment";
import { telemetryHelper } from "./utils/telemetry-helper";

@Service(ResourcePluginsV2.CICDPlugin)
export class CICDPluginV2 implements ResourcePlugin {
  name = "fx-resource-cicd";
  displayName = "CICD";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  activate(projectSettings: ProjectSettings): boolean {
    return true;
  }

  public cicdImpl: CICDImpl = new CICDImpl();

  public async addCICDWorkflows(
    context: Context,
    inputs: Inputs,
    envInfo: v2.EnvInfoV2
  ): Promise<Result<any, FxError>> {
    Logger.setLogger(context.logProvider);
    return await this.cicdImpl.addCICDWorkflows(context, inputs, envInfo);
  }

  public async getQuestionsForUserTask(
    ctx: Context,
    inputs: Inputs,
    func: Func,
    envInfo: DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const cicdWorkflowQuestions = new QTreeNode({
      type: "group",
    });

    const whichProvider = new QTreeNode({
      name: questionNames.Provider,
      type: "singleSelect",
      staticOptions: [githubOption, azdoOption, jenkinsOption],
      title: "Select a CI/CD Provider",
      default: githubOption.id,
    });

    const whichTemplate = new QTreeNode({
      name: questionNames.Template,
      type: "multiSelect",
      staticOptions: [ciOption, cdOption, provisionOption, publishOption],
      title: "Select template(s)",
      default: [ciOption.id],
    });

    if (inputs.platform === Platform.VSCode) {
      if (!inputs.projectPath) {
        throw new NoProjectOpenedError();
      }

      const envProfilesResult = await environmentManager.listRemoteEnvConfigs(inputs.projectPath);
      if (envProfilesResult.isErr()) {
        throw new InternalError("Failed to list multi env.", envProfilesResult.error);
      }

      const whichEnvironment: SingleSelectQuestion = {
        type: "singleSelect",
        name: questionNames.Environment,
        title: "Select an environment",
        staticOptions: [],
        skipSingleOption: false,
      };
      whichEnvironment.staticOptions = envProfilesResult.value;
      cicdWorkflowQuestions.addChild(new QTreeNode(whichEnvironment));
    }

    cicdWorkflowQuestions.addChild(whichProvider);
    cicdWorkflowQuestions.addChild(whichTemplate);

    return ok(cicdWorkflowQuestions);
  }

  public async executeUserTask(
    ctx: Context,
    inputs: Inputs,
    func: Func,
    localSettings: Json,
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ): Promise<Result<any, FxError>> {
    if (func.method === "addCICDWorkflows") {
      return await this.runWithExceptionCatching(
        ctx,
        envInfo,
        () => this.addCICDWorkflows(ctx, inputs, envInfo),
        true,
        LifecycleFuncNames.ADD_CICD_WORKFLOWS
      );
    }
    return ok(undefined);
  }

  private async runWithExceptionCatching(
    context: Context,
    envInfo: v2.EnvInfoV2,
    fn: () => Promise<FxResult>,
    sendTelemetry: boolean,
    name: string
  ): Promise<FxResult> {
    try {
      sendTelemetry && telemetryHelper.sendStartEvent(context, envInfo, name);
      const res: FxResult = await fn();
      sendTelemetry && telemetryHelper.sendResultEvent(context, envInfo, name, res);
      return res;
    } catch (e) {
      if (e instanceof UserError || e instanceof SystemError) {
        const res = err(e);
        sendTelemetry && telemetryHelper.sendResultEvent(context, envInfo, name, res);
        return res;
      }

      if (e instanceof PluginError) {
        const result =
          e.errorType === ErrorType.System
            ? ResultFactory.SystemError(e.name, e.genMessage(), e.innerError)
            : ResultFactory.UserError(e.name, e.genMessage(), e.showHelpLink, e.innerError);
        sendTelemetry && telemetryHelper.sendResultEvent(context, envInfo, name, result);
        return result;
      } else {
        // Unrecognized Exception.
        const UnhandledErrorCode = "UnhandledError";
        sendTelemetry &&
          telemetryHelper.sendResultEvent(
            context,
            envInfo,
            name,
            ResultFactory.SystemError(
              UnhandledErrorCode,
              `Got an unhandled error: ${e.message}`,
              e.innerError
            )
          );
        return ResultFactory.SystemError(UnhandledErrorCode, e.message, e);
      }
    }
  }
}

export default new CICDPluginV2();
