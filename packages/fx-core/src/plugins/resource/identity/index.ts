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
  Func,
} from "@microsoft/teamsfx-api";

import { IdentityConfig } from "./config";
import { Constants, IdentityBicep, IdentityBicepFile, Telemetry } from "./constants";
import { ContextUtils } from "./utils/contextUtils";
import { ResultFactory, Result } from "./results";
import { Message } from "./utils/messages";
import { TelemetryUtils } from "./utils/telemetryUtil";
import { formatEndpoint } from "./utils/commonUtils";
import { getTemplatesFolder } from "../../../folder";
import { AzureResourceSQL, HostTypeOptionAzure } from "../../solution/fx-solution/question";
import { Service } from "typedi";
import { ResourcePlugins } from "../../solution/fx-solution/ResourcePluginContainer";
import { Providers, ResourceManagementClientContext } from "@azure/arm-resources";
import { Bicep, ConstantString } from "../../../common/constants";
import { ArmTemplateResult } from "../../../common/armInterface";
import { isArmSupportEnabled } from "../../../common";
import "./v2";
@Service(ResourcePlugins.IdentityPlugin)
export class IdentityPlugin implements Plugin {
  name = "fx-resource-identity";
  displayName = "Microsoft Identity";
  activate(solutionSettings: AzureSolutionSettings): boolean {
    if (!isArmSupportEnabled()) {
      const azureResources = solutionSettings.azureResources ? solutionSettings.azureResources : [];
      return azureResources.includes(AzureResourceSQL.id);
    } else {
      return solutionSettings.hostType === HostTypeOptionAzure.id;
    }
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
    return ok(undefined);
  }

  async provisionImplement(ctx: PluginContext): Promise<Result> {
    ctx.logProvider?.info(Message.startProvision);
    TelemetryUtils.init(ctx);
    TelemetryUtils.sendEvent(Telemetry.stage.provision + Telemetry.startSuffix);

    this.loadConfig(ctx);
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
    this.config.identityName = defaultIdentity;
    this.config.identityResourceId = `/subscriptions/${this.config.azureSubscriptionId}/resourcegroups/${this.config.resourceGroup}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/${this.config.identityName}`;
    ctx.logProvider?.debug(Message.identityResourceId(this.config.identityResourceId));

    try {
      await this.loadArmTemplate(ctx);
      this.parameters.parameters.location.value = this.config.location;
      this.parameters.parameters.identityName.value = this.config.identityName;
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
    ctx.config.set(Constants.identityClientId, this.config.identityClientId);
    ctx.config.set(Constants.identityResourceId, this.config.identityResourceId);
    TelemetryUtils.sendEvent(Telemetry.stage.provision, true);
    ctx.logProvider?.info(Message.endProvision);
    return ok(undefined);
  }

  public async generateArmTemplates(ctx: PluginContext): Promise<Result> {
    const bicepTemplateDirectory = path.join(
      getTemplatesFolder(),
      "plugins",
      "resource",
      "identity",
      "bicep"
    );
    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: await fs.readFile(
          path.join(bicepTemplateDirectory, Bicep.ProvisionFileName),
          ConstantString.UTF8Encoding
        ),
        Reference: {
          identityName: IdentityBicep.identityName,
          identityClientId: IdentityBicep.identityClientId,
          identityResourceId: IdentityBicep.identityResourceId,
          identityPrincipalId: IdentityBicep.identityPrincipalId,
        },
        Modules: {
          identity: await fs.readFile(
            path.join(bicepTemplateDirectory, IdentityBicepFile.moduleTempalteFilename),
            ConstantString.UTF8Encoding
          ),
        },
      },
    };

    return ok(result);
  }

  public async executeUserTask(func: Func, context: PluginContext): Promise<Result> {
    if (func.method === "migrateV1Project") {
      return ok(undefined); // Not need to do anything when migrate V1 project
    }
    return ok(undefined);
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
        this.config.identityResourceId,
        Constants.apiVersion
      );
      this.config.identityClientId = response.properties.clientId;
    } catch (_error) {
      ctx.logProvider?.error(
        ErrorMessage.IdentityProvisionError.message(this.config.identityName) + `:${_error.message}`
      );
      const error = ResultFactory.UserError(
        ErrorMessage.IdentityProvisionError.name,
        ErrorMessage.IdentityProvisionError.message(this.config.identityName),
        _error
      );
      throw error;
    }
  }

  private loadConfig(ctx: PluginContext) {
    this.config.azureSubscriptionId = ContextUtils.getConfig<string>(
      ctx,
      Constants.solution,
      Constants.subscriptionId
    );
    this.loadConfigResourceGroup(ctx);
    this.config.resourceNameSuffix = ContextUtils.getConfig<string>(
      ctx,
      Constants.solution,
      Constants.resourceNameSuffix
    );
    this.config.location = ContextUtils.getConfig<string>(
      ctx,
      Constants.solution,
      Constants.location
    );
  }

  private loadConfigResourceGroup(ctx: PluginContext) {
    if (!isArmSupportEnabled()) {
      this.config.resourceGroup = ContextUtils.getConfig<string>(
        ctx,
        Constants.solution,
        Constants.resourceGroupName
      );
    }
  }
}

export default new IdentityPlugin();
