// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Constants, FrontendPathInfo } from "../constants";
import { Logger } from "../utils/logger";
import path from "path";

export enum ErrorType {
    User,
    System,
}

const tips = {
    checkLog: "Check log for more information.",
    reScaffold: `Run 'Start A New Project' again.`,
    doProvision: `Run 'Provision Resource' before this command.`,
    doLogin: "Login to Azure.",
    reLogin: "Sign out and login to Azure again.",
    reProvision: `Run 'Provision Resource' again.`,
    doNpmInstall: `Run 'npm install' in the folder: '${FrontendPathInfo.WorkingDir}'.`,
    doBuild: `Run npm run build' in the folder: '${FrontendPathInfo.WorkingDir}'.`,
    ensureBuildPath: `Ensure your built project exists: '${FrontendPathInfo.BuildPath}'.`,
    ensureResourceGroup: "Ensure your resource group exists",
    ensureAppNameValid:
        "Ensure your app name only contains alphabetical and numeric characters, and does not contain trademark or reserved words.",
    deleteSameNameStorage: "Delete your Azure Storage Account with same name in another resource group or subscription",
    checkNetwork: "Check your network connection.",
    checkFsPermissions: "Check if you have Read/Write permissions to your file system.",
    checkStoragePermissions: "Check if you have permissions to your Azure Storage Account.",
    checkSystemTime: "You may get expired credentials, check if your system time is correct.",
    restoreEnvironment: "Restore the 'env.default.json' file if you modified it.",
};

export class FrontendPluginError extends Error {
    public code: string;
    public message: string;
    public suggestions: string[];
    public errorType: ErrorType;
    public innerError?: Error;

    constructor(errorType: ErrorType, code: string, message: string, suggestions: string[]) {
        super(message);
        this.code = code;
        this.message = message;
        this.suggestions = suggestions.concat(tips.checkLog);
        this.errorType = errorType;
    }

    getMessage(): string {
        return `${this.message} Suggestions: ${this.suggestions.join("\n")}`;
    }

    setInnerError(error: Error): void {
        this.innerError = error;
    }

    getInnerError(): Error | undefined {
        return this.innerError;
    }
}

export class UnauthenticatedError extends FrontendPluginError {
    constructor() {
        super(ErrorType.User, "UnauthenticatedError", "Failed to get user login information.", [tips.doLogin]);
    }
}

export class NoConfigsError extends FrontendPluginError {
    constructor() {
        super(ErrorType.System, "NoConfigsError", "Failed to get configs.", [tips.checkLog]);
    }
}

export class InvalidConfigError extends FrontendPluginError {
    constructor(key: string) {
        super(ErrorType.User, "InvalidConfigError", `Get invalid ${key}`, [tips.restoreEnvironment]);
    }
}

export class CheckResourceGroupError extends FrontendPluginError {
    constructor() {
        super(ErrorType.User, "CheckResourceGroupError", "Failed to check resource group existence.", [tips.reLogin]);
    }
}

export class NoResourceGroupError extends FrontendPluginError {
    constructor() {
        super(ErrorType.User, "NoResourceGroupError", "Failed to find resource group.", [tips.ensureResourceGroup]);
    }
}

export class CheckStorageError extends FrontendPluginError {
    constructor() {
        super(ErrorType.User, "CheckStorageError", "Failed to check Azure Storage Account availability", [tips.reLogin, tips.checkSystemTime]);
    }
}

export class NoStorageError extends FrontendPluginError {
    constructor() {
        super(ErrorType.User, "NoStorageError", "Failed to find Azure Storage Account.", [tips.reProvision]);
    }
}

export class StaticWebsiteDisabledError extends FrontendPluginError {
    constructor() {
        super(
            ErrorType.User,
            "StaticWebsiteDisableError",
            "Static website hosting feature is disabled for Azure Storage Account.",
            [tips.reProvision],
        );
    }
}

export class InvalidStorageNameError extends FrontendPluginError {
    constructor() {
        super(ErrorType.User, "InvalidStorageNameError", "Azure Storage Name is invalid.", [
            tips.ensureAppNameValid,
        ]);
    }
}

