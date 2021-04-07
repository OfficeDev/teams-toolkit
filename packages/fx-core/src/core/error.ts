// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
 
import {returnSystemError, returnUserError, SystemError, UserError} from "fx-api";

export const CoreSource = "Core";

export enum CoreErrorNames {
    InvalidInput = "InvalidInput",
    ProjectFolderExist = "ProjectFolderExist",
    WriteFileError = "WriteFileError",
    ReadFileError = "ReadFileError",
    CallFuncRouteFailed = "CallFuncRouteFailed",
    getQuestionsForUserTaskRouteFailed = "getQuestionsForUserTaskRouteFailed",
    executeUserTaskRouteFailed = "executeUserTaskRouteFailed",
    InvalidContext = "InvalidContext",
    EnvAlreadyExist = "EnvAlreadyExist",
    EnvNotExist = "EnvNotExist",
    LoadSolutionFailed = "LoadSolutionFailed",
    FileNotFound = "FileNotFound",
    UncatchedError = "UncatchedError",
    NotSupportedProjectType = "NotSupportedProjectType",
    InitError = "InitError",
}

export function InvalidContext(): UserError {
    return returnUserError(new Error("InvalidContext"), CoreSource, CoreErrorNames.InvalidContext);
}

export function WriteFileError(e: Error): SystemError {
    return returnSystemError(e, CoreSource, CoreErrorNames.WriteFileError);
}

export function ReadFileError(e: Error): SystemError {
    return returnSystemError(e, CoreSource, CoreErrorNames.ReadFileError);
}

export function EnvAlreadyExist(param: any): UserError {
    return returnUserError(new Error(`Env already exist: ${param}`), CoreSource, CoreErrorNames.EnvAlreadyExist);
}

export function EnvNotExist(param: any): UserError {
    return returnUserError(new Error(`Env not exist: ${param}`), CoreSource, CoreErrorNames.EnvNotExist);
}

export function NotSupportedProjectType(): UserError {
    return returnUserError(new Error(`Project type not supported`), CoreSource, CoreErrorNames.NotSupportedProjectType);
}
