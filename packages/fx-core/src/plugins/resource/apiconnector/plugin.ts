// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import * as path from "path";
import * as fs from "fs-extra";
import { Inputs, QTreeNode } from "@microsoft/teamsfx-api";
import { Context } from "@microsoft/teamsfx-api/build/v2";
import { ApiConnectorConfiguration, generateTempFolder, copyFileIfExist } from "./utils";
import { Constants } from "./constants";
import { ApiConnectorResult, ResultFactory } from "./result";
import { EnvHandler } from "./envHandler";
import { ErrorMessage } from "./errors";
import { ResourcePlugins } from "../../../common/constants";
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
  ImplementMyselfOption,
} from "./questions";
import { getLocalizedString } from "../../../common/localizeUtils";
import { SampleHandler } from "./sampleHandler";
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
    config.ComponentPath.forEach(async (compoenent) => {
      await this.backupExistingFiles(path.join(projectPath, compoenent), backupFolderName);
    });

    try {
      config.ComponentPath.forEach(async (componentItem) => {
        await this.scaffoldInComponent(projectPath, componentItem, config, languageType);
      });
    } catch (err) {
      config.ComponentPath.forEach(async (component) => {
        await fs.move(
          path.join(projectPath, component, backupFolderName),
          path.join(projectPath, component),
          {
            overwrite: true,
          }
        );
      });
      throw ResultFactory.SystemError(
        ErrorMessage.generateApiConFilesError.name,
        ErrorMessage.generateApiConFilesError.message(err.message)
      );
    } finally {
      config.ComponentPath.forEach(async (component) => {
        if (await fs.pathExists(path.join(projectPath, component, backupFolderName))) {
          await fs.remove(path.join(path.join(projectPath, component, backupFolderName)));
        }
      });
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

  private getUserDataFromInputs(inputs: Inputs): ApiConnectorConfiguration {
    const config: ApiConnectorConfiguration = {
      ComponentPath: inputs[Constants.questionKey.componentsSelect],
      APIName: inputs[Constants.questionKey.apiName],
      ApiAuthType: inputs[Constants.questionKey.apiType],
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

  public generateQuestion(activePlugins: string[]): QTreeNode {
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
    });
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
    });
    const question = new QTreeNode({
      type: "group",
    });
    question.addChild(whichComponent);
    question.addChild(new QTreeNode(apiNameQuestion));
    question.addChild(whichAuthType);
    question.addChild(new QTreeNode(apiEndpointQuestion));
    question.addChild(new QTreeNode(apiLoginUserNameQuestion));

    return question;
  }
}
