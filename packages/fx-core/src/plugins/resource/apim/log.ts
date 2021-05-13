// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ApimDefaultValues, ProjectConstants } from "./constants";
import { IName } from "./interfaces/IName";

export class LogMessages {
    public static readonly operationStarts = (operation: IName, resourceType: IName, resourceId?: string): string =>
        !resourceId
            ? `[${ProjectConstants.pluginDisplayName}] Starting: ${operation.displayName} ${resourceType.displayName}.`
            : `[${ProjectConstants.pluginDisplayName}] Starting: ${operation.displayName} ${resourceType.displayName} '${resourceId}'.`;

    public static readonly operationSuccess = (operation: IName, resourceType: IName, resourceId?: string): string =>
        !resourceId
            ? `[${ProjectConstants.pluginDisplayName}] Succeeded: ${operation.displayName} ${resourceType.displayName}.`
            : `[${ProjectConstants.pluginDisplayName}] Succeeded: ${operation.displayName} ${resourceType.displayName} '${resourceId}'.`;

    public static readonly operationFailed = (operation: IName, resourceType: IName, resourceId?: string): string =>
        !resourceId
            ? `[${ProjectConstants.pluginDisplayName}] Failed: ${operation.displayName} ${resourceType.displayName}`
            : `[${ProjectConstants.pluginDisplayName}] Failed: ${operation.displayName} ${resourceType.displayName} '${resourceId}'.`;

    public static readonly operationRetry = (operation: IName, resourceType: IName, resourceId?: string): string =>
        !resourceId
            ? `[${ProjectConstants.pluginDisplayName}] Retrying: ${operation.displayName} ${resourceType.displayName}.`
            : `[${ProjectConstants.pluginDisplayName}] Retrying: ${operation.displayName} ${resourceType.displayName} '${resourceId}'.`;

    public static readonly resourceNotFound = (resourceType: IName, resourceId?: string): string =>
        !resourceId
            ? `[${ProjectConstants.pluginDisplayName}] Failed to find resource ${resourceType.displayName} in Azure.`
            : `[${ProjectConstants.pluginDisplayName}] Failed to find resource ${resourceType.displayName} '${resourceId} in Azure.`;

    public static readonly accessFileFailed = (dir: string, file: string): string =>
        `[${ProjectConstants.pluginDisplayName}] Cannot access '${file}' in directory '${dir}'`;

    public static readonly openApiDocumentExists = (fileName: string): string =>
        `[${ProjectConstants.pluginDisplayName}] OpenAPI document '${fileName}' already exists in the project.`;

    public static readonly useDefaultUserId = `[${ProjectConstants.pluginDisplayName}] Failed to get user information. Using default user '${ApimDefaultValues.userId}' to create API Management service.`;
}
