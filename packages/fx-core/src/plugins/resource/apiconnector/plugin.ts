// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import * as path from "path";
import * as fse from "fs-extra";
import { Inputs } from "@microsoft/teamsfx-api";
import { Context } from "@microsoft/teamsfx-api/build/v2";
import { ApiConnectorConfiguration } from "./utils";
import { AzureSolutionQuestionNames } from "../../solution/fx-solution/question";
import { Constants, ProjectType, LanguageType, FileType } from "./constants";
import { ApiConnectorResult, ResultFactory } from "./result";
import { getTemplatesFolder } from "../../../folder";
import { EnvHandler } from "./envHandler";
import { ErrorMessage } from "./errors";
export class ApiConnectorImpl {
  public async scaffold(ctx: Context, inputs: Inputs): Promise<ApiConnectorResult> {
    if (!inputs.projectPath) {
      throw ResultFactory.SystemError(
        ErrorMessage.ApiConnectorPathError.name,
        ErrorMessage.ApiConnectorPathError.message("")
      );
    }
    const projectPath = inputs.projectPath;
    const config: ApiConnectorConfiguration = this.getUserDataFromInputs(inputs);
    const service: ProjectType =
      config.ServicePath === ProjectType.BOT ? ProjectType.BOT : ProjectType.API;
    const envHandler = new EnvHandler(projectPath, service);
    envHandler.updateEnvs(config);
    await envHandler.saveLocalEnvFile();

    const languageType: string = ctx.projectSetting!.programmingLanguage!;
    await this.generateSampleCode(projectPath, languageType, config);
    // await this.addSDKDependency(servicePath);

    return ResultFactory.Success();
  }

  private getUserDataFromInputs(inputs: Inputs): ApiConnectorConfiguration {
    const config: ApiConnectorConfiguration = {
      ServicePath: inputs[Constants.questionKey.serviceSelect],
      APIName: inputs[Constants.questionKey.apiName],
      ApiAuthType: inputs[Constants.questionKey.apiType],
      EndPoint: inputs[Constants.questionKey.endpoint],
      ApiUserName: inputs[Constants.questionKey.apiUserName],
    };
    return config;
  }

  // Generate {apiName}.js or {apiName}.ts in this project
  private async generateSampleCode(
    projectPath: string,
    languageType: string,
    config: ApiConnectorConfiguration
  ): Promise<ApiConnectorResult> {
    const fileSuffix: string = languageType === LanguageType.JS ? FileType.JS : FileType.TS;
    const sampleCodeDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "apiconnector",
      "sample",
      fileSuffix
    );
    const fileName: string = Constants.pluginNameShort + "." + fileSuffix;
    await fse.copyFile(
      path.join(sampleCodeDirectory, fileName),
      path.join(projectPath, config.ServicePath, fileName)
    );
    return ResultFactory.Success();
  }
}
