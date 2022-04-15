// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import * as path from "path";
import * as fs from "fs-extra";
import {
  AzureSolutionSettings,
  Inputs,
  QTreeNode,
  SystemError,
  UserError,
  ok,
  Platform,
} from "@microsoft/teamsfx-api";
import { Context } from "@microsoft/teamsfx-api/build/v2";
import {
  generateTempFolder,
  copyFileIfExist,
  removeFileIfExist,
  getSampleFileName,
  checkInputEmpty,
  Notification,
} from "./utils";
import {
  ApiConnectorConfiguration,
  AuthConfig,
  BasicAuthConfig,
  AADAuthConfig,
  APIKeyAuthConfig,
} from "./config";
import { ApiConnectorResult, ResultFactory, QesutionResult } from "./result";
import { AuthType, Constants, KeyLocation } from "./constants";
import { EnvHandler } from "./envHandler";
import { ErrorMessage } from "./errors";
import { ResourcePlugins } from "../../../common/constants";
import {
  ApiNameQuestion,
  basicAuthUsernameQuestion,
  botOption,
  functionOption,
  apiEndpointQuestion,
  BasicAuthOption,
  CertAuthOption,
  AADAuthOption,
  APIKeyAuthOption,
  ImplementMyselfOption,
  reuseAppOption,
  anotherAppOption,
  appTenantIdQuestion,
  appIdQuestion,
  requestHeaderOption,
  queryParamsOption,
  buildAPIKeyNameQuestion,
} from "./questions";
import { getLocalizedString } from "../../../common/localizeUtils";
import { SampleHandler } from "./sampleHandler";
import { isAADEnabled } from "../../../common";
import { getAzureSolutionSettings } from "../../solution/fx-solution/v2/utils";
import { DepsHandler } from "./depsHandler";
import { checkEmptySelect } from "./checker";
export class ApiConnectorImpl {
  public async scaffold(ctx: Context, inputs: Inputs): Promise<ApiConnectorResult> {
    if (!inputs.projectPath) {
      throw ResultFactory.UserError(
        ErrorMessage.InvalidProjectError.name,
        ErrorMessage.InvalidProjectError.message()
      );
    }
    const projectPath = inputs.projectPath;
    const languageType: string = ctx.projectSetting!.programmingLanguage!;
    const config: ApiConnectorConfiguration = this.getUserDataFromInputs(inputs);
    // backup relative files.
    const backupFolderName = generateTempFolder();
    await Promise.all(
      config.ComponentPath.map(async (component) => {
        await this.backupExistingFiles(path.join(projectPath, component), backupFolderName);
      })
    );

    try {
      await Promise.all(
        config.ComponentPath.map(async (component) => {
          await this.scaffoldInComponent(projectPath, component, config, languageType);
        })
      );
      const msg: string = Notification.getNotificationMsg(config, languageType);
      if (inputs.platform != Platform.CLI) {
        ctx.userInteraction
          ?.showMessage("info", msg, false, "OK", Notification.READ_MORE)
          .then((result) => {
            const userSelected = result.isOk() ? result.value : undefined;
            if (userSelected === Notification.READ_MORE) {
              ctx.userInteraction?.openUrl(Notification.READ_MORE_URL);
            }
          });
      } else {
        ctx.userInteraction.showMessage(
          "info",
          msg + ` ${Notification.GetLinkNotification()}`,
          false
        );
      }
    } catch (err) {
      await Promise.all(
        config.ComponentPath.map(async (component) => {
          await fs.copy(
            path.join(projectPath, component, backupFolderName),
            path.join(projectPath, component),
            { overwrite: true }
          );
          await this.removeSampleFilesWhenRestore(
            projectPath,
            component,
            config.APIName,
            languageType
          );
        })
      );
      if (err instanceof SystemError || err instanceof UserError) {
        throw err;
      } else {
        throw ResultFactory.SystemError(
          ErrorMessage.generateApiConFilesError.name,
          ErrorMessage.generateApiConFilesError.message(err.message)
        );
      }
    } finally {
      await Promise.all(
        config.ComponentPath.map(async (component) => {
          await removeFileIfExist(path.join(projectPath, component, backupFolderName));
        })
      );
    }
    return ResultFactory.Success();
  }

  private async scaffoldInComponent(
    projectPath: string,
    componentItem: string,
    config: ApiConnectorConfiguration,
    languageType: string
  ) {
    await this.scaffoldEnvFileToComponent(projectPath, config, componentItem);
    await this.scaffoldSampleCodeToComponent(projectPath, config, componentItem, languageType);
    await this.addSDKDependency(projectPath, componentItem);
  }

