// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";


export const ConfigFolderName = "fx";

export const ProductName = "teamsfx";

export enum Platform
{
    VSCode = "vsc",
    VS = "vs",
    CLI = "cli"
}

export enum VsCodeEnv
{
    local = "local",
    codespaceBrowser = "codespaceBrowser",
    codespaceVsCode = "codespaceVsCode",
    remoteContainer = "remoteContainer"
}
 
export enum Task
{
    create = "create",
    provision = "provision",
    deploy = "deploy",
    publish = "publish"
}
