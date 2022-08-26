// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  ApimDefaultValues,
  ApimOutputBicepSnippet,
  ApimPathInfo,
  ApimPluginConfigKeys,
} from "../constants";
import { AssertNotEmpty } from "../error";
import { IApimPluginConfig, IFunctionPluginConfig, ISolutionConfig } from "../config";
import { IAnswer } from "../answer";
import { LogProvider, PluginContext, TelemetryReporter } from "@microsoft/teamsfx-api";
import path from "path";
import { Bicep, ConstantString } from "../../../../common/constants";
import { ArmTemplateResult } from "../../../../common/armInterface";
import * as fs from "fs-extra";
import { getResourceGroupNameFromResourceId } from "../../../../common/tools";
import { getTemplatesFolder } from "../../../../folder";
import { generateBicepFromFile } from "../../../../common/tools";
import { ApimService } from "../services/apimService";
import {
  getApimServiceNameFromResourceId,
  getAuthServiceNameFromResourceId,
  getProductNameFromResourceId,
  Lazy,
} from "../utils/commonUtils";
import { OpenApiProcessor } from "../utils/openApiProcessor";
import { NamingRules } from "../utils/namingRules";
import { getActivatedV2ResourcePlugins } from "../../../../plugins/solution/fx-solution/ResourcePluginContainer";
import { NamedArmResourcePluginAdaptor } from "../../../../plugins/solution/fx-solution/v2/adaptor";

export class ApimManager {
  private readonly logger: LogProvider | undefined;
  private readonly telemetryReporter: TelemetryReporter | undefined;
  private readonly lazyApimService: Lazy<ApimService>;
  private readonly openApiProcessor: OpenApiProcessor;

  constructor(
    lazyApimService: Lazy<ApimService>,
    openApiProcessor: OpenApiProcessor,
    telemetryReporter?: TelemetryReporter,
    logger?: LogProvider
  ) {
    this.lazyApimService = lazyApimService;
    this.openApiProcessor = openApiProcessor;
    this.logger = logger;
    this.telemetryReporter = telemetryReporter;
  }

  public async provision(apimConfig: IApimPluginConfig): Promise<void> {
    const apimService: ApimService = await this.lazyApimService.getValue();
    const currentUserId = await apimService.getUserId();

    const apimServiceResource = apimConfig.serviceResourceId
      ? await apimService.getService(
          getResourceGroupNameFromResourceId(apimConfig.serviceResourceId),
          getApimServiceNameFromResourceId(apimConfig.serviceResourceId)
        )
      : undefined;
    apimConfig.publisherEmail = apimServiceResource?.publisherEmail
      ? apimServiceResource.publisherEmail
      : currentUserId;
    apimConfig.publisherName = apimServiceResource?.publisherName
      ? apimServiceResource.publisherName
      : currentUserId;
  }

