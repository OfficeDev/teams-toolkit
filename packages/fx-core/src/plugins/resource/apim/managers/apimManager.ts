// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ApimDefaultValues, ApimPluginConfigKeys, TeamsToolkitComponent } from "../constants";
import { AssertConfigNotEmpty, AssertNotEmpty } from "../error";
import {
  IAadPluginConfig,
  IApimPluginConfig,
  IFunctionPluginConfig,
  ISolutionConfig,
} from "../config";
import { ApimService } from "../services/apimService";
import { OpenApiProcessor } from "../utils/openApiProcessor";
import { IAnswer } from "../answer";
import { LogProvider, TelemetryReporter } from "@microsoft/teamsfx-api";
import { Lazy } from "../utils/commonUtils";
import { NamingRules } from "../utils/namingRules";

export class ApimManager {
  private readonly logger?: LogProvider;
  private readonly telemetryReporter?: TelemetryReporter;
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
    const resourceGroupName = apimConfig.resourceGroupName ?? solutionConfig.resourceGroupName;
    const apimServiceName =
      apimConfig.serviceName ??
      NamingRules.apimServiceName.sanitize(appName, solutionConfig.resourceNameSuffix);

    await apimService.createService(resourceGroupName, apimServiceName, solutionConfig.location);
    apimConfig.serviceName = apimServiceName;

    const productId =
      apimConfig.productId ??
      NamingRules.productId.sanitize(appName, solutionConfig.resourceNameSuffix);
    await apimService.createProduct(resourceGroupName, apimServiceName, productId);
    apimConfig.productId = productId;
  }

  public async postProvision(
    apimConfig: IApimPluginConfig,
    solutionConfig: ISolutionConfig,
    aadConfig: IAadPluginConfig,
    appName: string
  ): Promise<void> {
    const apimService: ApimService = await this.lazyApimService.getValue();
    const resourceGroupName = apimConfig.resourceGroupName ?? solutionConfig.resourceGroupName;
    const apimServiceName = AssertConfigNotEmpty(
      TeamsToolkitComponent.ApimPlugin,
      ApimPluginConfigKeys.serviceName,
      apimConfig.serviceName
    );
    const clientId = AssertConfigNotEmpty(
      TeamsToolkitComponent.ApimPlugin,
      ApimPluginConfigKeys.apimClientAADClientId,
      apimConfig.apimClientAADClientId
    );
    const clientSecret = AssertConfigNotEmpty(
      TeamsToolkitComponent.ApimPlugin,
      ApimPluginConfigKeys.apimClientAADClientSecret,
      apimConfig.apimClientAADClientSecret
    );

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

  public async deploy(
    apimConfig: IApimPluginConfig,
    solutionConfig: ISolutionConfig,
    functionConfig: IFunctionPluginConfig,
    answer: IAnswer,
    projectRootPath: string
  ): Promise<void> {
    const apimService: ApimService = await this.lazyApimService.getValue();
    const resourceGroupName = apimConfig.resourceGroupName ?? solutionConfig.resourceGroupName;
    const apimServiceName = AssertConfigNotEmpty(
      TeamsToolkitComponent.ApimPlugin,
      ApimPluginConfigKeys.serviceName,
      apimConfig.serviceName
    );
    const apiPrefix = AssertConfigNotEmpty(
      TeamsToolkitComponent.ApimPlugin,
      ApimPluginConfigKeys.apiPrefix,
      apimConfig.apiPrefix
    );
    const oAuthServerId = AssertConfigNotEmpty(
      TeamsToolkitComponent.ApimPlugin,
      ApimPluginConfigKeys.oAuthServerId,
      apimConfig.oAuthServerId
    );
    const productId = AssertConfigNotEmpty(
      TeamsToolkitComponent.ApimPlugin,
      ApimPluginConfigKeys.productId,
      apimConfig.productId
    );
    const apiDocumentPath = AssertConfigNotEmpty(
      TeamsToolkitComponent.ApimPlugin,
      ApimPluginConfigKeys.apiDocumentPath,
      apimConfig.apiDocumentPath
    );
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
      oAuthServerId,
      openApiDocument.schemaVersion,
      spec
    );
    apimConfig.apiPath = apiPath;

    await apimService.addApiToProduct(resourceGroupName, apimServiceName, productId, apiId);
  }
}
