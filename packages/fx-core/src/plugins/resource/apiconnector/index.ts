// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import {
  AzureSolutionSettings,
  Inputs,
  Json,
  ProjectSettings,
  SystemError,
  v2,
  err,
  Func,
  ok,
  TokenProvider,
  QTreeNode,
} from "@microsoft/teamsfx-api";
import { Context, ResourcePlugin } from "@microsoft/teamsfx-api/build/v2";
import { Service } from "typedi";
import { ResourcePluginsV2 } from "../../solution/fx-solution/ResourcePluginContainer";
import { ApiConnectorImpl } from "./plugin";
import { Constants } from "./constants";
import { DeepReadonly } from "@microsoft/teamsfx-api/build/v2";
import {
  apiNameQuestion,
  apiLoginUserNameQuestion,
  botOption,
  functionOption,
  apiEndpointQuestion,
  BasicAuthOption,
  CertAuthOption,
  AADAuthOption,
  APIKeyAuthOption,
  OtherAuthOPtion,
} from "./questions";
import { ApiConnectorResult, ResultFactory } from "./result";
import { getLocalizedString } from "../../../common/localizeUtils";
import { ResourcePlugins } from "../../../common/constants";
@Service(ResourcePluginsV2.ApiConnectorPlugin)
export class ApiConnectorPluginV2 implements ResourcePlugin {
  name = "fx-resource-api-connector";
  displayName = "Microsoft Api Connector";
  apiConnectorImpl: ApiConnectorImpl = new ApiConnectorImpl();

  activate(projectSettings: ProjectSettings): boolean {
    return true;
  }

  public async getQuestionsForUserTask(
    ctx: Context,
    inputs: Inputs,
    func: Func,
    envInfo: DeepReadonly<v2.EnvInfoV2>,
    tokenProvider: TokenProvider
  ): Promise<ApiConnectorResult> {
    const activeResourcePlugins = (ctx.projectSetting.solutionSettings as AzureSolutionSettings)
      ?.activeResourcePlugins;
    if (!activeResourcePlugins) {
      throw ResultFactory.UserError("no plugins", "no plugins");
    }
    const options = [];
    if (activeResourcePlugins.includes(ResourcePlugins.Bot)) {
      options.push(botOption);
    }
    if (activeResourcePlugins.includes(ResourcePlugins.Function)) {
      options.push(functionOption);
    }
    if (options.length === 0) {
      throw ResultFactory.UserError("no bot plugin or func plugin", "no bot plugin or func plugin");
    }
    const whichService = new QTreeNode({
      name: Constants.questionKey.serviceSelect,
      type: "singleSelect",
      staticOptions: options,
      title: getLocalizedString("plugins.apiConnector.whichService.title"),
      default: options[0].id,
    });
    const whichAuthType = new QTreeNode({
      name: Constants.questionKey.apiType,
      type: "singleSelect",
      staticOptions: [
        BasicAuthOption,
        CertAuthOption,
        AADAuthOption,
        APIKeyAuthOption,
        OtherAuthOPtion,
      ],
      title: getLocalizedString("plugins.apiConnector.whichAuthType.title"),
      default: BasicAuthOption.id,
    });
    const question = new QTreeNode({
      type: "group",
    });
    question.addChild(whichService);
    question.addChild(new QTreeNode(apiNameQuestion));
    question.addChild(whichAuthType);
    question.addChild(new QTreeNode(apiEndpointQuestion));
    question.addChild(new QTreeNode(apiLoginUserNameQuestion));

    return ok(question);
  }

  async executeUserTask(
    ctx: Context,
    inputs: Inputs,
    func: Func,
    localSettings: Json,
    envInfo: v2.EnvInfoV2,
    tokenProvider: TokenProvider
  ): Promise<ApiConnectorResult> {
    if (func.method != "addApiConnector") {
      return err(
        new SystemError(
          Constants.PLUGIN_NAME,
          "FunctionRouterError",
          `Failed to route function call:${JSON.stringify(func)}`
        )
      );
    }
    await this.apiConnectorImpl.scaffold(ctx, inputs);
    return ResultFactory.Success();
  }
}
