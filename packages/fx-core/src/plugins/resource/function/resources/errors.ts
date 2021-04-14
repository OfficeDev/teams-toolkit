// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ConfigFolderName, SystemError, UserError } from "fx-api";

import { FunctionPluginPathInfo } from "../constants";
import { Logger } from "../utils/logger";

export enum ErrorType {
    User,
    System
}

const tips = {
    recoverTeamsfxConfigFiles: `If you manually changed TeamsFX configure files (files under .${ConfigFolderName}), please recover them.`,
    recreateProject: "If you can not recover TeamsFX configure files, please start a new project.",
    checkNetwork: "Check your network connection.",
    retryRequest: "Retry the failed command after network connection resume.",
    chooseAnotherCompose: "Create a project with another compose.",
    resolveWithLog: "Check log for error call stack, try to resolve it if it is a popular error.",
    reportIssue: "Report an issue to us with error log.",
    checkDiskLock: "Check log to see whether there is a file locked by some process.",
    checkPathAccess: "Check log to see whether target path exists and you have write access to it.",
    checkSubscriptionId: "Check whether you choose correct subscription.",
    checkCredit: "Check the credit and capability of the chosen subscription.",
    checkLog: "Read log for more information.",
    checkStorageAccount: "Check your Azure storage account through Microsoft Azure Portal.",
    recreateStorageAccount: "Remove your Azure storage account instance and do provision again.",
    dotnetVersionUpdate: "Install .Net Core 3.1 or 5.0.",
    nugetAccess: "Check your access to TeamsFx binding.",
    checkPackageJson: "Check the correctness of package.json.",
    checkCredential: "Check if you have already login with correct account.",
    doFullDeploy: `Remove ${FunctionPluginPathInfo.solutionFolderName}/${FunctionPluginPathInfo.funcDeploymentFolderName} to trigger full zip.`,
    doScaffold: "Run 'Start A New Project' again.",
    doProvision: "Run 'Provision Resource' before this command."
};

export class FunctionPluginError extends Error {
    public code: string;
    public message: string;
    public suggestions: string[];
    public errorType: ErrorType;

    constructor (errorType: ErrorType, code: string, message: string, suggestions: string[]) {
        super(message);
        this.code = code;
        this.message = message;
        this.suggestions = [ tips.checkLog ].concat(suggestions);
        this.errorType = errorType;
        Object.setPrototypeOf(this, ValidationError.prototype);
    }

    getMessage() {
        return `${this.message} Suggestions: ${this.suggestions.join("\n")}`;
    }
}

export class NoFunctionNameFromAnswer extends FunctionPluginError {
    constructor() {
        super(
            ErrorType.System,
            "NoFunctionNameFromAnswer",
            "Failed to find function name from answer.",
            [
                tips.reportIssue
            ]
        );
    }
}

export class NotScaffoldError extends FunctionPluginError {
    constructor() {
        super(
            ErrorType.User,
            "NotScaffoldError",
            "Scaffold has not done successfully.",
            [
                tips.doScaffold
            ]
        );
    }
}

export class NotProvisionError extends FunctionPluginError {
    constructor() {
        super(
            ErrorType.User,
            "NotProvisionError",
            "Provision has not done successfully.",
            [
                tips.doProvision
            ]
        );
    }
}

export class FetchConfigError extends FunctionPluginError {
    constructor(key: string) {
        super(
            ErrorType.User,
            "FetchConfigError",
            `Failed to find ${key} from config.`,
            [
                tips.recoverTeamsfxConfigFiles,
                tips.recreateProject
            ]
        );
    }
}

export class ValidationError extends FunctionPluginError {
    constructor(key: string) {
        super(
            ErrorType.User,
            "FetchConfigError",
            `Miss or found invalid ${key} from config.`,
            [
                tips.recoverTeamsfxConfigFiles,
                tips.recreateProject
            ]
        );
    }
}

export class TemplateManifestNetworkError extends FunctionPluginError {
    constructor(url: string) {
        super(
            ErrorType.User,
            "TemplateManifestNetworkError",
            `Failed to fetch template package list from ${url}.`,
            [
                tips.checkNetwork,
                tips.retryRequest
            ]
        );
    }
}

export class TemplateZipNetworkError extends FunctionPluginError {
    constructor(url: string) {
        super(
            ErrorType.User,
            "TemplateZipNetworkError",
            `Failed to download zip package from ${url}.`,
            [
                tips.checkNetwork,
                tips.retryRequest
            ]
        );
    }
}

export class TemplateZipFallbackError extends FunctionPluginError {
    constructor() {
        super(
            ErrorType.User,
            "TemplateZipFallbackError",
            "Failed to fetch template zip from network and open local fallback zip package.",
            [
                tips.checkNetwork,
                tips.retryRequest
            ]
        );
    }
}


