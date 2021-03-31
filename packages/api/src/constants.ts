// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export const ProductName = "teamsfx";

export enum Task
{
    create = "create",
    update = "update",
    debug = "debug",
    provision = "provision",
    deploy = "deploy",
    publish = "publish",
    userTask = "userTask"
}

export type PredefinedTask = Task.create|Task.update|Task.debug|Task.provision|Task.deploy|Task.publish;

export enum Platform
{
    VSCode = "vsc",
    VS = "vs",
    CLI = "cli"
}

