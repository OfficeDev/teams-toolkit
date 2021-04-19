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
    doScaffold: `Run 'Start A New Project' again.`,
    doProvision: `Run 'Provision Resource' before this command.`,
    doLogin: "Login to Azure.",
    reProvision: `Run 'Provision Resource' again.`,
    doBuild: `Run 'npm install' and 'npm run build' in '${FrontendPathInfo.WorkingDir}' folder.`,
    ensureBuildPath: `Ensure your built project in '${FrontendPathInfo.BuildPath}'.`,
    ensureAppNameValid:
        "Ensure your app name only contains alphabetical and numeric characters, and does not contain a trademark or reserved word.",
    checkNetwork: "Check your network connection.",
    checkFsPermissions: "Check if you have Read/Write permissions to your file system.",
    checkStoragePermissions: "Check if you have full permissions to Azure Storage Account.",
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

export class NotScaffoldError extends FrontendPluginError {
    constructor() {
        super(ErrorType.User, "NotScaffoldError", "Scaffold has not completed successfully.", [tips.doScaffold]);
    }
}

export class UnauthenticatedError extends FrontendPluginError {
    constructor() {
        super(ErrorType.User, "UnauthenticatedError", "Failed to get user login information.", [tips.doLogin]);
    }
}

export class NotProvisionError extends FrontendPluginError {
    constructor() {
        super(ErrorType.User, "NotProvisionError", "Provision has not completed successfully.", [tips.doProvision]);
    }
}

export class NoResourceGroupError extends FrontendPluginError {
    constructor() {
        super(ErrorType.User, "NoResourceGroupError", "Failed to find resource group.", [tips.reProvision]);
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
            "Static website feature is disabled for Azure Storage Account.",
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
        super(ErrorType.System, "CreateStorageAccountError", "Failed to create Azure Storage Account.", [
            tips.ensureAppNameValid,
            tips.checkNetwork,
        ]);
    }
}

export class EnableStaticWebsiteError extends FrontendPluginError {
    constructor() {
        super(
            ErrorType.System,
            "EnableStaticWebsiteError",
            "Failed to enable static website feature for Azure Storage Account.",
            [tips.checkStoragePermissions, tips.checkNetwork],
        );
    }
}

export class ClearStorageError extends FrontendPluginError {
    constructor() {
        super(ErrorType.System, "ClearStorageError", "Failed to clear Azure Storage Account.", [tips.checkNetwork]);
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
            [tips.checkNetwork],
        );
    }
}

export class GetContainerError extends FrontendPluginError {
    constructor() {
        super(
            ErrorType.System,
            "GetContainerError",
            `Failed to get container '${Constants.AzureStorageWebContainer}' from Azure Storage Account.`,
            [tips.checkStoragePermissions, tips.checkNetwork],
        );
    }
}

export class FetchTemplateManifestError extends FrontendPluginError {
    constructor() {
        super(ErrorType.System, "FetchTemplateManifestError", "Failed to fetch manifest.", [
            tips.checkNetwork,
        ]);
    }
}

export class InvalidTemplateManifestError extends FrontendPluginError {
    constructor() {
        super(ErrorType.System, "InvalidTemplateManifestError", "Failed to find template.", []);
    }
}

export class FetchTemplatePackageError extends FrontendPluginError {
    constructor() {
        super(ErrorType.System, "FetchTemplatePackageError", "Failed to fetch template package.", [tips.checkNetwork]);
    }
}

export class GetTemplateError extends FrontendPluginError {
    constructor() {
        super(ErrorType.User, "GetTemplateError", "Failed to fetch template.", [
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

export class BuildError extends FrontendPluginError {
    constructor() {
        super(ErrorType.User, "BuildError", "Failed to build Tab app.", [
            tips.doBuild,
            tips.ensureBuildPath,
        ]);
    }
}

export class NpmInstallError extends FrontendPluginError {
    constructor() {
        super(ErrorType.User, "NpmInstallError", `Failed to run 'npm install' for Tab app.`, [
            tips.doBuild,
            tips.checkNetwork,
        ]);
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
