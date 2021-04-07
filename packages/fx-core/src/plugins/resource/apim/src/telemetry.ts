// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { UserError } from "fx-api";
import { SystemError, TelemetryReporter } from "fx-api";
import { OpenApiSchemaVersion } from "./model/openApiDocument";
import { IName, OperationStatus } from "./model/operation";

class TelemetryEventNameConstants {
    public static readonly apimOperation: string = "apim-operation";
    public static readonly aadOperation: string = "aad-operation";
    public static readonly openApiDocument: string = "openapi-document";
    public static readonly warning: string = "warning";
    public static readonly error: string = "error";
}

export class Telemetry {
    private readonly telemetry?: TelemetryReporter;
    constructor(telemetry?: TelemetryReporter) {
        this.telemetry = telemetry;
    }

    public sendApimOperationEvent(operation: IName, resourceType: IName, status: OperationStatus): void {
        if (status === OperationStatus.Failed) {
            this.telemetry?.sendTelemetryErrorEvent(TelemetryEventNameConstants.apimOperation, {
                operation: operation.shortName,
                resource: resourceType.shortName,
                status: status,
            });
        } else {
            this.telemetry?.sendTelemetryEvent(TelemetryEventNameConstants.apimOperation, {
                operation: operation.shortName,
                resource: resourceType.shortName,
                status: status,
            });
        }
    }

    public sendAadOperationEvent(operation: IName, resourceType: IName, status: OperationStatus): void {
        if (status === OperationStatus.Failed) {
            this.telemetry?.sendTelemetryErrorEvent(TelemetryEventNameConstants.aadOperation, {
                operation: operation.shortName,
                resource: resourceType.shortName,
                status: status,
            });
        } else {
            this.telemetry?.sendTelemetryEvent(TelemetryEventNameConstants.aadOperation, {
                operation: operation.shortName,
                resource: resourceType.shortName,
                status: status,
            });
        }
    }

    public sendOpenApiDocumentEvent(fileExtension: string, schemaVersion: OpenApiSchemaVersion): void {
        this.telemetry?.sendTelemetryEvent(TelemetryEventNameConstants.openApiDocument, {
            "file-extension": fileExtension,
            "schema-version": schemaVersion,
        });
    }

    public sendErrorEvent(error: UserError | SystemError): void {
        this.telemetry?.sendTelemetryException(error);
    }
}