  private async backupExistingFiles(folderPath: string, backupFolder: string) {
    await fs.ensureDir(path.join(folderPath, backupFolder));
    await copyFileIfExist(
      path.join(folderPath, Constants.envFileName),
      path.join(folderPath, backupFolder, Constants.envFileName)
    );
    await copyFileIfExist(
      path.join(folderPath, Constants.pkgJsonFile),
      path.join(folderPath, backupFolder, Constants.pkgJsonFile)
    );
    await copyFileIfExist(
      path.join(folderPath, Constants.pkgLockFile),
      path.join(folderPath, backupFolder, Constants.pkgLockFile)
    );
  }

  private async removeSampleFilesWhenRestore(
    projectPath: string,
    component: string,
    apiName: string,
    languageType: string
  ) {
    const apiFileName = getSampleFileName(apiName, languageType);
    const sampleFilePath = path.join(projectPath, component, apiFileName);
    await removeFileIfExist(sampleFilePath);
  }

  private getAuthConfigFromInputs(inputs: Inputs): AuthConfig {
    let config: AuthConfig;
    const apiType = inputs[Constants.questionKey.apiType];
    switch (apiType) {
      case AuthType.BASIC:
        checkInputEmpty(inputs, Constants.questionKey.apiUserName);
        config = {
          AuthType: AuthType.BASIC,
          UserName: inputs[Constants.questionKey.apiUserName],
        } as BasicAuthConfig;
        break;
      case AuthType.AAD:
        const AADConfig = {
          AuthType: AuthType.AAD,
        } as AADAuthConfig;
        if (inputs[Constants.questionKey.apiAppType] === reuseAppOption.id) {
          AADConfig.ReuseTeamsApp = true;
        } else {
          AADConfig.ReuseTeamsApp = false;
          checkInputEmpty(
            inputs,
            Constants.questionKey.apiAppTenentId,
            Constants.questionKey.apiAppTenentId
          );
          AADConfig.TenantId = inputs[Constants.questionKey.apiAppTenentId];
          AADConfig.ClientId = inputs[Constants.questionKey.apiAppId];
        }
        config = AADConfig;
        break;
      case AuthType.APIKEY:
        const APIKeyConfig = {
          AuthType: AuthType.APIKEY,
        } as APIKeyAuthConfig;
        if (inputs[Constants.questionKey.apiAPIKeyLocation] === requestHeaderOption.id) {
          APIKeyConfig.Location = KeyLocation.Header;
        } else {
          APIKeyConfig.Location = KeyLocation.QueryParams;
        }
        checkInputEmpty(inputs, Constants.questionKey.apiAPIKeyName);
        APIKeyConfig.Name = inputs[Constants.questionKey.apiAPIKeyName];
        config = APIKeyConfig;
        break;
      case AuthType.CUSTOM:
      case AuthType.CERT:
        config = {
          AuthType: apiType,
        };
        break;
      default:
        throw ResultFactory.SystemError(
          ErrorMessage.ApiConnectorInputError.name,
          ErrorMessage.ApiConnectorInputError.message(inputs[Constants.questionKey.apiAppType])
        );
    }
    return config;
  }

  private getUserDataFromInputs(inputs: Inputs): ApiConnectorConfiguration {
    checkInputEmpty(
      inputs,
      Constants.questionKey.componentsSelect,
      Constants.questionKey.apiName,
      Constants.questionKey.endpoint
    );
    const authConfig = this.getAuthConfigFromInputs(inputs);
    const config: ApiConnectorConfiguration = {
      ComponentPath: inputs[Constants.questionKey.componentsSelect],
      APIName: inputs[Constants.questionKey.apiName],
      AuthConfig: authConfig,
      EndPoint: inputs[Constants.questionKey.endpoint],
    };
    return config;
  }

  private async scaffoldEnvFileToComponent(
    projectPath: string,
    config: ApiConnectorConfiguration,
    component: string
  ): Promise<ApiConnectorResult> {
    const envHander = new EnvHandler(projectPath, component);
    envHander.updateEnvs(config);
    await envHander.saveLocalEnvFile();
    return ResultFactory.Success();
  }

  private async scaffoldSampleCodeToComponent(
    projectPath: string,
    config: ApiConnectorConfiguration,
    component: string,
    languageType: string
  ): Promise<ApiConnectorResult> {
    const sampleHandler = new SampleHandler(projectPath, languageType, component);
    await sampleHandler.generateSampleCode(config);
    return ResultFactory.Success();
  }

  private async addSDKDependency(
    projectPath: string,
    component: string
  ): Promise<ApiConnectorResult> {
    const depsHandler: DepsHandler = new DepsHandler(projectPath, component);
    return await depsHandler.addPkgDeps();
  }

