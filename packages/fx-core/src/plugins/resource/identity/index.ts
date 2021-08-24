import * as fs from "fs-extra";
import * as path from "path";
import * as manager from "@azure/arm-resources";
import { ErrorMessage } from "./errors";
import {
  PluginContext,
  Plugin,
  ok,
  err,
  SystemError,
  AzureSolutionSettings,
} from "@microsoft/teamsfx-api";

import { IdentityConfig } from "./config";
import {
  Constants,
  IdentityArmOutput,
  IdentityBicep,
  IdentityBicepFile,
  Telemetry,
} from "./constants";
import { ContextUtils } from "./utils/contextUtils";
import { ResultFactory, Result } from "./results";
import { Message } from "./utils/messages";
import { TelemetryUtils } from "./utils/telemetryUtil";
import { formatEndpoint } from "./utils/commonUtils";
import { generateBicepFiles, getTemplatesFolder } from "../../..";
import { AzureResourceSQL } from "../../solution/fx-solution/question";
import { Service } from "typedi";
import { ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
import { Providers, ResourceManagementClientContext } from "@azure/arm-resources";
import { Bicep, ConstantString } from "../../../common/constants";
import { ScaffoldArmTemplateResult } from "../../../common/armInterface";
import { isArmSupportEnabled } from "../../../common";
import { getArmOutput } from "../utils4v2";

@Service(ResourcePlugins.IdentityPlugin)
export class IdentityPlugin implements Plugin {
  name = "fx-resource-identity";
  displayName = "Microsoft Identity";
  activate(solutionSettings: AzureSolutionSettings): boolean {
    const azureResources = solutionSettings.azureResources ? solutionSettings.azureResources : [];
    return azureResources.includes(AzureResourceSQL.id);
  }
  template: any;
  parameters: any;
  armTemplateDir: string = path.resolve(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "templates",
    "plugins",
    "resource",
    "identity"
  );
  config: IdentityConfig = new IdentityConfig();

  async provision(ctx: PluginContext): Promise<Result> {
    if (!isArmSupportEnabled()) {
      return this.provisionImplement(ctx);
    } else {
      return ok(undefined);
    }
  }

  async postProvision(ctx: PluginContext): Promise<Result> {
    if (isArmSupportEnabled()) {
      this.syncArmOutput(ctx);
    }
    return ok(undefined);
  }

  async provisionImplement(ctx: PluginContext): Promise<Result> {
    ctx.logProvider?.info(Message.startProvision);
    TelemetryUtils.init(ctx);
    TelemetryUtils.sendEvent(Telemetry.stage.provision + Telemetry.startSuffix);

    ContextUtils.init(ctx);
    const subscriptionInfo = await ctx.azureAccountProvider?.getSelectedSubscription();
    if (subscriptionInfo) {
      this.config.azureSubscriptionId = subscriptionInfo.subscriptionId;
    }
    this.config.resourceGroup = ContextUtils.getConfigString(
      Constants.solution,
      Constants.resourceGroupName
    );
    this.config.resourceNameSuffix = ContextUtils.getConfigString(
      Constants.solution,
      Constants.resourceNameSuffix
    );
    this.config.location = ContextUtils.getConfigString(Constants.solution, Constants.location);

    try {
      ctx.logProvider?.info(Message.checkProvider);
      const credentials = await ctx.azureAccountProvider!.getAccountCredentialAsync();
      const resourceManagementClient = new Providers(
        new ResourceManagementClientContext(credentials!, this.config.azureSubscriptionId)
      );
      await resourceManagementClient.register(Constants.resourceProvider);
    } catch (error) {
      ctx.logProvider?.info(Message.registerResourceProviderFailed(error?.message));
    }

    let defaultIdentity = `${ctx.projectSettings!.appName}-msi-${this.config.resourceNameSuffix}`;
    defaultIdentity = formatEndpoint(defaultIdentity);
    this.config.identity = defaultIdentity;
    this.config.identityName = `/subscriptions/${this.config.azureSubscriptionId}/resourcegroups/${this.config.resourceGroup}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/${this.config.identity}`;
    ctx.logProvider?.debug(Message.identityName(this.config.identityName));

    try {
      await this.loadArmTemplate(ctx);
      this.parameters.parameters.location.value = this.config.location;
      this.parameters.parameters.identityName.value = this.config.identity;
      await this.provisionWithArmTemplate(ctx);
    } catch (error) {
      const errorCode = error.source + "." + error.name;
      const errorType = error instanceof SystemError ? Telemetry.systemError : Telemetry.userError;
      let errorMessage = error.message;
      if (error.innerError) {
        errorMessage += ` Detailed error: ${error.innerError.message}.`;
      }
      TelemetryUtils.sendErrorEvent(Telemetry.stage.provision, errorCode, errorType, errorMessage);
      return err(error);
    }

    ctx.config.set(Constants.identityName, this.config.identityName);
    ctx.config.set(Constants.identityId, this.config.identityId);
    ctx.config.set(Constants.identity, this.config.identity);
    TelemetryUtils.sendEvent(Telemetry.stage.provision, true);
    ctx.logProvider?.info(Message.endProvision);
    return ok(undefined);
  }

  public async generateArmTemplates(ctx: PluginContext): Promise<Result> {
    const selectedPlugins = (ctx.projectSettings?.solutionSettings as AzureSolutionSettings)
      .activeResourcePlugins;
    const context = {
      Plugins: selectedPlugins,
    };

    const bicepTemplateDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "identity",
      "bicep"
    );

    const moduleTemplateFilePath = path.join(
      bicepTemplateDirectory,
      IdentityBicepFile.moduleTemplateFileName
    );
    const moduleContentResult = await generateBicepFiles(moduleTemplateFilePath, context);
    if (moduleContentResult.isErr()) {
      throw moduleContentResult.error;
    }

    const parameterTemplateFilePath = path.join(
      bicepTemplateDirectory,
      Bicep.ParameterOrchestrationFileName
    );
    const moduleOrchestrationFilePath = path.join(
      bicepTemplateDirectory,
      Bicep.ModuleOrchestrationFileName
    );
    const outputTemplateFilePath = path.join(
      bicepTemplateDirectory,
      Bicep.OutputOrchestrationFileName
    );

    const result: ScaffoldArmTemplateResult = {
      Modules: {
        userAssignedIdentityProvision: {
          Content: moduleContentResult.value,
        },
      },
      Orchestration: {
        ParameterTemplate: {
          Content: await fs.readFile(parameterTemplateFilePath, ConstantString.UTF8Encoding),
        },
        ModuleTemplate: {
          Content: await fs.readFile(moduleOrchestrationFilePath, ConstantString.UTF8Encoding),
          Outputs: {
            identityName: IdentityBicep.identityName,
            identityId: IdentityBicep.identityId,
            identity: IdentityBicep.identity,
          },
        },
        OutputTemplate: {
          Content: await fs.readFile(outputTemplateFilePath, ConstantString.UTF8Encoding),
        },
      },
    };
    return ok(result);
  }

  async loadArmTemplate(ctx: PluginContext) {
    try {
      const templatesFolder = path.resolve(getTemplatesFolder(), "plugins", "resource", "identity");
      const templatePath: string = path.resolve(templatesFolder, "template.json");
      this.template = await fs.readJson(templatePath);
      const paraPath: string = path.resolve(templatesFolder, "parameters.json");
      this.parameters = await fs.readJson(paraPath);
    } catch (_error) {
      ctx.logProvider?.error(ErrorMessage.IdentityLoadFileError.message() + `:${_error.message}`);
      const error = ResultFactory.SystemError(
        ErrorMessage.IdentityLoadFileError.name,
        ErrorMessage.IdentityLoadFileError.message(),
        _error
      );
      throw error;
    }
  }

  async provisionWithArmTemplate(ctx: PluginContext) {
    try {
      const model: manager.ResourceManagementModels.Deployment = {
        properties: {
          template: this.template,
          parameters: this.parameters.parameters,
          mode: "Incremental",
        },
      };

      const credential = await ctx.azureAccountProvider?.getAccountCredentialAsync();
      const client = new manager.ResourceManagementClient(
        credential!,
        this.config.azureSubscriptionId
      );
      const deployName: string = Constants.deployName;
      ctx.logProvider?.info(Message.provisionIdentity);
      await client.deployments.createOrUpdate(this.config.resourceGroup, deployName, model);

      ctx.logProvider?.info(Message.getIdentityId);
      const response = await client.resources.getById(
        this.config.identityName,
        Constants.apiVersion
      );
      this.config.identityId = response.properties.clientId;
    } catch (_error) {
      ctx.logProvider?.error(
        ErrorMessage.IdentityProvisionError.message(this.config.identity) + `:${_error.message}`
      );
      const error = ResultFactory.UserError(
        ErrorMessage.IdentityProvisionError.name,
        ErrorMessage.IdentityProvisionError.message(this.config.identity),
        _error
      );
      throw error;
    }
  }

  private syncArmOutput(ctx: PluginContext) {
    ctx.config.set(Constants.identityName, getArmOutput(ctx, IdentityArmOutput.identityName));
    ctx.config.set(Constants.identityId, getArmOutput(ctx, IdentityArmOutput.identityId));
    ctx.config.set(Constants.identity, getArmOutput(ctx, IdentityArmOutput.identity));
  }
}

export default new IdentityPlugin();
