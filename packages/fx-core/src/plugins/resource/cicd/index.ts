// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  err,
  UserError,
  SystemError,
  v2,
  TokenProvider,
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
import { Alias, LifecycleFuncNames, PluginCICD } from "./constants";
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
import { getLocalizedString } from "../../../common/localizeUtils";
import { isPureExistingApp } from "../../../common";
import { NoCapabilityFoundError } from "../../../core/error";

@Service(ResourcePluginsV2.CICDPlugin)
export class CICDPluginV2 implements ResourcePlugin {
  name = PluginCICD.PLUGIN_NAME;
  displayName = Alias.TEAMS_CICD_PLUGIN;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  activate(projectSettings: ProjectSettings): boolean {
    return true;
  }

  public cicdImpl: CICDImpl = new CICDImpl();

  public async addCICDWorkflows(
    context: Context,
    inputs: Inputs,
    envInfo: v2.EnvInfoV2
  ): Promise<FxResult> {
    Logger.setLogger(context.logProvider);
    return await this.cicdImpl.addCICDWorkflows(context, inputs, envInfo);
  }

  public async getQuestionsForUserTask(
    ctx: Context,
    inputs: Inputs,
    func: Func,
    envInfo: DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<FxResult> {
    // add CI CD workflows for minimal app is not supported.
    if (ctx.projectSetting && isPureExistingApp(ctx.projectSetting)) {
      throw new NoCapabilityFoundError("add CI CD workflows");
    }

    const cicdWorkflowQuestions = new QTreeNode({
      type: "group",
    });

    const whichProvider = new QTreeNode({
      name: questionNames.Provider,
      type: "singleSelect",
      staticOptions: [githubOption, azdoOption, jenkinsOption],
      title: getLocalizedString("plugins.cicd.whichProvider.title"),
      default: githubOption.id,
    });

    const whichTemplate = new QTreeNode({
      name: questionNames.Template,
      type: "multiSelect",
      staticOptions: [ciOption, cdOption, provisionOption, publishOption],
      title: getLocalizedString("plugins.cicd.whichTemplate.title"),
      default: [ciOption.id],
    });

    // TODO: add support for VS/.Net Projects.
    if (inputs.platform === Platform.VSCode) {
      if (!inputs.projectPath) {
        throw new NoProjectOpenedError();
      }

      const envProfilesResult = await environmentManager.listRemoteEnvConfigs(inputs.projectPath);
      if (envProfilesResult.isErr()) {
        throw new InternalError(
          getLocalizedString("error.cicd.FailedToListMultiEnv"),
          envProfilesResult.error
        );
      }

      const whichEnvironment: SingleSelectQuestion = {
        type: "singleSelect",
        name: questionNames.Environment,
        title: getLocalizedString("plugins.cicd.whichEnvironment.title"),
        staticOptions: [],
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
  ): Promise<FxResult> {
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
      sendTelemetry &&
        telemetryHelper.sendStartEvent(context, envInfo, name, this.cicdImpl.commonProperties);
      const res: FxResult = await fn();
      sendTelemetry &&
        telemetryHelper.sendResultEvent(
          context,
          envInfo,
          name,
          res,
          this.cicdImpl.commonProperties
        );
      return res;
    } catch (e) {
      if (e instanceof UserError || e instanceof SystemError) {
        const res = err(e);
        sendTelemetry &&
          telemetryHelper.sendResultEvent(
            context,
            envInfo,
            name,
            res,
            this.cicdImpl.commonProperties
          );
        return res;
      }

      if (e instanceof PluginError) {
        const result =
          e.errorType === ErrorType.System
            ? ResultFactory.SystemError(e.name, e.genMessage(), e.innerError)
            : ResultFactory.UserError(e.name, e.genMessage(), e.showHelpLink, e.innerError);
        sendTelemetry &&
          telemetryHelper.sendResultEvent(
            context,
            envInfo,
            name,
            result,
            this.cicdImpl.commonProperties
          );
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
              getLocalizedString("plugins.bot.UnhandledError", e.message),
              e.innerError
            ),
            this.cicdImpl.commonProperties
          );
        return ResultFactory.SystemError(UnhandledErrorCode, e.message, e);
      }
    }
  }
}

export default new CICDPluginV2();
