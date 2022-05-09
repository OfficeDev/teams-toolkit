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
  Stage,
  StaticOptions,
  MultiSelectQuestion,
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
import { isExistingTabApp } from "../../../common";
import { NoCapabilityFoundError } from "../../../core/error";
import { ExistingTemplatesStat } from "./utils/existingTemplatesStat";

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
    if (inputs.platform !== Platform.CLI_HELP && isExistingTabApp(ctx.projectSetting)) {
      throw new NoCapabilityFoundError(Stage.addCiCdFlow);
    }

    const cicdWorkflowQuestions = new QTreeNode({
      type: "group",
    });

    const whichProvider: SingleSelectQuestion = {
      name: questionNames.Provider,
      type: "singleSelect",
      staticOptions: [githubOption, azdoOption, jenkinsOption],
      title: getLocalizedString("plugins.cicd.whichProvider.title"),
      default: githubOption.id,
    };

    const whichTemplate: MultiSelectQuestion = {
      name: questionNames.Template,
      type: "multiSelect",
      staticOptions: [ciOption, cdOption, provisionOption, publishOption],
      title: getLocalizedString("plugins.cicd.whichTemplate.title"),
      default: [ciOption.id],
    };

    // TODO: add support for VS/.Net Projects.
    if (inputs.platform === Platform.VSCode) {
      if (!inputs.projectPath) {
        throw new NoProjectOpenedError();
      }

      const envProfilesResult = await environmentManager.listRemoteEnvConfigs(inputs.projectPath);
      if (envProfilesResult.isErr()) {
        throw new InternalError(
          ["Failed to list multi env.", "Failed to list multi env."],
          envProfilesResult.error
        );
      }

      const existingInstance = await ExistingTemplatesStat.getInstance(
        inputs.projectPath!,
        envProfilesResult.value
      );
      const whichEnvironment: SingleSelectQuestion = {
        type: "singleSelect",
        name: questionNames.Environment,
        title: getLocalizedString("plugins.cicd.whichEnvironment.title"),
        staticOptions: [],
        dynamicOptions: (inputs: Inputs): StaticOptions => {
          // Remove the env items in which all combinations of templates are scaffolded/existing.
          return envProfilesResult.value.filter((envName: string) => {
            return (
              existingInstance.existence.has(envName) && !existingInstance.existence.get(envName)
            );
          });
        },
        skipSingleOption: true,
      };

      whichProvider.dynamicOptions = (inputs: Inputs): StaticOptions => {
        const envName = inputs[questionNames.Environment];
        return [githubOption.id, azdoOption.id, jenkinsOption.id].filter((provider) => {
          const key = ExistingTemplatesStat.genKey(envName, provider);
          return existingInstance.existence.has(key) && !existingInstance.existence.get(key);
        });
      };

      whichTemplate.dynamicOptions = (inputs: Inputs): StaticOptions => {
        const envName = inputs[questionNames.Environment];
        const provider = inputs[questionNames.Provider];
        return [ciOption.id, provisionOption.id, cdOption.id, publishOption.id].filter(
          (template) => {
            const key = ExistingTemplatesStat.genKey(envName, provider, template);
            return existingInstance.existence.has(key) && !existingInstance.existence.get(key);
          }
        );
      };

      // Link question nodes as a tree.
      const whichProviderNode = new QTreeNode(whichProvider);
      whichProviderNode.addChild(new QTreeNode(whichTemplate));
      const whichEnvironmentNode = new QTreeNode(whichEnvironment);
      whichEnvironmentNode.addChild(whichProviderNode);

      cicdWorkflowQuestions.addChild(whichEnvironmentNode);
    } else {
      // For inputs.platform === CLI or CLI_HELP
      cicdWorkflowQuestions.addChild(new QTreeNode(whichProvider));
      cicdWorkflowQuestions.addChild(new QTreeNode(whichTemplate));
    }

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
            ? ResultFactory.SystemError(
                e.name,
                [e.genDefaultMessage(), e.genMessage()],
                e.innerError
              )
            : ResultFactory.UserError(
                e.name,
                [e.genDefaultMessage(), e.genMessage()],
                e.showHelpLink,
                e.innerError
              );
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
              [`Got an unhandled error: ${e.message}`, `Got an unhandled error: ${e.message}`],
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
