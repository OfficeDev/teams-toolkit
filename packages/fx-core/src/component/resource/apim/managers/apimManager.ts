// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ApimDefaultValues, ApimPluginConfigKeys } from "../constants";
import { AssertNotEmpty } from "../error";
import { IApimPluginConfig, IFunctionPluginConfig, ISolutionConfig } from "../config";
import { IAnswer } from "../answer";
import { LogProvider, TelemetryReporter } from "@microsoft/teamsfx-api";
import { getResourceGroupNameFromResourceId } from "../../../../common/tools";
import { ApimService } from "../services/apimService";
import {
  getApimServiceNameFromResourceId,
  getAuthServiceNameFromResourceId,
  getProductNameFromResourceId,
  Lazy,
} from "../utils/commonUtils";
import { OpenApiProcessor } from "../utils/openApiProcessor";
import { NamingRules } from "../utils/namingRules";

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
}
