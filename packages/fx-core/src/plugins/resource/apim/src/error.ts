// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { FxError, returnSystemError, returnUserError } from "teamsfx-api";
import { ProjectConstants, ConfigRetryLifeCycle, LifeCycleCommands, TeamsToolkitComponent } from "./constants";

enum ErrorType {
    User,
    System,
}

export interface IApimPluginError {
    type: ErrorType;
    code: string;
    message: (...args: string[]) => string;
    helpLink?: string;
}

// User error
export const EmptyChoice: IApimPluginError = {
    type: ErrorType.User,
    code: "EmptyChoice",
    message: (question: string) => `No option in question '${question}' is selected, please choose one.`,
};

export const NoValidOpenApiDocument: IApimPluginError = {
    type: ErrorType.User,
    code: "NoValidOpenApiDocument",
    message: () => "There is no valid OpenApi document under the workspace.",
    helpLink: "https://swagger.io/resources/open-api/",
};

export const InvalidOpenApiDocument: IApimPluginError = {
    type: ErrorType.User,
    code: "InvalidOpenApiDocument",
    message: (filePath: string) => `The file '${filePath}' is not a valid OpenApi document.`,
    helpLink: "https://swagger.io/resources/open-api/",
};

export const InvalidAadObjectId: IApimPluginError = {
    type: ErrorType.User,
    code: "InvalidAadObjectId",
    message: (objectId: string) => `The Azure Active Directory application with object id '${objectId}' could not be found.`,
};

export const EmptyConfigValue: IApimPluginError = {
    type: ErrorType.User,
    code: "EmptyConfigValue",
    message: (component: string, name: string, retryCommand: string) =>
        `Project configuration '${name}' of ${component} is missing in '${ProjectConstants.configFilePath}'. Please retry to ${retryCommand} or set the value manually.`,
};

export const NoPluginConfig: IApimPluginError = {
    type: ErrorType.User,
    code: "NoPluginConfig",
    message: (component: string, retryCommand: string) => `Cannot found ${component} configuration. Please retry to ${retryCommand}.`,
};

// System error
export const NotImplemented: IApimPluginError = {
    type: ErrorType.System,
    code: "NotImplemented",
    message: () => `Not implemented.`,
};

export const InvalidFunctionEndpoint: IApimPluginError = {
    type: ErrorType.System,
    code: "InvalidFunctionEndpoint",
    message: () => `The function endpoint scheme should be 'http' or 'https'.`,
};

export const InvalidAzureResourceId: IApimPluginError = {
    type: ErrorType.System,
    code: "InvalidAzureResourceId",
    message: (resourceId: string) => `Invalid Azure resource id ${resourceId}.`,
};

export const InvalidApimServiceChoice: IApimPluginError = {
    type: ErrorType.System,
    code: "InvalidApimServiceChoice",
    message: (serviceName: string) => `The selected API Management service '${serviceName}' is invalid.`,
};

export const EmptyProperty: IApimPluginError = {
    type: ErrorType.System,
    code: "EmptyProperty",
    message: (name: string) => `Property '${name}' is empty.`,
};

export const InvalidPropertyType: IApimPluginError = {
    type: ErrorType.System,
    code: "InvalidPropertyType",
    message: (name: string, type: string) => `Property '${name}' is not type '${type}'`,
};

export const ApimOperationError: IApimPluginError = {
    type: ErrorType.System,
    code: "ApimOperationError",
    message: (operation: string, resourceType: string) => `Failed to ${operation} ${resourceType}.`,
};

export const AadOperationError: IApimPluginError = {
    type: ErrorType.System,
    code: "AadOperationError",
    message: (operation: string, resourceType: string) => `Failed to ${operation} ${resourceType}.`,
};

export const UnhandledError: IApimPluginError = {
    type: ErrorType.System,
    code: "UnhandledError",
    message: () => `Unhandled error.`,
};

export function BuildError(pluginError: IApimPluginError, innerError: Error, ...params: string[]): FxError;
export function BuildError(pluginError: IApimPluginError, ...params: string[]): FxError;
export function BuildError(pluginError: IApimPluginError, ...params: any[]): FxError {
    let innerError: Error | undefined = undefined;
    if (params.length > 0 && params[0] instanceof Error) {
        innerError = params.shift();
    }

    const message = !innerError ? pluginError.message(...params) : `${pluginError.message(...params)} ${innerError?.message}`;
    switch (pluginError.type) {
        case ErrorType.User:
            return returnUserError(new Error(message), ProjectConstants.pluginShortName, pluginError.code, pluginError.helpLink, innerError);
        case ErrorType.System:
            return returnSystemError(new Error(message), ProjectConstants.pluginShortName, pluginError.code, pluginError.helpLink, innerError);
    }
}

// Assert
export function AssertNotEmpty(name: string, value: string | undefined): string;
export function AssertNotEmpty<T>(name: string, value: T | undefined): T;
export function AssertNotEmpty(name: string, value: any): any {
    if (!value) {
        throw BuildError(EmptyProperty, name);
    }

    return value;
}

export function AssertConfigNotEmpty<T>(component: TeamsToolkitComponent, name: string, value: T | undefined): T {
    if (!value) {
        throw BuildError(EmptyConfigValue, component, name, LifeCycleCommands[ConfigRetryLifeCycle[component][name]]);
    }

    return value;
}
