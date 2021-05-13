// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export const ConfigFolderName = "fx";
export const ProductName = "teamsfx";

export enum Platform {
  VSCode = "vsc",
  VS = "vs",
  CLI = "cli",
}

export enum VsCodeEnv {
  local = "local",
  codespaceBrowser = "codespaceBrowser",
  codespaceVsCode = "codespaceVsCode",
  remote = "remote",
}

export enum Task {
  create = "create",
  update = "update",
  debug = "debug",
  provision = "provision",
  deploy = "deploy",
  publish = "publish",
  userTask = "userTask",
}

export enum Stage {
  create = "create",
  update = "update",
  debug = "debug",
  provision = "provision",
  deploy = "deploy",
  publish = "publish",
  userTask = "userTask",
}

export type PredefinedTask =
  | Task.create
  | Task.update
  | Task.debug
  | Task.provision
  | Task.deploy
  | Task.publish;
