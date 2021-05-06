// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { returnSystemError, returnUserError, SystemError, UserError } from "fx-api";
import { Constants } from "./utils/constants";
import * as util from "util";
import { AxiosError } from "axios";

function processAxiosError(axoisError: AxiosError, errorName: string): SystemError {
    const requestID = axoisError?.response?.headers["request-id"];
    let errMessage = JSON.stringify(axoisError?.response?.data);
    if (!errMessage){
        errMessage = axoisError.message;
    }
    const error = new Error(errMessage);
    error.stack = axoisError.stack;
    return returnSystemError(error, Constants.PLUGIN_NAME, errorName,"",{"request-id":requestID});
}

export function EnsureAppCatalogFailedError(axoisError: AxiosError): SystemError {
    return processAxiosError(axoisError, "EnsureAppCatalogFailed");
}

export function UploadSPPackageError(axoisError: AxiosError): SystemError {
    return processAxiosError(axoisError, "UploadSPPackageError");
}

export function DeploySPPackageError(axoisError: AxiosError): SystemError {
    return processAxiosError(axoisError, "DeploySPPackageError");
}

export function NoAppCatalogError(tenant: string): UserError {
    return returnUserError(new Error(
        util.format(
            "There is no App Catalog site for tenant %s, please contact your global admin or tenant admin.",
            tenant
        )), Constants.PLUGIN_NAME, "NoAppCatalog");
}

export function NoSPPackageError(distFolder: string): UserError {
    return returnUserError(new Error(util.format(
        "Cannot find SharePoint package %s",
        distFolder
    )), Constants.PLUGIN_NAME, "NoSharePointPackage");
}

export function MultiSPPackageError(distFolder: string): UserError {
    return returnUserError(new Error(util.format(
        "There are multiple SharePoint packages(files with *.sppkg extension)under %s",
        distFolder
    )), Constants.PLUGIN_NAME, "NoSharePointPackage");
}

export function BuildSPPackageError(error: Error): UserError | SystemError {
    if (error instanceof UserError || error instanceof SystemError) {
        return error;
    }
    else {
        return returnUserError(error, Constants.PLUGIN_NAME, "BuildSPFxPackageFail");
    }
}

export function SPFxDeployError(error: Error): UserError | SystemError {
    if (error instanceof UserError || error instanceof SystemError) {
        return error;
    }
    else {
        return returnSystemError(error, Constants.PLUGIN_NAME, "SPFxDeployError");
    }
}

export function EmptyAccessTokenError(): SystemError {
    return returnSystemError(
        new Error("EmptyAccessToken"),
        Constants.PLUGIN_NAME,
        "LoginFail"
    );
}