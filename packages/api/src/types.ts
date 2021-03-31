// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";



export enum PluginType {
    Frontend = "Frontend",
    Backend = "Backend",
    DataStorage = "DataStorage",
}

export interface Json {
    [k: string]: any;
}

export enum LifecycleStage {
    Init,
    Scaffold,
    Provision,
    Build,
    Test,
    Run,
    Debug,
    Deploy,
    Publish,
}

export enum Stage
{
    create = "create",
    update = "update",
    debug = "debug",
    provision = "provision",
    deploy = "deploy",
    publish = "publish",
}

export enum Platform
{
    VSCode = "vsc",
    VS = "vs",
    CLI = "cli"
}

