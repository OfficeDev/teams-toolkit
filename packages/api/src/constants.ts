// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
'use strict';

export enum Stage
{
    create = "create",
    update = "update",
    debug = "debug",
    provision = "provision",
    deploy = "deploy",
    publish = "publish",
    userTask = "userTask"
}

export type PredefinedTask = Stage.create|Stage.update|Stage.debug|Stage.provision|Stage.deploy|Stage.publish;

export enum Platform
{
    VSCode = "vsc",
    VS = "vs",
    CLI = "cli"
}

export const ConfName = 'teamsfx';