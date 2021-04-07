// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ApiManagementClient } from "@azure/arm-apimanagement";
import {
    ApiContract,
    ApiCreateOrUpdateParameter,
    ApiManagementServiceResource,
    ApiVersionSetContract,
    ApiVersionSetGetHeaders,
    AuthorizationServerContract,
    AuthorizationServerGetHeaders,
    ProductContract,
} from "@azure/arm-apimanagement/src/models";
import { ApimDefaultValues } from "../constants";
import { ApimOperationError, AssertNotEmpty, BuildError, InvalidAzureResourceId } from "../error";
import { IApimServiceResource } from "../model/resource";
import { OpenApiSchemaVersion } from "../model/openApiDocument";
import { ErrorHandlerResult } from "../model/errorHandlerResult";
import { Telemetry } from "../telemetry";
import { AzureResource, IName, OperationStatus, Operation } from "../model/operation";
import { LogProvider } from "fx-api";
import { LogMessages } from "../log";
import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import { OpenAPI } from "openapi-types";

export class ApimService {
    private readonly subscriptionId: string;
    private readonly apimClient: ApiManagementClient;
    private readonly telemetry: Telemetry;
    private readonly logger?: LogProvider;
    private readonly credential: TokenCredentialsBase;

    constructor(
        apimClient: ApiManagementClient,
        credential: TokenCredentialsBase,
        subscriptionId: string,
        telemetry: Telemetry,
        logger?: LogProvider
    ) {
        this.credential = credential;
        this.subscriptionId = subscriptionId;
        this.apimClient = apimClient;
        this.telemetry = telemetry;
        this.logger = logger;
    }

    public async createService(resourceGroupName: string, serviceName: string, location: string): Promise<void> {
        const existingService = await this.getService(resourceGroupName, serviceName);
        if (existingService) {
            return;
        }

        const userId = await this.getUserId();
        const apimService: ApiManagementServiceResource = {
            publisherName: userId,
            publisherEmail: userId,
            sku: {
                name: "Consumption",
                capacity: 0,
            },
            location: location,
        };

        const fn = () => this.apimClient.apiManagementService.createOrUpdate(resourceGroupName, serviceName, apimService);
        await this.execute(Operation.Create, AzureResource.APIM, serviceName, fn);
    }

    public async getService(resourceGroupName: string, serviceName: string): Promise<ApiManagementServiceResource | undefined> {
        const fn = () => this.apimClient.apiManagementService.get(resourceGroupName, serviceName);
        return await this.execute(Operation.Get, AzureResource.APIM, serviceName, fn, resourceNotFoundErrorHandler);
    }

    public async listService(): Promise<Array<IApimServiceResource>> {
        const fn = () => this.apimClient.apiManagementService.list();
        const response = await this.execute(Operation.List, AzureResource.APIM, undefined, fn);
        const serviceList = AssertNotEmpty("response", response);
        const result = serviceList.map((response) => this.convertApimServiceResource(response));

        let nextLink = serviceList.nextLink;
        while (nextLink) {
            const nextFn = () => this.apimClient.apiManagementService.listNext(nextLink!);
            const nextPageResponse = await this.execute(Operation.ListNextPage, AzureResource.APIM, undefined, nextFn);
            const nextPageServiceList = AssertNotEmpty("nextPageResponse", nextPageResponse);
            result.push(...nextPageServiceList.map((response) => this.convertApimServiceResource(response)));
            nextLink = nextPageServiceList.nextLink;
        }
        return result;
    }

    public async createProduct(resourceGroupName: string, serviceName: string, productId: string, productDisplayName?: string): Promise<void> {
        const product = await this.getProduct(resourceGroupName, serviceName, productId);
        if (product) {
            return;
        }

        const newProduct: ProductContract = {
            displayName: productDisplayName ?? productId,
            description: ApimDefaultValues.productDescription,
            subscriptionRequired: false,
            state: "published",
        };

        const fn = () => this.apimClient.product.createOrUpdate(resourceGroupName, serviceName, productId, newProduct);
        await this.execute(Operation.Create, AzureResource.Product, productId, fn);
    }

    public async getProduct(resourceGroupName: string, serviceName: string, productId: string): Promise<ProductContract | undefined> {
        const fn = () => this.apimClient.product.get(resourceGroupName, serviceName, productId);
        return await this.execute(Operation.Get, AzureResource.Product, productId, fn, resourceNotFoundErrorHandler);
    }

