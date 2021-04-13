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
    public static sendApimOperationEvent(telemetry: TelemetryReporter | undefined, operation: IName, resourceType: IName, status: OperationStatus): void {
        if (status === OperationStatus.Failed) {
            telemetry?.sendTelemetryErrorEvent(TelemetryEventNameConstants.apimOperation, {
                operation: operation.shortName,
                resource: resourceType.shortName,
                status: status,
            });
        } else {
            telemetry?.sendTelemetryEvent(TelemetryEventNameConstants.apimOperation, {
                operation: operation.shortName,
                resource: resourceType.shortName,
                status: status,
            });
        }
    }

    public static sendAadOperationEvent(telemetry: TelemetryReporter | undefined, operation: IName, resourceType: IName, status: OperationStatus): void {
        if (status === OperationStatus.Failed) {
            telemetry?.sendTelemetryErrorEvent(TelemetryEventNameConstants.aadOperation, {
                operation: operation.shortName,
                resource: resourceType.shortName,
                status: status,
            });
        } else {
            telemetry?.sendTelemetryEvent(TelemetryEventNameConstants.aadOperation, {
                operation: operation.shortName,
                resource: resourceType.shortName,
                status: status,
            });
        }
    }

    public static sendOpenApiDocumentEvent(telemetry: TelemetryReporter | undefined, fileExtension: string, schemaVersion: OpenApiSchemaVersion): void {
        telemetry?.sendTelemetryEvent(TelemetryEventNameConstants.openApiDocument, {
            "file-extension": fileExtension,
            "schema-version": schemaVersion,
        });
    }

    public static sendErrorEvent(telemetry: TelemetryReporter | undefined, error: UserError | SystemError): void {
        telemetry?.sendTelemetryException(error);
    }
}
