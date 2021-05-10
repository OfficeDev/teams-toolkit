// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { UserError } from "fx-api";
import { SystemError, TelemetryReporter } from "fx-api";
import { PluginLifeCycle, ProjectConstants } from "./constants";
import { OpenApiSchemaVersion } from "./model/openApiDocument";
import { IName, OperationStatus } from "./model/operation";

class TelemetryEventName {
    public static readonly apimOperation: string = "apim-operation";
    public static readonly aadOperation: string = "aad-operation";
    public static readonly openApiDocument: string = "openapi-document";
}

class TelemetryPropertyName {
    public static readonly component: string = "component";
    public static readonly success: string = "success";
    public static readonly errorType: string = "error-type";
    public static readonly errorCode: string = "error-code";
    public static readonly errorMessage: string = "error-message";
}

export class Telemetry {
    public static sendLifeCycleEvent(telemetryReporter: TelemetryReporter | undefined, lifeCycle: PluginLifeCycle, status: OperationStatus, error?: UserError | SystemError): void {
        this.sendOperationEvent(telemetryReporter, lifeCycle, status, undefined, undefined, error);
    }

    public static sendApimOperationEvent(telemetryReporter: TelemetryReporter | undefined, operation: IName, resourceType: IName, status: OperationStatus, error?: UserError | SystemError): void {
        const properties = {
            operation: operation.shortName,
            resource: resourceType.shortName,
            status: status,
        };

        this.sendOperationEvent(telemetryReporter, TelemetryEventName.apimOperation, status, properties, undefined, error);
    }

    public static sendAadOperationEvent(telemetryReporter: TelemetryReporter | undefined, operation: IName, resourceType: IName, status: OperationStatus, retries: number, error?: UserError | SystemError): void {
        const properties = {
            operation: operation.shortName,
            resource: resourceType.shortName,
            status: status,
            retries: retries.toString(),
        };
        this.sendOperationEvent(telemetryReporter, TelemetryEventName.aadOperation, status, properties, undefined, error);
    }

    public static sendOpenApiDocumentEvent(telemetryReporter: TelemetryReporter | undefined, fileExtension: string, schemaVersion: OpenApiSchemaVersion): void {
        telemetryReporter?.sendTelemetryEvent(TelemetryEventName.openApiDocument, {
            "file-extension": fileExtension,
            "schema-version": schemaVersion,
        });
    }

    private static sendOperationEvent(telemetryReporter: TelemetryReporter | undefined, eventName: string, status: OperationStatus, properties?: { [key: string]: string }, measurements?: { [key: string]: number }, error?: UserError | SystemError): void {
        switch (status) {
            case OperationStatus.Started:
                telemetryReporter?.sendTelemetryEvent(`${eventName}-start`, this.buildProperties(properties), measurements);
                break;
            case OperationStatus.Succeeded:
                telemetryReporter?.sendTelemetryEvent(eventName, this.buildProperties(properties));
                break;
            case OperationStatus.Failed:
                telemetryReporter?.sendTelemetryErrorEvent(eventName, this.buildProperties(properties, error));
                break;
        }
    }

    private static buildProperties(properties?: { [key: string]: string }, error?: UserError | SystemError): { [key: string]: string } {
        properties = properties ?? {};
        properties[TelemetryPropertyName.component] = ProjectConstants.pluginName;

        if (!error) {
            properties[TelemetryPropertyName.success] = "yes";
            return properties;
        }

        properties[TelemetryPropertyName.success] = "no";
        properties[TelemetryPropertyName.errorCode] = error.name;
        properties[TelemetryPropertyName.errorMessage] = error.message;
        if (error instanceof UserError) {
            properties[TelemetryPropertyName.errorType] = "user";
        }

        if (error instanceof SystemError) {
            properties[TelemetryPropertyName.errorType] = "system";
        }

        return properties;
    }
}
