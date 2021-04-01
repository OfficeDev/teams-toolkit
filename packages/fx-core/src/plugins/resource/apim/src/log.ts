// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ApimDefaultValues, ProjectConstants } from "./constants";
import { IName } from "./model/operation";
import { capitalizeFirstLetter } from "./util";

export class LogMessages {
    public static readonly operationStarts = (operation: IName, resourceType: IName, resourceId?: string): string =>
        !resourceId
            ? `[${ProjectConstants.pluginShortName}] Start to ${operation.displayName} ${resourceType.displayName}.`
            : `[${ProjectConstants.pluginShortName}] Start to ${operation.displayName} ${resourceType.displayName} '${resourceId}'.`;

    public static readonly operationSuccess = (operation: IName, resourceType: IName, resourceId?: string): string =>
        !resourceId
            ? `[${ProjectConstants.pluginShortName}] ${capitalizeFirstLetter(operation.displayName)} ${resourceType.displayName} successfully.`
            : `[${ProjectConstants.pluginShortName}] ${capitalizeFirstLetter(operation.displayName)} ${
                  resourceType.displayName
              } '${resourceId}' successfully.`;

    public static readonly operationFailed = (operation: IName, resourceType: IName, resourceId?: string): string =>
        !resourceId
            ? `[${ProjectConstants.pluginShortName}] Failed to ${operation.displayName} ${resourceType.displayName}`
            : `[${ProjectConstants.pluginShortName}] Failed to ${operation.displayName} ${resourceType.displayName} '${resourceId}'.`;

    public static readonly resourceNotFound = (resourceType: IName, resourceId?: string): string =>
        !resourceId
            ? `[${ProjectConstants.pluginShortName}] Could not found resource ${resourceType.displayName} in Azure.`
            : `[${ProjectConstants.pluginShortName}] Could not found resource ${resourceType.displayName} '${resourceId} in Azure.`;

    public static readonly accessFileFailed = (dir: string, file: string): string =>
        `[${ProjectConstants.pluginShortName}] Cannot access '${file}' in directory '${dir}'`;

    public static readonly openApiDocumentExists = (fileName: string): string =>
        `[${ProjectConstants.pluginShortName}] OpenAPI document '${fileName}' already exists in the project. Skip to scaffold OpenAPI document.`;

    public static readonly useDefaultUserId = `[${ProjectConstants.pluginShortName}] Failed to get user information. Use default user '${ApimDefaultValues.userId}' to create API Management service.`;
}