  public async generateQuestion(ctx: Context, inputs: Inputs): Promise<QesutionResult> {
    const componentOptions = [];
    if (inputs.platform === Platform.CLI_HELP) {
      componentOptions.push(botOption);
      componentOptions.push(functionOption);
    } else {
      const activePlugins = (ctx.projectSetting.solutionSettings as AzureSolutionSettings)
        ?.activeResourcePlugins;
      if (!activePlugins) {
        throw ResultFactory.UserError(
          ErrorMessage.NoActivePluginsExistError.name,
          ErrorMessage.NoActivePluginsExistError.message()
        );
      }
      if (activePlugins.includes(ResourcePlugins.Bot)) {
        componentOptions.push(botOption);
      }
      if (activePlugins.includes(ResourcePlugins.Function)) {
        componentOptions.push(functionOption);
      }
      if (componentOptions.length === 0) {
        throw ResultFactory.UserError(
          ErrorMessage.NoValidCompoentExistError.name,
          ErrorMessage.NoValidCompoentExistError.message()
        );
      }
    }
    const whichComponent = new QTreeNode({
      name: Constants.questionKey.componentsSelect,
      type: "multiSelect",
      staticOptions: componentOptions,
      title: getLocalizedString("plugins.apiConnector.whichService.title"),
      validation: {
        validFunc: checkEmptySelect,
      },
      placeholder: getLocalizedString("plugins.apiConnector.whichService.placeholder"), // Use the placeholder to display some description
    });
    const apiNameQuestion = new ApiNameQuestion(ctx);
    const whichAuthType = this.buildAuthTypeQuestion(ctx, inputs);
    const question = new QTreeNode({
      type: "group",
    });
    question.addChild(new QTreeNode(apiEndpointQuestion));
    question.addChild(whichComponent);
    question.addChild(new QTreeNode(apiNameQuestion.getQuestion()));
    question.addChild(whichAuthType);

    return ok(question);
  }

  public buildAuthTypeQuestion(ctx: Context, inputs: Inputs): QTreeNode {
    const whichAuthType = new QTreeNode({
      name: Constants.questionKey.apiType,
      type: "singleSelect",
      staticOptions: [
        BasicAuthOption,
        CertAuthOption,
        AADAuthOption,
        APIKeyAuthOption,
        ImplementMyselfOption,
      ],
      title: getLocalizedString("plugins.apiConnector.whichAuthType.title"),
      placeholder: getLocalizedString("plugins.apiConnector.whichAuthType.placeholder"), // Use the placeholder to display some description
    });
    whichAuthType.addChild(this.buildAADAuthQuestion(ctx, inputs));
    whichAuthType.addChild(this.buildBasicAuthQuestion());
    whichAuthType.addChild(this.buildAPIKeyAuthQuestion());
    return whichAuthType;
  }

  public buildBasicAuthQuestion(): QTreeNode {
    const node = new QTreeNode(basicAuthUsernameQuestion);
    node.condition = { equals: BasicAuthOption.id };
    return node;
  }

  public buildAADAuthQuestion(ctx: Context, inputs: Inputs): QTreeNode {
    const options = [anotherAppOption];
    const solutionSettings = getAzureSolutionSettings(ctx)!;
    if (isAADEnabled(solutionSettings) || inputs.platform === Platform.CLI_HELP) {
      options.unshift(reuseAppOption);
    }
    const node = new QTreeNode({
      name: Constants.questionKey.apiAppType,
      type: "singleSelect",
      staticOptions: options,
      title: getLocalizedString("plugins.apiConnector.getQuestion.appType.title"),
    });
    node.condition = { equals: AADAuthOption.id };
    const tenentQuestionNode = new QTreeNode(appTenantIdQuestion);
    tenentQuestionNode.condition = { equals: anotherAppOption.id };
    tenentQuestionNode.addChild(new QTreeNode(appIdQuestion));
    node.addChild(tenentQuestionNode);
    return node;
  }

  public buildAPIKeyAuthQuestion(): QTreeNode {
    const node = new QTreeNode({
      name: Constants.questionKey.apiAPIKeyLocation,
      type: "singleSelect",
      staticOptions: [requestHeaderOption, queryParamsOption],
      title: getLocalizedString("plugins.apiConnector.getQuestion.apiKeyLocation.title"),
    });
    node.condition = { equals: APIKeyAuthOption.id };

    const headerKeyNameQuestionNode = new QTreeNode(
      buildAPIKeyNameQuestion(getLocalizedString("plugins.apiConnector.requestHeaderOption.title"))
    );
    headerKeyNameQuestionNode.condition = { equals: requestHeaderOption.id };

    const queryKeyNameQuestionNode = new QTreeNode(
      buildAPIKeyNameQuestion(getLocalizedString("plugins.apiConnector.queryParamsOption.title"))
    );
    queryKeyNameQuestionNode.condition = { equals: queryParamsOption.id };

    node.addChild(headerKeyNameQuestionNode);
    node.addChild(queryKeyNameQuestionNode);
    return node;
  }
}
