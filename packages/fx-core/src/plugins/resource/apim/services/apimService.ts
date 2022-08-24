// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ApiManagementClient } from "@azure/arm-apimanagement";
import {
  ApiContract,
  ApiCreateOrUpdateParameter,
  ApiManagementServiceResource,
  ApiVersionSetContract,
  ApiVersionSetGetHeaders,
} from "@azure/arm-apimanagement/src/models";
import {
  ApimDefaultValues,
  AzureResource,
  OperationStatus,
  Operation,
  ErrorHandlerResult,
  OpenApiSchemaVersion,
} from "../constants";
import { ApimOperationError, AssertNotEmpty, BuildError } from "../error";
import { IName } from "../interfaces/IName";
import { Telemetry } from "../utils/telemetry";
import { LogProvider, TelemetryReporter } from "@microsoft/teamsfx-api";
import { LogMessages } from "../log";
import { TokenCredential } from "@azure/identity";
import { OpenAPI } from "openapi-types";
import { Providers } from "@azure/arm-resources";
import { AzureScopes, ConvertTokenToJson } from "../../../../common";

export class ApimService {
  private readonly subscriptionId: string;
  private readonly apimClient: ApiManagementClient;
  private readonly telemetryReporter: TelemetryReporter | undefined;
  private readonly logger: LogProvider | undefined;
  private readonly credential: TokenCredential;
  private readonly resourceProviderClient: Providers;

  constructor(
    apimClient: ApiManagementClient,
    resourceProviderClient: Providers,
    credential: TokenCredential,
    subscriptionId: string,
    telemetryReporter?: TelemetryReporter,
    logger?: LogProvider
  ) {
    this.credential = credential;
    this.subscriptionId = subscriptionId;
    this.apimClient = apimClient;
    this.resourceProviderClient = resourceProviderClient;
    this.telemetryReporter = telemetryReporter;
    this.logger = logger;
  }

  public async getService(
    resourceGroupName: string,
    serviceName: string
  ): Promise<ApiManagementServiceResource | undefined> {
    const fn = () => this.apimClient.apiManagementService.get(resourceGroupName, serviceName);
    return await this.execute(
      Operation.Get,
      AzureResource.APIM,
      serviceName,
      fn,
      resourceNotFoundErrorHandler
    );
  }

  public async getApi(
    resourceGroupName: string,
    serviceName: string,
    apiId: string
  ): Promise<ApiContract | undefined> {
    const fn = () => this.apimClient.api.get(resourceGroupName, serviceName, apiId);
    return await this.execute(
      Operation.Get,
      AzureResource.API,
      apiId,
      fn,
      resourceNotFoundErrorHandler
    );
  }

  // The maximum number of APIs in consumption tier is 50. There are no limits for other tiers.
  // Detail: https://docs.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits#api-management-limits
  public async listApi(
    resourceGroupName: string,
    serviceName: string,
    versionSetId?: string
  ): Promise<ApiContract[]> {
    const resourceId = versionSetId
      ? this.generateVersionSetResourceId(
          this.subscriptionId,
          resourceGroupName,
          serviceName,
          versionSetId
        )
      : undefined;
    const result = [];
    for await (const page of this.apimClient.api
      .listByService(resourceGroupName, serviceName, {
        expandApiVersionSet: true,
      })
      .byPage({ maxPageSize: 100 })) {
      for (const item of page) {
        if (!!resourceId && item.apiVersionSet?.id === resourceId) {
          result.push(item);
        }
      }
    }
    try {
      this.logger?.info(LogMessages.operationStarts(Operation.List, AzureResource.API, resourceId));
      Telemetry.sendApimOperationEvent(
        this.telemetryReporter,
        Operation.List,
        AzureResource.API,
        OperationStatus.Started
      );
      for await (const page of this.apimClient.api
        .listByService(resourceGroupName, serviceName, {
          expandApiVersionSet: true,
        })
        .byPage({ maxPageSize: 100 })) {
        for (const item of page) {
          if (!!resourceId && item.apiVersionSet?.id === resourceId) {
            result.push(item);
          }
        }
      }
      this.logger?.info(
        LogMessages.operationSuccess(Operation.List, AzureResource.API, resourceId)
      );
      Telemetry.sendApimOperationEvent(
        this.telemetryReporter,
        Operation.List,
        AzureResource.API,
        OperationStatus.Succeeded
      );
      return result;
    } catch (error: any) {
      const wrappedError = BuildError(
        ApimOperationError,
        error,
        Operation.List.displayName,
        AzureResource.API.displayName
      );
      this.logger?.warning(
        LogMessages.operationFailed(Operation.List, AzureResource.API, resourceId)
      );
      Telemetry.sendApimOperationEvent(
        this.telemetryReporter,
        Operation.List,
        AzureResource.API,
        OperationStatus.Failed,
        wrappedError
      );
      throw wrappedError;
    }
  }

