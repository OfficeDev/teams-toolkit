// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { Func, Inputs,  Stage, SystemError, UserError } from "@microsoft/teamsfx-api";

export const CoreSource = "Core";

export function ProjectFolderExistError(path:string){ 
  return new UserError(
    "ProjectFolderExistError",
    `Path ${path} alreay exists. Select a different folder.`,
    CoreSource,
    new Error().stack
  );
}

export function WriteFileError(e: Error): SystemError {
  return new SystemError(
    "WriteFileError", 
    `write file error ${e["message"]}`, 
    CoreSource, 
    e.stack, 
    undefined, 
    e);
}

export function ReadFileError(e: Error): SystemError {
  return new SystemError(
    "ReadFileError", 
    `read file error ${e["message"]}`, 
    CoreSource, 
    e.stack, 
    undefined, 
    e);
}

export function NoneFxError(e: Error): SystemError {
  return new SystemError("NoneFxError", 
    `NoneFxError ${e["message"]}`, 
    CoreSource, 
    e.stack, 
    undefined, 
    e);
}
 
export function NoProjectOpenedError(){
  return new UserError(
    "NoProjectOpened",
    "No project opened, you can create a new project or open an existing one.",
    CoreSource,
    new Error().stack
  );
}

export function InvalidProjectError(msg?:string){
  return new UserError(
    "InvalidProject",
    `The project config is invalid ${msg?":"+msg : ""}`,
    CoreSource,
    new Error().stack
  );
}

export function ConcurrentError(){ 
  return new UserError( "ConcurrentOperation", 
    "Concurrent operation error, please wait until the running task finishs or you can reload the window to cancel it.", 
    CoreSource, 
    new Error().stack
  );
}

export function TaskNotSupportError(task:Stage) {
  return new SystemError("TaskNotSupport", `Task is not supported yet: ${task}`, CoreSource, new Error().stack);
}
 
export function FetchSampleError(){ 
  return new UserError(
    "FetchSampleError",
    "Failed to download sample app",
    CoreSource,
    new Error().stack
  );
}

export function InvalidInputError(reason:string, inputs?:Inputs){
  return new UserError(
    "InvalidInput",
    inputs ? `Invalid inputs: ${reason}, inputs: ${JSON.stringify(inputs)}` : `Invalid inputs: ${reason}`,
    CoreSource,
    new Error().stack
  )
};

export function FunctionRouterError(func:Func){
  return new UserError(
    "FunctionRouterError",
    `Failed to route function call:${JSON.stringify(func)}`,
    CoreSource,
    new Error().stack
  )
}