  public async deploy(
    apimConfig: IApimPluginConfig,
    solutionConfig: ISolutionConfig,
    functionConfig: IFunctionPluginConfig,
    answer: IAnswer,
    projectRootPath: string
  ): Promise<void> {
    const apimService: ApimService = await this.lazyApimService.getValue();

    const apimServiceResourceId = apimConfig.checkAndGet(ApimPluginConfigKeys.serviceResourceId);
    const apimProductResourceId = apimConfig.checkAndGet(ApimPluginConfigKeys.productResourceId);
    const authServerResourceId = apimConfig.checkAndGet(ApimPluginConfigKeys.authServerResourceId);
    const resourceGroupName = getResourceGroupNameFromResourceId(apimServiceResourceId);
    const apimServiceName = getApimServiceNameFromResourceId(apimServiceResourceId);
    const authServerId = getAuthServiceNameFromResourceId(authServerResourceId);
    const productId = getProductNameFromResourceId(apimProductResourceId);

    const apiPrefix = apimConfig.checkAndGet(ApimPluginConfigKeys.apiPrefix);
    const apiDocumentPath = apimConfig.checkAndGet(ApimPluginConfigKeys.apiDocumentPath);
    const versionIdentity = AssertNotEmpty("versionAnswer.versionIdentity", answer.versionIdentity);

    const apiId =
      answer.apiId ??
      NamingRules.apiId.sanitize(apiPrefix, versionIdentity, solutionConfig.resourceNameSuffix);
    const versionSetId =
      apimConfig.versionSetId ??
      NamingRules.versionSetId.sanitize(apiPrefix, solutionConfig.resourceNameSuffix);
    const apiPath =
      apimConfig.apiPath ??
      NamingRules.apiPath.sanitize(apiPrefix, solutionConfig.resourceNameSuffix);

    const openApiDocument = await this.openApiProcessor.loadOpenApiDocument(
      apiDocumentPath,
      projectRootPath
    );
    const spec = this.openApiProcessor.patchOpenApiDocument(
      openApiDocument.spec,
      openApiDocument.schemaVersion,
      functionConfig.functionEndpoint,
      ApimDefaultValues.functionBasePath
    );

    const versionSetDisplayName = NamingRules.versionSetDisplayName.sanitize(
      openApiDocument.spec.info.title
    );

    await apimService.createVersionSet(
      resourceGroupName,
      apimServiceName,
      versionSetId,
      versionSetDisplayName
    );
    apimConfig.versionSetId = versionSetId;

    await apimService.importApi(
      resourceGroupName,
      apimServiceName,
      apiId,
      apiPath,
      versionIdentity,
      versionSetId,
      authServerId,
      openApiDocument.schemaVersion,
      spec
    );
    apimConfig.apiPath = apiPath;

    await apimService.addApiToProduct(resourceGroupName, apimServiceName, productId, apiId);
  }

  public async updateArmTemplates(ctx: PluginContext): Promise<ArmTemplateResult> {
    const plugins = getActivatedV2ResourcePlugins(ctx.projectSettings!).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const pluginCtx = { plugins: plugins.map((obj) => obj.name) };
    const bicepTemplateDir = path.join(getTemplatesFolder(), ApimPathInfo.BicepTemplateRelativeDir);
    const configModules = await generateBicepFromFile(
      path.join(bicepTemplateDir, ApimPathInfo.ConfigurationModuleFileName),
      pluginCtx
    );

    const result: ArmTemplateResult = {
      Reference: {
        serviceResourceId: ApimOutputBicepSnippet.ServiceResourceId,
      },
      Configuration: {
        Modules: { apim: configModules },
      },
    };

    return result;
  }

  public async generateArmTemplates(ctx: PluginContext): Promise<ArmTemplateResult> {
    const plugins = getActivatedV2ResourcePlugins(ctx.projectSettings!).map(
      (p) => new NamedArmResourcePluginAdaptor(p)
    );
    const pluginCtx = { plugins: plugins.map((obj) => obj.name) };
    const bicepTemplateDir = path.join(getTemplatesFolder(), ApimPathInfo.BicepTemplateRelativeDir);
    const provisionOrchestration = await generateBicepFromFile(
      path.join(bicepTemplateDir, Bicep.ProvisionFileName),
      pluginCtx
    );
    const provisionModules = await generateBicepFromFile(
      path.join(bicepTemplateDir, ApimPathInfo.ProvisionModuleFileName),
      pluginCtx
    );
    const configOrchestration = await generateBicepFromFile(
      path.join(bicepTemplateDir, Bicep.ConfigFileName),
      pluginCtx
    );
    const configModules = await generateBicepFromFile(
      path.join(bicepTemplateDir, ApimPathInfo.ConfigurationModuleFileName),
      pluginCtx
    );
    const result: ArmTemplateResult = {
      Provision: {
        Orchestration: provisionOrchestration,
        Modules: { apim: provisionModules },
      },
      Configuration: {
        Orchestration: configOrchestration,
        Modules: { apim: configModules },
      },
      Reference: {
        serviceResourceId: ApimOutputBicepSnippet.ServiceResourceId,
      },
      Parameters: JSON.parse(
        await fs.readFile(
          path.join(bicepTemplateDir, Bicep.ParameterFileName),
          ConstantString.UTF8Encoding
        )
      ),
    };

    return result;
  }
}