  public async importApi(
    resourceGroupName: string,
    serviceName: string,
    apiId: string,
    apiPath: string,
    version: string,
    versionSetId: string,
    oAuthServerId: string,
    schemaVersion: OpenApiSchemaVersion,
    spec: OpenAPI.Document
  ): Promise<void> {
    const newApi: ApiCreateOrUpdateParameter = {
      authenticationSettings: {
        oAuth2: {
          authorizationServerId: oAuthServerId,
        },
      },
      path: apiPath,
      apiVersion: version,
      apiVersionSetId: `/apiVersionSets/${versionSetId}`,
      format: schemaVersion === OpenApiSchemaVersion.V2 ? "swagger-json" : "openapi+json",
      value: JSON.stringify(spec),
      subscriptionRequired: false,
      protocols: ["https"],
    };

    const fn = () =>
      this.apimClient.api.beginCreateOrUpdateAndWait(resourceGroupName, serviceName, apiId, newApi);
    await this.execute(Operation.Import, AzureResource.API, apiId, fn, validationErrorHandler);
  }

  public async getVersionSet(
    resourceGroupName: string,
    serviceName: string,
    versionSetId: string
  ): Promise<(ApiVersionSetContract & ApiVersionSetGetHeaders) | undefined> {
    const fn = () =>
      this.apimClient.apiVersionSet.get(resourceGroupName, serviceName, versionSetId);
    return await this.execute(
      Operation.Get,
      AzureResource.VersionSet,
      versionSetId,
      fn,
      resourceNotFoundErrorHandler
    );
  }

  public async createVersionSet(
    resourceGroupName: string,
    serviceName: string,
    versionSetId: string,
    versionSetName?: string
  ): Promise<void> {
    const originVersionSet = await this.getVersionSet(resourceGroupName, serviceName, versionSetId);
    if (originVersionSet) {
      return;
    }

    const newVersionSet: ApiVersionSetContract = {
      displayName: versionSetName ?? versionSetId,
      versioningScheme: "Segment",
    };

    const fn = () =>
      this.apimClient.apiVersionSet.createOrUpdate(
        resourceGroupName,
        serviceName,
        versionSetId,
        newVersionSet
      );
    await this.execute(Operation.Create, AzureResource.VersionSet, versionSetId, fn);
  }

  public async checkProductApiExistence(
    resourceGroupName: string,
    serviceName: string,
    productId: string,
    apiId: string
  ): Promise<boolean> {
    const fn = () =>
      this.apimClient.productApi.checkEntityExists(
        resourceGroupName,
        serviceName,
        productId,
        apiId
      );
    const id = `${productId} - ${apiId}`;
    return !!(await this.execute(
      Operation.Get,
      AzureResource.ProductAPI,
      id,
      fn,
      productApiNotFoundErrorHandler
    ));
  }

