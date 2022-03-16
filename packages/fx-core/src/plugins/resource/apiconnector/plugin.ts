// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
import * as path from "path";
import * as fse from "fs-extra";
import * as semver from "semver";
import { Inputs } from "@microsoft/teamsfx-api";
import { Context } from "@microsoft/teamsfx-api/build/v2";
import { ApiConnectorConfiguration } from "./utils";
import { AzureSolutionQuestionNames } from "../../solution/fx-solution/question";
import { Constants } from "./constants";
import { ApiConnectorResult, ResultFactory } from "./result";
import { getTemplatesFolder } from "../../../folder";
import { EnvHandler } from "./envHandler";
import { cpUtils } from "../../../common/deps-checker/util";
import { isWindows } from "../../../common/deps-checker/util/system";
export class ApiConnectorImpl {
  public async scaffold(ctx: Context, inputs: Inputs) {
    if (!inputs.projectPath) {
      throw ResultFactory.SystemError("path error", "project path error");
    }
    const projectPath = inputs.projectPath;
    const config: ApiConnectorConfiguration = this.getUserDataFromInputs(inputs);
    const service = config.ProjectPath == "api" ? "api" : "bot";
    const envHandler = new EnvHandler(projectPath, service);
    envHandler.updateEnvs(config);
    await envHandler.saveLocalEnvFile();

    const languageType: string = ctx.projectSetting!.programmingLanguage!;
    await this.generateSampleCode(projectPath, service, languageType);
    // await this.addSDKDependency(servicePath);
  }

  private getUserDataFromInputs(inputs: Inputs): ApiConnectorConfiguration {
    const apiConnectorAnswer = inputs[AzureSolutionQuestionNames.ApiConnector] as string[];
    if (!apiConnectorAnswer || apiConnectorAnswer.length === 0) {
    }

    const config: ApiConnectorConfiguration = {
      ProjectPath: inputs[Constants.questionKey.serviceSelect],
      EndPoint: inputs[Constants.questionKey.endpoint],
      ServerName: inputs[Constants.questionKey.apiName],
      ApiAuthType: inputs[Constants.questionKey.apiType],
      ApiUserName: inputs[Constants.questionKey.apiUserName],
    };
    return config;
  }

  // Generate api-connector.js or api-connector.ts in this project
  private async generateSampleCode(
    projectPath: string,
    serviceName: string,
    languageType: string
  ): Promise<ApiConnectorResult> {
    const fileSuffix: string = languageType === Constants.LaguageJS ? "js" : "ts";
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
      path.join(projectPath, serviceName, fileName)
    );
    return ResultFactory.Success();
  }

  // Append @microsoft/teamsfx to dependency of this project's package.json
  private async addSDKDependency(servicePath: string): Promise<ApiConnectorResult> {
    const npmInstalled = await this.isNpmInstalled();
    if (npmInstalled && (await this.installSDK(servicePath))) {
      return ResultFactory.Success();
    }

    // fallback
    const pkgPath = path.join(servicePath, "package.json");
    const pkg = await fse.readJson(pkgPath);
    const pkgDeps = pkg.dependencies;
    if (pkgDeps && !pkgDeps["@microsoft/teamsfx"]) {
      pkgDeps["@microsoft/teamsfx"] = "^0.6.2";
    } else if (semver.satisfies(pkgDeps["@microsoft/teamsfx"], ">=0.6.0 <0.6.2")) {
      pkgDeps["@microsoft/teamsfx"] = "^0.6.2";
    } else if (semver.lt(pkgDeps["@microsoft/teamsfx"], "0.6.0")) {
      throw ResultFactory.UserError("sdk version too low", "sdk version too low");
    }
    await fse.writeFile(pkgPath, JSON.stringify(pkg, null, 2));
    return ResultFactory.Success();
  }

  private getExecCommand(command: string): string {
    return isWindows() ? `${command}.cmd` : command;
  }

  private async installSDK(servicePath: string): Promise<boolean> {
    try {
      const timeout = 5 * 60 * 1000;
      const res = await cpUtils.executeCommand(
        undefined,
        undefined,
        { timeout: timeout, shell: false },
        this.getExecCommand("npm"),
        "install",
        // not use -f, to avoid npm@6 bug: exit code = 0, even if install fail
        "@microsoft/teamsfx",
        "--prefix",
        `${servicePath}`,
        "--no-audit",
        "--save"
      );
      return true;
    } catch (err) {
      return false;
    }
  }

  private async isNpmInstalled(): Promise<boolean> {
    try {
      const output = await cpUtils.executeCommand(
        undefined,
        undefined,
        undefined,
        "npm",
        "--version"
      );
      if (semver.valid(output.replace(/\n/g, ""))) {
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
}
