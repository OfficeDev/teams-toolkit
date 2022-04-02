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
} from "@microsoft/teamsfx-api";
import { Context, ResourcePlugin } from "@microsoft/teamsfx-api/build/v2";
import {
  ApiConnectorConfiguration,
  generateTempFolder,
  copyFileIfExist,
  removeFileIfExist,
  getSampleFileName,
  AuthConfig,
  BasicAuthConfig,
  AADAuthConfig,
} from "./utils";
import { ApiConnectorResult, ResultFactory, QesutionResult } from "./result";
import { AuthType, Constants } from "./constants";
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
  basicAuthPassword,
  reuseAppOption,
  anotherAppOption,
  appTenantIdQuestion,
  appIdQuestion,
} from "./questions";
import { getLocalizedString } from "../../../common/localizeUtils";
import { SampleHandler } from "./sampleHandler";
import { isAADEnabled } from "../../../common";
import { getAzureSolutionSettings } from "../../solution/fx-solution/v2/utils";
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
    // await this.addSDKDependency(ComponentPath);
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
    if (inputs[Constants.questionKey.apiType] === AuthType.BASIC) {
      config = {
        AuthType: AuthType.BASIC,
        UserName: inputs[Constants.questionKey.apiUserName],
        Password: inputs[Constants.questionKey.apiPassword],
      } as BasicAuthConfig;
    } else if (inputs[Constants.questionKey.apiType] === AuthType.AAD) {
      const AADConfig = {
        AuthType: AuthType.AAD,
      } as AADAuthConfig;
      if (inputs[Constants.questionKey.apiAppType] === reuseAppOption.id) {
        AADConfig.ReuseTeamsApp = true;
      } else {
        AADConfig.ReuseTeamsApp = false;
        AADConfig.TenantId = inputs[Constants.questionKey.apiAppTenentId];
        AADConfig.AppId = inputs[Constants.questionKey.apiAppId];
      }
      config = AADConfig;
    } else {
      throw new Error("todo");
    }
    return config;
  }

  private getUserDataFromInputs(inputs: Inputs): ApiConnectorConfiguration {
    const authConfig = this.getAuthConfigFromInputs(inputs);
    const config: ApiConnectorConfiguration = {
      ComponentPath: inputs[Constants.questionKey.componentsSelect],
      APIName: inputs[Constants.questionKey.apiName],
      AuthConfig: authConfig,
      EndPoint: inputs[Constants.questionKey.endpoint],
      ApiUserName: inputs[Constants.questionKey.apiUserName],
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

  public async generateQuestion(ctx: Context): Promise<QesutionResult> {
    const activePlugins = (ctx.projectSetting.solutionSettings as AzureSolutionSettings)
      ?.activeResourcePlugins;
    if (!activePlugins) {
      throw ResultFactory.UserError(
        ErrorMessage.NoActivePluginsExistError.name,
        ErrorMessage.NoActivePluginsExistError.message()
      );
    }
    const options = [];
    if (activePlugins.includes(ResourcePlugins.Bot)) {
      options.push(botOption);
    }
    if (activePlugins.includes(ResourcePlugins.Function)) {
      options.push(functionOption);
    }
    if (options.length === 0) {
      throw ResultFactory.UserError(
        ErrorMessage.NoValidCompoentExistError.name,
        ErrorMessage.NoValidCompoentExistError.message()
      );
    }
    const whichComponent = new QTreeNode({
      name: Constants.questionKey.componentsSelect,
      type: "multiSelect",
      staticOptions: options,
      title: getLocalizedString("plugins.apiConnector.whichService.title"),
      validation: {
        validFunc: async (input: string[]): Promise<string | undefined> => {
          const name = input as string[];
          if (name.length === 0) {
            return getLocalizedString(
              "plugins.apiConnector.questionComponentSelect.emptySelection"
            );
          }
          return undefined;
        },
      },
      placeholder: getLocalizedString("plugins.apiConnector.whichService.placeholder"), // Use the placeholder to display some description
    });
    const apiNameQuestion = new ApiNameQuestion(ctx);
    const whichAuthType = this.buildAuthTypeQuestion(ctx);
    const question = new QTreeNode({
      type: "group",
    });
    question.addChild(new QTreeNode(apiEndpointQuestion));
    question.addChild(whichComponent);
    question.addChild(new QTreeNode(apiNameQuestion.getQuestion()));
    question.addChild(whichAuthType);

    return ok(question);
  }

  public buildAuthTypeQuestion(ctx: Context): QTreeNode {
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
    whichAuthType.addChild(this.buildAADAuthQuestion(ctx));
    whichAuthType.addChild(this.buildBasicAuthQuestion());
    return whichAuthType;
  }

  public buildBasicAuthQuestion(): QTreeNode {
    const node = new QTreeNode(basicAuthUsernameQuestion);
    node.condition = { equals: BasicAuthOption.id };
    node.addChild(new QTreeNode(basicAuthPassword));
    return node;
  }

  public buildAADAuthQuestion(ctx: Context): QTreeNode {
    let node: QTreeNode;
    const solutionSettings = getAzureSolutionSettings(ctx)!;
    if (isAADEnabled(solutionSettings)) {
      node = new QTreeNode({
        name: Constants.questionKey.apiAppType,
        type: "singleSelect",
        staticOptions: [reuseAppOption, anotherAppOption],
        title: getLocalizedString("plugins.apiConnector.getQuestion.appType.title"),
      });
      node.condition = { equals: AADAuthOption.id };
      const tenentQuestionNode = new QTreeNode(appTenantIdQuestion);
      tenentQuestionNode.condition = { equals: anotherAppOption.id };
      tenentQuestionNode.addChild(new QTreeNode(appIdQuestion));
      node.addChild(tenentQuestionNode);
    } else {
      node = new QTreeNode(appTenantIdQuestion);
      node.condition = { equals: AADAuthOption.id };
      node.addChild(new QTreeNode(appIdQuestion));
    }
    return node;
  }
}