  public async addApiToProduct(
    resourceGroupName: string,
    serviceName: string,
    productId: string,
    apiId: string
  ): Promise<void> {
    const existence = await this.checkProductApiExistence(
      resourceGroupName,
      serviceName,
      productId,
      apiId
    );
    if (existence) {
      return;
    }

    const fn = () =>
      this.apimClient.productApi.createOrUpdate(resourceGroupName, serviceName, productId, apiId);
    const id = `${productId} - ${apiId}`;
    await this.execute(Operation.Create, AzureResource.ProductAPI, id, fn, validationErrorHandler);
  }

  public async getUserId(): Promise<string> {
    const token = (await this.credential?.getToken(AzureScopes))?.token;
    const tokenJson = token ? (ConvertTokenToJson(token) as any) : undefined;
    if (!tokenJson?.userId) {
      this.logger?.warning(LogMessages.useDefaultUserId);
      return ApimDefaultValues.userId;
    } else {
      return tokenJson.userId;
    }
  }

  private async execute<T>(
    operation: IName,
    resourceType: IName,
    resourceId: string | undefined,
    fn: () => Promise<T>,
    errorHandler?: (error: any) => ErrorHandlerResult
  ) {
    try {
      this.logger?.info(LogMessages.operationStarts(operation, resourceType, resourceId));
      Telemetry.sendApimOperationEvent(
        this.telemetryReporter,
        operation,
        resourceType,
        OperationStatus.Started
      );
      const result = await fn();
      this.logger?.info(LogMessages.operationSuccess(operation, resourceType, resourceId));
      Telemetry.sendApimOperationEvent(
        this.telemetryReporter,
        operation,
        resourceType,
        OperationStatus.Succeeded
      );
      return result;
    } catch (error: any) {
      if (!!errorHandler && errorHandler(error) === ErrorHandlerResult.Return) {
        this.logger?.info(LogMessages.operationSuccess(operation, resourceType, resourceId));
        Telemetry.sendApimOperationEvent(
          this.telemetryReporter,
          operation,
          resourceType,
          OperationStatus.Succeeded
        );
        if (operation === Operation.Get) {
          this.logger?.info(LogMessages.resourceNotFound(resourceType, resourceId));
        }
        return undefined;
      }

      const wrappedError = BuildError(
        ApimOperationError,
        error,
        operation.displayName,
        resourceType.displayName
      );
      this.logger?.warning(LogMessages.operationFailed(operation, resourceType, resourceId));
      Telemetry.sendApimOperationEvent(
        this.telemetryReporter,
        operation,
        resourceType,
        OperationStatus.Failed,
        wrappedError
      );
      throw wrappedError;
    }
  }

  private generateVersionSetResourceId(
    subscriptionId: string,
    resourceGroupName: string,
    serviceName: string,
    versionSetId: string
  ): string {
    return `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.ApiManagement/service/${serviceName}/apiVersionSets/${versionSetId}`;
  }
}

function resourceNotFoundErrorHandler(error: any): ErrorHandlerResult {
  if ("code" in error) {
    if (error.code === "ResourceNotFound") {
      return ErrorHandlerResult.Return;
    }
  }
  return ErrorHandlerResult.Continue;
}

function productApiNotFoundErrorHandler(error: any): ErrorHandlerResult {
  if ("statusCode" in error) {
    if (error.statusCode === 404) {
      return ErrorHandlerResult.Return;
    }
  }
  return ErrorHandlerResult.Continue;
}

function validationErrorHandler(error: any): ErrorHandlerResult {
  if ("code" in error) {
    if (error.code === "ValidationError") {
      if (error.body.details instanceof Array) {
        for (const detailError of error.body.details) {
          if (detailError.message) {
            error.message += ` [Detail] ${detailError.message}`;
          }
        }
      }
    } else if (typeof error.body === "string") {
      error.message += `[Detail] ${error.body}.`;
    }
  }
  return ErrorHandlerResult.Continue;
}
