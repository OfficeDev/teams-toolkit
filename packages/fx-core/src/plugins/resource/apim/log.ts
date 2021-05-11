// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ApimDefaultValues, ProjectConstants } from "./constants";
import { IName } from "./interfaces/IName";
import { capitalizeFirstLetter } from "./utils/commonUtils";

export class LogMessages {
    public static readonly operationStarts = (operation: IName, resourceType: IName, resourceId?: string): string =>
        !resourceId
            ? `[${ProjectConstants.pluginDisplayName}] Start to ${operation.displayName} ${resourceType.displayName}.`
            : `[${ProjectConstants.pluginDisplayName}] Start to ${operation.displayName} ${resourceType.displayName} '${resourceId}'.`;

    public static readonly operationSuccess = (operation: IName, resourceType: IName, resourceId?: string): string =>
        !resourceId
            ? `[${ProjectConstants.pluginDisplayName}] ${capitalizeFirstLetter(operation.displayName)} ${resourceType.displayName} successfully.`
            : `[${ProjectConstants.pluginDisplayName}] ${capitalizeFirstLetter(operation.displayName)} ${resourceType.displayName
            } '${resourceId}' successfully.`;

    public static readonly operationFailed = (operation: IName, resourceType: IName, resourceId?: string): string =>
        !resourceId
            ? `[${ProjectConstants.pluginDisplayName}] Failed to ${operation.displayName} ${resourceType.displayName}`
            : `[${ProjectConstants.pluginDisplayName}] Failed to ${operation.displayName} ${resourceType.displayName} '${resourceId}'.`;

    public static readonly operationRetry = (operation: IName, resourceType: IName, resourceId?: string): string =>
        !resourceId
            ? `[${ProjectConstants.pluginDisplayName}] Retry to ${operation.displayName} ${resourceType.displayName}.`
            : `[${ProjectConstants.pluginDisplayName}] Retry to ${operation.displayName} ${resourceType.displayName} '${resourceId}'.`;

    public static readonly resourceNotFound = (resourceType: IName, resourceId?: string): string =>
        !resourceId
            ? `[${ProjectConstants.pluginDisplayName}] Could not found resource ${resourceType.displayName} in Azure.`
            : `[${ProjectConstants.pluginDisplayName}] Could not found resource ${resourceType.displayName} '${resourceId} in Azure.`;

    public static readonly accessFileFailed = (dir: string, file: string): string =>
        `[${ProjectConstants.pluginDisplayName}] Cannot access '${file}' in directory '${dir}'`;

    public static readonly openApiDocumentExists = (fileName: string): string =>
        `[${ProjectConstants.pluginDisplayName}] OpenAPI document '${fileName}' already exists in the project. Skip to scaffold OpenAPI document.`;

    public static readonly useDefaultUserId = `[${ProjectConstants.pluginDisplayName}] Failed to get user information. Use default user '${ApimDefaultValues.userId}' to create API Management service.`;
}
