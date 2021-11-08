// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ApimArmOutput, ApimDefaultValues, ApimPathInfo, ApimPluginConfigKeys } from "../constants";
import { AssertNotEmpty } from "../error";
import {
  IAadPluginConfig,
  IApimPluginConfig,
  IFunctionPluginConfig,
  ISolutionConfig,
  SolutionConfig,
} from "../config";
import { ApimService } from "../services/apimService";
import { OpenApiProcessor } from "../utils/openApiProcessor";
import { IAnswer } from "../answer";
import {
  AzureSolutionSettings,
  LogProvider,
  PluginContext,
  TelemetryReporter,
} from "@microsoft/teamsfx-api";
import {
  getApimServiceNameFromResourceId,
  getAuthServiceNameFromResourceId,
  getproductNameFromResourceId,
  Lazy,
} from "../utils/commonUtils";
import { NamingRules } from "../utils/namingRules";
import path from "path";
import { Bicep, ConstantString } from "../../../../common/constants";
import { ScaffoldArmTemplateResult } from "../../../../common/armInterface";
import * as fs from "fs-extra";
import { getArmOutput } from "../../utils4v2";
import {
  generateBicepFiles,
  getResourceGroupNameFromResourceId,
  isArmSupportEnabled,
} from "../../../../common/tools";
import { getTemplatesFolder } from "../../../../folder";

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

  public async provision(
    apimConfig: IApimPluginConfig,
    solutionConfig: ISolutionConfig,
    appName: string
  ): Promise<void> {
    const apimService: ApimService = await this.lazyApimService.getValue();
    const currentUserId = await apimService.getUserId();

    if (isArmSupportEnabled()) {
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
    } else {
      await apimService.ensureResourceProvider();

      const resourceGroupName = apimConfig.resourceGroupName ?? solutionConfig.resourceGroupName;
      const apimServiceName =
        apimConfig.serviceName ??
        NamingRules.apimServiceName.sanitize(appName, solutionConfig.resourceNameSuffix);

      await apimService.createService(
        resourceGroupName,
        apimServiceName,
        solutionConfig.location,
        currentUserId
      );
      apimConfig.serviceName = apimServiceName;

      const productId =
        apimConfig.productId ??
        NamingRules.productId.sanitize(appName, solutionConfig.resourceNameSuffix);
      await apimService.createProduct(resourceGroupName, apimServiceName, productId);
      apimConfig.productId = productId;
    }
  }

  public async postProvision(
    apimConfig: IApimPluginConfig,
    ctx: PluginContext,
    aadConfig: IAadPluginConfig,
    appName: string
  ): Promise<void> {
    if (isArmSupportEnabled()) {
      apimConfig.serviceResourceId = getArmOutput(ctx, ApimArmOutput.ServiceResourceId);
      apimConfig.productResourceId = getArmOutput(ctx, ApimArmOutput.ProductResourceId);
      apimConfig.authServerResourceId = getArmOutput(ctx, ApimArmOutput.AuthServerResourceId);
    } else {
      const solutionConfig = new SolutionConfig(ctx.envInfo);
      const apimService: ApimService = await this.lazyApimService.getValue();
      const resourceGroupName = apimConfig.resourceGroupName ?? solutionConfig.resourceGroupName;
      const apimServiceName = apimConfig.checkAndGet(ApimPluginConfigKeys.serviceName);
      const clientId = apimConfig.checkAndGet(ApimPluginConfigKeys.apimClientAADClientId);
      const clientSecret = apimConfig.checkAndGet(ApimPluginConfigKeys.apimClientAADClientSecret);

      const oAuthServerId =
        apimConfig.oAuthServerId ??
        NamingRules.oAuthServerId.sanitize(appName, solutionConfig.resourceNameSuffix);
      const scopeName = `${aadConfig.applicationIdUris}/${ApimDefaultValues.enableScopeName}`;
      await apimService.createOrUpdateOAuthService(
        resourceGroupName,
        apimServiceName,
        oAuthServerId,
        solutionConfig.teamsAppTenantId,
        clientId,
        clientSecret,
        scopeName
      );
      apimConfig.oAuthServerId = oAuthServerId;
    }
  }

  public async deploy(
    apimConfig: IApimPluginConfig,
    solutionConfig: ISolutionConfig,
    functionConfig: IFunctionPluginConfig,
    answer: IAnswer,
    projectRootPath: string
  ): Promise<void> {
    const apimService: ApimService = await this.lazyApimService.getValue();

    let resourceGroupName, apimServiceName, authServerId, productId;

    if (isArmSupportEnabled()) {
      const apimServiceResourceId = apimConfig.checkAndGet(ApimPluginConfigKeys.serviceResourceId);
      const apimProductResourceId = apimConfig.checkAndGet(ApimPluginConfigKeys.productResourceId);
      const authServerResourceId = apimConfig.checkAndGet(
        ApimPluginConfigKeys.authServerResourceId
      );
      resourceGroupName = getResourceGroupNameFromResourceId(apimServiceResourceId);
      apimServiceName = getApimServiceNameFromResourceId(apimServiceResourceId);
      authServerId = getAuthServiceNameFromResourceId(authServerResourceId);
      productId = getproductNameFromResourceId(apimProductResourceId);
    } else {
      resourceGroupName = apimConfig.resourceGroupName ?? solutionConfig.resourceGroupName;
      apimServiceName = apimConfig.checkAndGet(ApimPluginConfigKeys.serviceName);
      authServerId = apimConfig.checkAndGet(ApimPluginConfigKeys.oAuthServerId);
      productId = apimConfig.checkAndGet(ApimPluginConfigKeys.productId);
    }

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

  public async generateArmTemplates(
    solutionConfig: AzureSolutionSettings
  ): Promise<ScaffoldArmTemplateResult> {
    const bicepTemplateDir = path.join(getTemplatesFolder(), ApimPathInfo.BicepTemplateRelativeDir);

    const handleBarsContext = {
      Plugins: solutionConfig.activeResourcePlugins,
    };
    const moduleOrchestrationContentResult = await generateBicepFiles(
      path.join(bicepTemplateDir, Bicep.ModuleOrchestrationFileName),
      handleBarsContext
    );
    if (moduleOrchestrationContentResult.isErr()) {
      throw moduleOrchestrationContentResult.error;
    }

    const result: ScaffoldArmTemplateResult = {
      Modules: {
        apimProvision: {
          Content: await fs.readFile(
            path.join(bicepTemplateDir, ApimPathInfo.ProvisionModuleTemplateFileName),
            ConstantString.UTF8Encoding
          ),
        },
      },
      Orchestration: {
        ParameterTemplate: {
          Content: await fs.readFile(
            path.join(bicepTemplateDir, Bicep.ParameterOrchestrationFileName),
            ConstantString.UTF8Encoding
          ),
          ParameterJson: JSON.parse(
            await fs.readFile(
              path.join(bicepTemplateDir, Bicep.ParameterFileName),
              ConstantString.UTF8Encoding
            )
          ),
        },
        ModuleTemplate: {
          Content: moduleOrchestrationContentResult.value,
        },
        OutputTemplate: {
          Content: await fs.readFile(
            path.join(bicepTemplateDir, Bicep.OutputOrchestrationFileName),
            ConstantString.UTF8Encoding
          ),
        },
      },
    };

    return result;
  }
}
