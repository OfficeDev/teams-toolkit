// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { DriverContext } from "../interface/commonArgs";
import { Constants, TemplateType } from "./constant";
import { deployArgs, deploymentOutput, templateArgs } from "./interface";
import { validateArgs } from "./validator";
import { hasBicepTemplate, getPath, convertOutputs, getFileExtension } from "./util/util";
import { FxError, ok, Result, SystemError } from "@microsoft/teamsfx-api";
import { ConstantString, PluginDisplayName } from "../../../common/constants";
import * as fs from "fs-extra";
import { expandEnvironmentVariable } from "../../utils/common";
import { executeCommand } from "../../../common/cpUtils";
import { getDefaultString, getLocalizedString } from "../../../common/localizeUtils";
import { Deployment, DeploymentMode, ResourceManagementClient } from "@azure/arm-resources";
import { SolutionError } from "../../constants";
import { InvalidParameterUserError } from "../aad/error/invalidParameterUserError";

const helpLink = "https://aka.ms/teamsfx-actions/arm-deploy";

export class ArmDeployImpl {
  args: deployArgs;
  context: DriverContext;
  bicepCommand?: string;
  client?: ResourceManagementClient;

  constructor(args: deployArgs, context: DriverContext) {
    this.args = args;
    this.context = context;
  }

  public async run(): Promise<Map<string, string>> {
    await this.validateArgs();
    await this.createClient();

    const needBicepCli = hasBicepTemplate(this.args.templates);
    if (needBicepCli) {
      this.bicepCommand = await this.ensureBicepCli();
    }
    const deployRes = await this.deployTemplates();
    if (deployRes.isOk()) {
      const outputs = deployRes.value;
      return convertOutputs(outputs);
    } else {
      throw deployRes.error;
    }
  }

  private async validateArgs(): Promise<void> {
    const invalidParameters = await validateArgs(this.args);

    if (invalidParameters.length > 0) {
      throw new InvalidParameterUserError(Constants.actionName, invalidParameters, helpLink);
    }
  }

  // TODO: download bicep cli
  private async ensureBicepCli(): Promise<string> {
    return "";
  }

  private async createClient(): Promise<void> {
    const azureToken = await this.context.azureAccountProvider.getIdentityCredentialAsync();
    if (!azureToken) {
      throw new SystemError(
        PluginDisplayName.Solution,
        SolutionError.FailedToGetAzureCredential,
        getDefaultString("core.deployArmTemplates.InvalidAzureCredential"),
        getLocalizedString("core.deployArmTemplates.InvalidAzureCredential")
      );
    }
    this.client = new ResourceManagementClient(azureToken, this.args.subscriptionId);
  }

  async deployTemplates(): Promise<Result<deploymentOutput[], FxError>> {
    const outputs: deploymentOutput[] = [];
    // TODO: add progressBar
    await Promise.all(
      this.args.templates.map(async (template) => {
        const res = await this.deployTemplate(template);
        if (res.isOk() && res.value) {
          outputs.push(res.value);
        }
      })
    );
    return ok(outputs);
  }

  async deployTemplate(
    templateArg: templateArgs
  ): Promise<Result<deploymentOutput | undefined, FxError>> {
    const parameters = await this.getDeployParameters(templateArg.parameters);
    const template = await this.getDeployTemplate(templateArg.path);
    const deploymentParameters: Deployment = {
      properties: {
        parameters: parameters.parameters,
        template: template as any,
        mode: "Incremental" as DeploymentMode,
      },
    };
    return this.executeDeployment(templateArg, deploymentParameters);
  }

  async executeDeployment(
    templateArg: templateArgs,
    deploymentParameters: Deployment
  ): Promise<Result<deploymentOutput | undefined, FxError>> {
    const result = await this.client?.deployments.beginCreateOrUpdateAndWait(
      this.args.resourceGroupName,
      templateArg.deploymentName,
      deploymentParameters
    );
    return ok(result?.properties?.outputs);
  }

  private async getDeployParameters(parameters: string): Promise<any> {
    const filePath = getPath(parameters, this.context);
    const template = await fs.readFile(filePath, ConstantString.UTF8Encoding);
    const parameterJsonString = expandEnvironmentVariable(template);
    return JSON.parse(parameterJsonString);
  }

  private async getDeployTemplate(templatePath: string): Promise<string> {
    const templateType = getFileExtension(templatePath);
    const filePath = getPath(templatePath, this.context);
    let templateJsonString;
    if (templateType === TemplateType.Bicep) {
      templateJsonString = await this.compileBicepToJson(filePath);
    } else {
      const template = await fs.readFile(filePath, ConstantString.UTF8Encoding);
      templateJsonString = JSON.parse(template);
    }
    return templateJsonString;
  }

  async compileBicepToJson(filePath: string): Promise<JSON> {
    try {
      const result = await executeCommand(
        this.bicepCommand!,
        ["build", filePath, "--stdout"],
        this.context.logProvider,
        { shell: false }
      );
      return JSON.parse(result);
    } catch (err) {
      throw new Error(
        getLocalizedString("driver.arm.deploy.error.CompileBicepFailed", err.message)
      );
    }
  }
}
