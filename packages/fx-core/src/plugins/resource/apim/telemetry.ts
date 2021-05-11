// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { UserError } from "@microsoft/teamsfx-api";
import { SystemError, TelemetryReporter } from "@microsoft/teamsfx-api";
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
    public static sendApimOperationEvent(telemetryReporter: TelemetryReporter | undefined, operation: IName, resourceType: IName, status: OperationStatus): void {
        if (status === OperationStatus.Failed) {
            telemetryReporter?.sendTelemetryErrorEvent(TelemetryEventNameConstants.apimOperation, {
                operation: operation.shortName,
                resource: resourceType.shortName,
                status: status,
            });
        } else {
            telemetryReporter?.sendTelemetryEvent(TelemetryEventNameConstants.apimOperation, {
                operation: operation.shortName,
                resource: resourceType.shortName,
                status: status,
            });
        }
    }

    public static sendAadOperationEvent(telemetryReporter: TelemetryReporter | undefined, operation: IName, resourceType: IName, status: OperationStatus, retries: number): void {
        if (status === OperationStatus.Failed) {
            telemetryReporter?.sendTelemetryErrorEvent(TelemetryEventNameConstants.aadOperation, {
                operation: operation.shortName,
                resource: resourceType.shortName,
                status: status,
                retries: retries.toString(),
            });
        } else {
            telemetryReporter?.sendTelemetryEvent(TelemetryEventNameConstants.aadOperation, {
                operation: operation.shortName,
                resource: resourceType.shortName,
                status: status,
                retries: retries.toString(),
            });
        }
    }

    public static sendOpenApiDocumentEvent(telemetryReporter: TelemetryReporter | undefined, fileExtension: string, schemaVersion: OpenApiSchemaVersion): void {
        telemetryReporter?.sendTelemetryEvent(TelemetryEventNameConstants.openApiDocument, {
            "file-extension": fileExtension,
            "schema-version": schemaVersion,
        });
    }

    public static sendErrorEvent(telemetryReporter: TelemetryReporter | undefined, error: UserError | SystemError): void {
        telemetryReporter?.sendTelemetryException(error);
    }
}