    public async createOrUpdateOAuthService(
        resourceGroupName: string,
        serviceName: string,
        oAuthServerId: string,
        tenantId: string,
        clientId: string,
        clientSecret: string,
        scope: string,
        oAuthServerDisplayName?: string
    ): Promise<void> {
        const oAuthServer = await this.getOAuthServer(resourceGroupName, serviceName, oAuthServerId);

        const authorizationEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
        const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

        if (!oAuthServer) {
            const newOAuthServer: AuthorizationServerContract = {
                authorizationEndpoint: authorizationEndpoint,
                authorizationMethods: ["GET", "POST"],
                bearerTokenSendingMethods: ["authorizationHeader"],
                clientAuthenticationMethod: ["Body"],
                clientId: clientId,
                clientRegistrationEndpoint: "http://localhost",
                clientSecret: clientSecret,
                defaultScope: scope,
                description: ApimDefaultValues.oAuthServerDescription,
                displayName: oAuthServerDisplayName ?? oAuthServerId,
                grantTypes: ["authorizationCode"],
                tokenEndpoint: tokenEndpoint,
            };

            const fn = () => this.apimClient.authorizationServer.createOrUpdate(resourceGroupName, serviceName, oAuthServerId, newOAuthServer);
            await this.execute(Operation.Create, AzureResource.OAuthServer, oAuthServerId, fn);
        } else {
            oAuthServer.authorizationEndpoint = authorizationEndpoint;
            oAuthServer.tokenEndpoint = tokenEndpoint;
            oAuthServer.clientId = clientId;
            oAuthServer.clientSecret = clientSecret;
            oAuthServer.defaultScope = scope;

            const fn = () =>
                this.apimClient.authorizationServer.createOrUpdate(resourceGroupName, serviceName, oAuthServerId, oAuthServer, {
                    ifMatch: oAuthServer.eTag,
                });
            await this.execute(Operation.Update, AzureResource.OAuthServer, oAuthServerId, fn);
        }
    }

    public async getOAuthServer(
        resourceGroupName: string,
        serviceName: string,
        oAuthServerId: string
    ): Promise<(AuthorizationServerContract & AuthorizationServerGetHeaders) | undefined> {
        const fn = () => this.apimClient.authorizationServer.get(resourceGroupName, serviceName, oAuthServerId);
        return await this.execute(Operation.Get, AzureResource.OAuthServer, oAuthServerId, fn, resourceNotFoundErrorHandler);
    }

    public async getApi(resourceGroupName: string, serviceName: string, apiId: string): Promise<ApiContract | undefined> {
        const fn = () => this.apimClient.api.get(resourceGroupName, serviceName, apiId);
        return await this.execute(Operation.Get, AzureResource.API, apiId, fn, resourceNotFoundErrorHandler);
    }

    // The maximum number of APIs in consumption tier is 50. There are no limits for other tiers.
    // Detail: https://docs.microsoft.com/en-us/azure/azure-resource-manager/management/azure-subscription-service-limits#api-management-limits
    public async listApi(resourceGroupName: string, serviceName: string, versionSetId?: string): Promise<ApiContract[]> {
        const resourceId = versionSetId
            ? this.generateVersionSetResourceId(this.subscriptionId, resourceGroupName, serviceName, versionSetId)
            : undefined;
        const fn = () => this.apimClient.api.listByService(resourceGroupName, serviceName, { expandApiVersionSet: true });

        const apiListResponse = await this.execute(Operation.List, AzureResource.API, undefined, fn);
        const apiList = AssertNotEmpty("apiListResponse", apiListResponse);
        const result = apiList.filter((x) => !!resourceId && x.apiVersionSet?.id === resourceId);
        let nextLink = apiList.nextLink;
        while (nextLink) {
            const nextFn = () => this.apimClient.api.listByServiceNext(nextLink!);
            const nextPageResponse = await this.execute(Operation.ListNextPage, AzureResource.API, undefined, nextFn);
            const apiNextList = AssertNotEmpty("nextPageResponse", nextPageResponse);
            result.push(...apiNextList.filter((x) => !!resourceId && x.apiVersionSet?.id === resourceId));
            nextLink = apiNextList.nextLink;
        }

        return result;
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
            format: schemaVersion === OpenApiSchemaVersion.v2 ? "swagger-json" : "openapi+json",
            value: JSON.stringify(spec),
            subscriptionRequired: false,
            protocols: ["https"],
        };

