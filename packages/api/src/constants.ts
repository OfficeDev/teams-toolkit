// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

export const ConfigFolderName = "fx";
export const AppPackageFolderName = "appPackage";
export const AdaptiveCardsFolderName = "adaptiveCards";
export const InputConfigsFolderName = "configs";
export const StatesFolderName = "states";
export const ProjectSettingsFileName = "projectSettings.json";
export const EnvNamePlaceholder = "@envName";
export const EnvConfigFileNameTemplate = `config.${EnvNamePlaceholder}.json`;
export const EnvStateFileNameTemplate = `state.${EnvNamePlaceholder}.json`;
export const LocalEnvironmentName = "local";
export const ProductName = "teamsfx";
export const ArchiveFolderName = ".archive";
export const ArchiveLogFileName = ".archive.log";
export const V1ManifestFileName = "manifest.json";

/**
 * questions for VS and CLI_HELP platforms are static question which don't depend on project context
 * questions for VSCode and CLI platforms are dynamic question which depend on project context
 */
export enum Platform {
  VSCode = "vsc",
  CLI = "cli",
  VS = "vs",
  CLI_HELP = "cli_help",
}

export const StaticPlatforms = [Platform.VS, Platform.CLI_HELP];
export const DynamicPlatforms = [Platform.VSCode, Platform.CLI];
export const CLIPlatforms = [Platform.CLI, Platform.CLI_HELP];

export enum VsCodeEnv {
  local = "local",
  codespaceBrowser = "codespaceBrowser",
  codespaceVsCode = "codespaceVsCode",
  remote = "remote",
}

export enum Stage {
  create = "create",
  migrateV1 = "migrateV1",
  build = "build",
  debug = "debug",
  provision = "provision",
  deploy = "deploy",
  package = "package",
  publish = "publish",
  createEnv = "createEnv",
  listEnv = "listEnv",
  removeEnv = "removeEnv",
  switchEnv = "switchEnv",
  activateEnv = "activateEnv",
  userTask = "userTask",
  update = "update", //never used again except APIM just for reference
  grantPermission = "grantPermission",
  checkPermission = "checkPermission",
  listCollaborator = "listCollaborator",
  listAllCollaborators = "listAllCollaborators",
  getQuestions = "getQuestions",
  getProjectConfig = "getProjectConfig",
}

export enum TelemetryEvent {
  askQuestion = "askQuestion",
}

export enum TelemetryProperty {
  answerType = "answerType",
  question = "question",
  answer = "answer",
  platform = "platform",
  stage = "stage",
}

/**
 * You can register your callback function when you want to be notified
 * at some predefined events.
 */
export enum CoreCallbackEvent {
  lock = "lock",
  unlock = "unlock",
}
