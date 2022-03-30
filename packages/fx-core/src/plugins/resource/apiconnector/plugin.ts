// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import * as path from "path";
import * as fs from "fs-extra";
import { Inputs } from "@microsoft/teamsfx-api";
import { Context } from "@microsoft/teamsfx-api/build/v2";
import { ApiConnectorConfiguration } from "./utils";
import { Constants } from "./constants";
import { ApiConnectorResult, ResultFactory } from "./result";
import { EnvHandler } from "./envHandler";
import { ErrorMessage } from "./errors";
import { QTreeNode } from "@microsoft/teamsfx-api";
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
    for (const componentItem of config.ComponentPath) {
      const timestamp = Date.now();
      const backupFolderName = "backup-" + timestamp;
      const sampleFileName = config.APIName + "." + languageType;
      await this.backupExistingFiles(
        path.join(projectPath, componentItem),
        "abc",
        backupFolderName
      );
      try {
        await this.scaffoldEnvFileToComponent(projectPath, config, componentItem);
        await this.scaffoldSampleCodeToComponent(projectPath, config, componentItem, languageType);
        // await this.addSDKDependency(ComponentPath);
      } catch (err) {
        await fs.move(
          path.join(projectPath, componentItem, backupFolderName),
          path.join(projectPath, componentItem),
          { overwrite: true }
        );
      } finally {
        if (await fs.pathExists(path.join(projectPath, componentItem, backupFolderName))) {
          await fs.remove(path.join(projectPath, componentItem, backupFolderName));
        }
      }
    }

    return ResultFactory.Success();
  }

  private async backupExistingFiles(folderPath: string, sampleFile: string, backupFolder: string) {
    await fs.ensureDir(path.join(folderPath, backupFolder));
    if (await fs.pathExists(path.join(folderPath, ".env.local.teamsfx.lcoal"))) {
      await fs.copyFile(
        path.join(folderPath, ".env.local.teamsfx.lcoal"),
        path.join(folderPath, backupFolder, ".env.local.teamsfx.lcoal")
      );
    }
    if (await fs.pathExists(path.join(folderPath, sampleFile))) {
      await fs.copyFile(
        path.join(folderPath, sampleFile),
        path.join(folderPath, backupFolder, sampleFile)
      );
    }
    if (await fs.pathExists(path.join(folderPath, "package.json"))) {
      await fs.copyFile(
        path.join(folderPath, "package.json"),
        path.join(folderPath, backupFolder, "package.json")
      );
    }
    if (await fs.pathExists(path.join(folderPath, "package-lock.json"))) {
      await fs.copyFile(
        path.join(folderPath, "package-lock.json"),
        path.join(folderPath, backupFolder, "package-lock.json")
      );
    }
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
