// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { AadOperationError, AssertNotEmpty, BuildError } from "../error";
import { AxiosInstance, Method } from "axios";
import { IAadInfo, IPasswordCredential, IServicePrincipals } from "../model/aadResponse";
import { ErrorHandlerResult } from "../model/errorHandlerResult";
import { AzureResource, IName, OperationStatus, Operation } from "../model/operation";
import { LogProvider, TelemetryReporter } from "fx-api";
import { LogMessages } from "../log";
import { Telemetry } from "../telemetry";

export class AadService {
    private readonly logger?: LogProvider;
    private readonly telemetryReporter?: TelemetryReporter;
    private readonly axios: AxiosInstance;

    constructor(axios: AxiosInstance, telemetryReporter?: TelemetryReporter, logger?: LogProvider) {
        this.logger = logger;
        this.telemetryReporter = telemetryReporter;
        this.axios = axios;
    }

    public async createAad(aadName: string): Promise<IAadInfo> {
        const body = {
            displayName: aadName,
        };

        const response = await this.execute(Operation.Create, AzureResource.Aad, undefined, "post", "/applications", body);
        const data = AssertNotEmpty("response.data", response?.data);
        return data as IAadInfo;
    }

    public async addSecret(objectId: string, displayName: string): Promise<IPasswordCredential> {
        const body = {
            passwordCredential: {
                displayName: displayName,
            },
        };

        const response = await this.execute(
            Operation.Create,
            AzureResource.AadSecret,
            undefined,
            "post",
            `/applications/${objectId}/addPassword`,
            body
        );
        const data = AssertNotEmpty("response.data", response?.data);
        return data as IPasswordCredential;
    }

    public async getAad(objectId: string): Promise<IAadInfo | undefined> {
        const response = await this.execute(
            Operation.Get,
            AzureResource.Aad,
            objectId,
            "get",
            `/applications/${objectId}`,
            undefined,
            this._resourceNotFoundErrorHandler
        );
        return response?.data as IAadInfo;
    }

    public async updateAad(objectId: string, data: IAadInfo): Promise<void> {
        await this.execute(Operation.Update, AzureResource.Aad, objectId, "patch", `/applications/${objectId}`, data);
    }

    public async createServicePrincipalIfNotExists(appId: string): Promise<void> {
        const response = await this.execute(
            Operation.Get,
            AzureResource.ServicePrincipal,
            appId,
            "get",
            `/servicePrincipals?$filter=appId eq '${appId}'`
        );
        const existingServicePrincipals = response?.data as IServicePrincipals;
        if (existingServicePrincipals.value.length > 0) {
            return;
        }
        this.logger?.info(LogMessages.resourceNotFound(AzureResource.ServicePrincipal, appId));

        const body = {
            appId: appId,
        };
        await this.execute(Operation.Create, AzureResource.ServicePrincipal, appId, "post", "/servicePrincipals", body);
    }

    private async execute(
        operation: IName,
        resourceType: IName,
        resourceId: string | undefined,
        method: Method,
        url: string,
        data?: any,
        errorHandler?: (error: any) => ErrorHandlerResult
    ) {
        try {
            this.logger?.info(LogMessages.operationStarts(operation, resourceType, resourceId));
            Telemetry.sendAadOperationEvent(this.telemetryReporter, operation, resourceType, OperationStatus.Started);

            const result = await this.axios.request({ method: method, url: url, data: data });

            this.logger?.info(LogMessages.operationSuccess(operation, resourceType, resourceId));
            Telemetry.sendAadOperationEvent(this.telemetryReporter, operation, resourceType, OperationStatus.Succeeded);
            return result;
        } catch (error) {
            if (!!errorHandler && errorHandler(error) === ErrorHandlerResult.Return) {
                this.logger?.info(LogMessages.operationSuccess(operation, resourceType, resourceId));
                Telemetry.sendAadOperationEvent(this.telemetryReporter, operation, resourceType, OperationStatus.Succeeded);
                if (operation === Operation.Get) {
                    this.logger?.info(LogMessages.resourceNotFound(resourceType, resourceId));
                }
                return undefined;
            }

            error.message = `[Detail] ${error?.response?.data?.error?.message ?? error.message}`;
            this.logger?.info(LogMessages.operationFailed(operation, resourceType, resourceId));
            Telemetry.sendAadOperationEvent(this.telemetryReporter, operation, resourceType, OperationStatus.Failed);
            throw BuildError(AadOperationError, error, operation.displayName, resourceType.displayName);
        }
    }

    private _resourceNotFoundErrorHandler(error: any): ErrorHandlerResult {
        if (error?.response?.status == 404) {
            return ErrorHandlerResult.Return;
        }
        return ErrorHandlerResult.Continue;
    }
}
