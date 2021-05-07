// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { returnUserError, SystemError, UserError } from "fx-api";
import { Constants } from "./utils/constants";
import * as util from "util";

export function NoSPPackageError(distFolder: string): UserError {
    return returnUserError(new Error(util.format(
        "Cannot find SharePoint package %s",
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