        const fn = () => this.apimClient.api.createOrUpdate(resourceGroupName, serviceName, apiId, newApi);
        await this.execute(Operation.Import, AzureResource.API, apiId, fn, validationErrorHandler);
    }

    public async getVersionSet(
        resourceGroupName: string,
        serviceName: string,
        versionSetId: string
    ): Promise<(ApiVersionSetContract & ApiVersionSetGetHeaders) | undefined> {
        const fn = () => this.apimClient.apiVersionSet.get(resourceGroupName, serviceName, versionSetId);
        return await this.execute(Operation.Get, AzureResource.VersionSet, versionSetId, fn, resourceNotFoundErrorHandler);
    }

    public async createVersionSet(resourceGroupName: string, serviceName: string, versionSetId: string, versionSetName?: string): Promise<void> {
        const originVersionSet = await this.getVersionSet(resourceGroupName, serviceName, versionSetId);
        if (originVersionSet) {
            return;
        }

        const newVersionSet: ApiVersionSetContract = {
            displayName: versionSetName ?? versionSetId,
            versioningScheme: "Segment",
        };

        const fn = () => this.apimClient.apiVersionSet.createOrUpdate(resourceGroupName, serviceName, versionSetId, newVersionSet);
        await this.execute(Operation.Create, AzureResource.VersionSet, versionSetId, fn);
    }

    public async checkProductApiExistence(resourceGroupName: string, serviceName: string, productId: string, apiId: string): Promise<boolean> {
        const fn = () => this.apimClient.productApi.checkEntityExists(resourceGroupName, serviceName, productId, apiId);
        const id = `${productId} - ${apiId}`;
        return !!(await this.execute(Operation.Get, AzureResource.ProductAPI, id, fn, productApiNotFoundErrorHandler));
    }

    public async addApiToProduct(resourceGroupName: string, serviceName: string, productId: string, apiId: string): Promise<void> {
        const existence = await this.checkProductApiExistence(resourceGroupName, serviceName, productId, apiId);
        if (existence) {
            return;
        }

        const fn = () => this.apimClient.productApi.createOrUpdate(resourceGroupName, serviceName, productId, apiId);
        const id = `${productId} - ${apiId}`;
        await this.execute(Operation.Create, AzureResource.ProductAPI, id, fn, validationErrorHandler);
    }

    private async getUserId(): Promise<string> {
        const token = await this.credential?.getToken();
        if (!token?.userId) {
            this.logger?.warning(LogMessages.useDefaultUserId);
            return ApimDefaultValues.userId;
        } else {
            return token.userId;
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
            this.telemetry.sendApimOperationEvent(operation, resourceType, OperationStatus.Started);
            const result = await fn();
            this.logger?.info(LogMessages.operationSuccess(operation, resourceType, resourceId));
            this.telemetry.sendApimOperationEvent(operation, resourceType, OperationStatus.Succeeded);
            return result;
        } catch (error) {
            if (!!errorHandler && errorHandler(error) === ErrorHandlerResult.Return) {
                this.logger?.info(LogMessages.operationSuccess(operation, resourceType, resourceId));
                this.telemetry.sendApimOperationEvent(operation, resourceType, OperationStatus.Succeeded);
                if (operation === Operation.Get) {
                    this.logger?.info(LogMessages.resourceNotFound(resourceType, resourceId));
                }
                return undefined;
            }

            this.logger?.info(LogMessages.operationFailed(operation, resourceType, resourceId));
            this.telemetry.sendApimOperationEvent(operation, resourceType, OperationStatus.Failed);
            throw BuildError(ApimOperationError, error, operation.displayName, resourceType.displayName);
        }
    }

    private convertApimServiceResource(src: ApiManagementServiceResource): IApimServiceResource {
        const resourceId = AssertNotEmpty("apimServiceListResponse.id", src.id);
        const name = AssertNotEmpty("apimServiceListResponse.name", src.name);
        const matches = resourceId.match(/\/subscriptions\/(.*)\/resourceGroups\/(.*)\/providers\/(.*)\/(.*)/);

        if (matches === null || matches.length < 3) {
            throw BuildError(InvalidAzureResourceId, resourceId);
        }

        return { serviceName: name, resourceGroupName: matches[2] };
    }

    private generateVersionSetResourceId(subscriptionId: string, resourceGroupName: string, serviceName: string, versionSetId: string): string {
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
                        error.message += `[Detail] ${detailError.message}.`;
                    }
                }
            }
        } else if (typeof error.body === "string") {
            error.message += `[Detail] ${error.body}.`;
        }
    }
    return ErrorHandlerResult.Continue;
}