export class CreateStorageAccountError extends FrontendPluginError {
    constructor() {
        super(ErrorType.User, "CreateStorageAccountError", "Failed to create Azure Storage Account.", [
            tips.ensureAppNameValid,
            tips.deleteSameNameStorage,
        ]);
    }
}

export class EnableStaticWebsiteError extends FrontendPluginError {
    constructor() {
        super(
            ErrorType.System,
            "EnableStaticWebsiteError",
            "Failed to enable static website feature for Azure Storage Account.",
            [tips.checkSystemTime, tips.checkStoragePermissions],
        );
    }
}

export class ClearStorageError extends FrontendPluginError {
    constructor() {
        super(ErrorType.System, "ClearStorageError", "Failed to clear Azure Storage Account.", [tips.checkSystemTime, tips.checkNetwork]);
    }
}

export class UploadToStorageError extends FrontendPluginError {
    constructor() {
        super(
            ErrorType.System,
            "UploadToStorageError",
            `Failed to upload local path ${path.join(
                FrontendPathInfo.WorkingDir,
                FrontendPathInfo.BuildPath,
            )} to Azure Storage Account.`,
            [tips.checkSystemTime, tips.checkNetwork],
        );
    }
}

export class GetContainerError extends FrontendPluginError {
    constructor() {
        super(
            ErrorType.System,
            "GetContainerError",
            `Failed to get container '${Constants.AzureStorageWebContainer}' from Azure Storage Account.`,
            [tips.checkSystemTime, tips.checkStoragePermissions, tips.checkNetwork],
        );
    }
}

export class FetchTemplateManifestError extends FrontendPluginError {
    constructor() {
        super(ErrorType.System, "FetchTemplateManifestError", "Failed to fetch template manifest.", [
            tips.checkNetwork,
        ]);
    }
}

export class InvalidTemplateManifestError extends FrontendPluginError {
    constructor(compose: string) {
        super(ErrorType.System, "InvalidTemplateManifestError", `Failed to find template for ${compose}.`, []);
    }
}

export class FetchTemplatePackageError extends FrontendPluginError {
    constructor() {
        super(ErrorType.System, "FetchTemplatePackageError", "Failed to fetch template package.", [tips.checkNetwork]);
    }
}

export class GetTemplateError extends FrontendPluginError {
    constructor() {
        super(ErrorType.System, "GetTemplateError", "Failed to fetch template.", [
            tips.checkNetwork,
            tips.checkFsPermissions,
        ]);
    }
}

export class UnzipTemplateError extends FrontendPluginError {
    constructor() {
        super(ErrorType.User, "UnzipTemplateError", "Failed to unzip template package.", [
            tips.checkFsPermissions,
        ]);
    }
}

export class NoBuildPathError extends FrontendPluginError {
    constructor() {
        super(ErrorType.User, "NoBuildPathError", `Failed to find 'build' folder.`, [tips.doBuild, tips.ensureBuildPath]);
    }
}

export class BuildError extends FrontendPluginError {
    constructor() {
        super(ErrorType.User, "BuildError", "Failed to build Tab app.", [
            tips.doBuild,
            tips.checkLog,
        ]);
    }
}

export class NpmInstallError extends FrontendPluginError {
    constructor() {
        super(ErrorType.User, "NpmInstallError", `Failed to run 'npm install' for Tab app.`, [
            tips.doNpmInstall,
            tips.checkLog,
        ]);
    }
}

export class InvalidTabLanguageError extends FrontendPluginError {
    constructor() {
        super(ErrorType.User, "InvalidTabLanguageError", "The selected programming language yet is not supported by Tab.", [tips.restoreEnvironment, tips.reScaffold]);
    }
}

export const UnhandledErrorCode = "UnhandledError";
export const UnhandledErrorMessage = "Unhandled error.";

export async function runWithErrorCatchAndThrow<T>(error: FrontendPluginError, fn: () => T | Promise<T>): Promise<T> {
    try {
        const res = await Promise.resolve(fn());
        return res;
    } catch (e) {
        Logger.error(e.toString());
        error.setInnerError(e);
        throw error;
    }
}
