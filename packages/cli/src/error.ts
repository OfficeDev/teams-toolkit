// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { ConfigFolderName, StatesFolderName, SystemError, UserError } from "@microsoft/teamsfx-api";
import * as constants from "./constants";
import { strings } from "./resource";

export function NotSupportedProjectType(): UserError {
  return new UserError(
    constants.cliSource,
    "NotSupportedProjectType",
    "Project type not supported"
  );
}

export function CannotDeployPlugin(pluginName: string): UserError {
  return new UserError(
    constants.cliSource,
    "CannotDeployPlugin",
    `Cannot deploy ${pluginName} since it is not contained in the project`
  );
}

export function NotValidInputValue(inputName: string, msg: string): UserError {
  return new UserError(constants.cliSource, "NotValidInputValue", `${inputName} - ${msg}`);
}

export function NotFoundInputedFolder(folder: string): UserError {
  return new UserError(
    constants.cliSource,
    "NotFoundInputFolder",
    `Cannot find folder (${folder}).`
  );
}

export function NotFoundSubscriptionId(): UserError {
  return new UserError(
    constants.cliSource,
    "NotFoundSubscriptionId",
    "Cannot find selected subscription. Ensure your signed-in account has access to this subscription. " +
      "You can also select another subscription using 'teamsfx account set`."
  );
}

export function ConfigNotFoundError(configpath: string): UserError {
  return new UserError(
    constants.cliSource,
    "ConfigNotFound",
    "Please execute this command in a TeamsFx project."
  );
}

export function SampleAppDownloadFailed(sampleAppUrl: string, e: Error): SystemError {
  e.message = `Cannot download this sample app from ${sampleAppUrl}. Error: ${e.message}`;
  return new SystemError({
    error: e,
    source: constants.cliSource,
    name: "SampleAppDownloadFailed",
  });
}

export function ReadFileError(e: Error): SystemError | UserError {
  if (e.message.includes("Unexpected end of JSON input")) {
    return new UserError(
      constants.cliSource,
      "ReadFileError",
      `${e.message}. Please check the format of it.`
    );
  }
  return new SystemError({ error: e, source: constants.cliSource, name: "ReadFileError" });
}

export function WriteFileError(e: Error): SystemError {
  return new SystemError({ error: e, source: constants.cliSource, name: "WriteFileError" });
}

export function UnknownError(e: Error): SystemError {
  return new SystemError({ error: e, source: constants.cliSource, name: "UnknownError" });
}

export function ProjectFolderExist(path: string): UserError {
  return new UserError(
    constants.cliSource,
    "ProjectFolderExist",
    `Path ${path} alreay exists. Select a different folder.`
  );
}

export function EmptySubConfigOptions(): SystemError {
  return new UserError(
    constants.cliSource,
    "EmptySubConfigOptions",
    "Your Azure account has no active subscriptions. Please switch an Azure account."
  );
}

export function NoInitializedHelpGenerator(): SystemError {
  return new SystemError(
    constants.cliSource,
    "NoInitializedHelpGenerator",
    "Please call the async function -- initializeQuestionsForHelp firstly!"
  );
}

export function NonTeamsFxProjectFolder(): UserError {
  return new UserError(
    constants.cliSource,
    "NonTeamsFxProjectFolder",
    "Current folder is not a TeamsFx project folder."
  );
}

export function ConfigNameNotFound(name: string): UserError {
  return new UserError(
    constants.cliSource,
    "ConfigNameNotFound",
    `Config ${name} is not found in project.`
  );
}

export function InvalidEnvFile(msg: string, path: string): UserError {
  return new UserError(
    constants.cliSource,
    "InvalidEnvFile",
    msg + ` Please check the file ${path}.`
  );
}

export class EnvUndefined extends SystemError {
  constructor() {
    super(constants.cliSource, new.target.name, `env is undefined`);
  }
}

export class EnvNotSpecified extends UserError {
  constructor() {
    super(constants.cliSource, new.target.name, `The --env argument is not specified`);
  }
}

export class EnvNotFound extends UserError {
  constructor(env: string) {
    super(constants.cliSource, new.target.name, `The environment "${env}" is not found`);
  }
}

export class EnvNotProvisioned extends UserError {
  constructor(env: string) {
    super(constants.cliSource, new.target.name, `The environment "${env}" is not provisioned`);
  }
}

export class UserdataNotFound extends UserError {
  constructor(env: string) {
    super(
      constants.cliSource,
      new.target.name,
      `The userdata file ".${ConfigFolderName}/${StatesFolderName}/${env}.userdata" is not found. Please try to provision in the "${env}" envrionment`
    );
  }
}

export class InvalidTemplateName extends UserError {
  constructor(name: string) {
    super({
      source: constants.cliSource,
      message: `Invalid template name: ${name}`,
    });
  }
}

export class NotAllowedMigrationError extends UserError {
  constructor() {
    super({
      source: constants.cliSource,
      message: strings.error.NotAllowedMigrationErrorMessage,
    });
  }
}
