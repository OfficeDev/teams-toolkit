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

export enum Stage {
  create = "create",
  build = "build",
  update = "update",
  debug = "debug",
  provision = "provision",
  deploy = "deploy",
  publish = "publish",
  createEnv = "createEnv",
  removeEnv = "removeEnv",
  switchEnv = "switchEnv",
  userTask = "userTask"
}
 