export class BadTemplateManifestError extends FunctionPluginError {
    constructor(compose: string) {
        super(
            ErrorType.User,
            "BadTemplateManifestError",
            `Failed to find a template satisfied the compose ${compose}.`,
            [
                tips.chooseAnotherCompose,
            ]
        );
    }
}

export class UnzipError extends FunctionPluginError {
    constructor() {
        super(
            ErrorType.User,
            "UnzipError",
            "Failed to unzip templates and write to disk.",
            [
                tips.checkDiskLock,
                tips.checkPathAccess
            ]
        );
    }
}

export class ProvisionError extends FunctionPluginError {
    constructor(resource: string) {
        super(
            ErrorType.User,
            "ProvisionError",
            `Failed to check/create ${resource} for Azure function app.`,
            [
                tips.checkSubscriptionId,
                tips.checkCredit,
                tips.checkNetwork,
                tips.retryRequest
            ]
        );
    }
}

export class GetConnectionStringError extends FunctionPluginError {
    constructor() {
        super(
            ErrorType.System,
            "GetConnectionStringError",
            "Failed to get connection string of Azure storage account.",
            [
                tips.checkStorageAccount,
                tips.recreateStorageAccount,
                tips.checkNetwork,
                tips.retryRequest,
            ]
        );
    }
}

export class ConfigFunctionAppError extends FunctionPluginError {
    constructor() {
        super(
            ErrorType.System,
            "ConfigFunctionAppError",
            "Failed to find and config Azure function app settings.",
            [
                tips.checkSubscriptionId,
                tips.checkNetwork,
                tips.retryRequest,
                tips.reportIssue
            ]
        );
    }
}

export class FunctionAppOpError extends FunctionPluginError {
    constructor(op: string) {
        super(
            ErrorType.System,
            "RestartFunctionAppError",
            `Failed to execute '${op}' on the Azure function app.`,
            [
                tips.checkNetwork,
                tips.retryRequest
            ]
        );
    }
}

export class DotnetError extends FunctionPluginError {
    constructor(message: string) {
        super(
            ErrorType.User,
            "DotnetError",
            message,
            []
        );
    }
}

export class DotnetVersionError extends FunctionPluginError {
    constructor() {
        super(
            ErrorType.User,
            "DotnetVersionError",
            "Failed to check .Net Core version.",
            [
                tips.dotnetVersionUpdate
            ]
        );
    }
}

export class InstallTeamsfxBindingError extends FunctionPluginError {
    constructor() {
        super(
            ErrorType.User,
            "InstallTeamsfxBindingError",
            "Failed to install TeamsFX binding.",
            [
                tips.dotnetVersionUpdate,
                tips.nugetAccess
            ]
        );
    }
}

export class InstallNpmPackageError extends FunctionPluginError {
    constructor() {
        super(
            ErrorType.User,
            "InstallNpmPackageError",
            "Failed to install npm packages.",
            [
                tips.checkPackageJson
            ]
        );
    }
}

export class InitAzureSDKError extends FunctionPluginError {
    constructor() {
        super(
            ErrorType.User,
            "InitAzureSDKError",
            "Failed to init Azure SDK Client.",
            [
                tips.checkCredential,
                tips.checkSubscriptionId
            ]
        );
    }
}

export class ZipError extends FunctionPluginError {
    constructor() {
        super(
            ErrorType.User,
            "ZipError",
            "Failed to generate zip package.",
            [
                tips.checkDiskLock,
                tips.checkPathAccess,
                tips.doFullDeploy
            ]
        );
    }
}

export class PublishCredentialError extends FunctionPluginError {
    constructor() {
        super(
            ErrorType.User,
            "PublishCredentialError",
            "Failed to get publish credential.",
            [
                tips.checkCredential,
                tips.checkSubscriptionId,
                tips.checkNetwork,
                tips.retryRequest,
                tips.doProvision
            ]
        );
    }
}

export class UploadZipError extends FunctionPluginError {
    constructor() {
        super(
            ErrorType.System,
            "UploadZipError",
            "Failed to upload zip package.",
            [
                tips.checkNetwork,
                tips.retryRequest
            ]
        );
    }
}

export async function runWithErrorCatchAndThrow<T>(error: FunctionPluginError, fn: () => T | Promise<T>): Promise<T> {
    try {
        const res = await Promise.resolve(fn());
        return res;
    } catch(e) {
        if (e instanceof UserError || e instanceof SystemError) {
            throw e;
        }
        Logger.error(e.toString());
        throw error;
    }
}
