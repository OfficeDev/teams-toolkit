// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import {
  ConfigFolderName,
  EnvNamePlaceholder,
  EnvStateFileNameTemplate,
  returnSystemError,
  returnUserError,
  StatesFolderName,
  SystemError,
  UserError,
} from "@microsoft/teamsfx-api";
import { isMultiEnvEnabled } from "@microsoft/teamsfx-core";

import * as constants from "./constants";

export function NotSupportedProjectType(): UserError {
  return returnUserError(
    new Error(`Project type not supported`),
    constants.cliSource,
    "NotSupportedProjectType"
  );
}

export function CannotDeployPlugin(pluginName: string): UserError {
  return returnUserError(
    new Error(`Cannot deploy ${pluginName} since it is not contained in the project`),
    constants.cliSource,
    "CannotDeployPlugin"
  );
}

export function NotValidInputValue(inputName: string, msg: string): UserError {
  return returnUserError(Error(`${inputName} - ${msg}`), constants.cliSource, "NotValidInputValue");
}

export function NotFoundInputedFolder(folder: string): UserError {
  return returnUserError(
    new Error(`Cannot find folder (${folder}).`),
    constants.cliSource,
    "NotFoundInputFolder"
  );
}

export function NotFoundSubscriptionId(): UserError {
  return returnUserError(
    new Error(
      "Cannot find selected subscription. Ensure your signed-in account has access to this subscription. " +
        "You can also select another subscription using 'teamsfx account set`."
    ),
    constants.cliSource,
    "NotFoundSubscriptionId"
  );
}

export function ConfigNotFoundError(configpath: string): UserError {
  return returnUserError(
    new Error(`Please execute this command in a TeamsFx project.`),
    constants.cliSource,
    "ConfigNotFound"
  );
}

export function SampleAppDownloadFailed(sampleAppUrl: string, e: Error): SystemError {
  e.message = `Cannot download this sample app from ${sampleAppUrl}. Error: ${e.message}`;
  return returnSystemError(e, constants.cliSource, "SampleAppDownloadFailed");
}

export function ReadFileError(e: Error): SystemError | UserError {
  if (e.message.includes("Unexpected end of JSON input")) {
    return returnUserError(
      new Error(`${e.message}. Please check the format of it.`),
      constants.cliSource,
      "ReadFileError"
    );
  }
  return returnSystemError(e, constants.cliSource, "ReadFileError");
}

export function WriteFileError(e: Error): SystemError {
  return returnSystemError(e, constants.cliSource, "WriteFileError");
}

export function UnknownError(e: Error): SystemError {
  return returnSystemError(e, constants.cliSource, "UnknownError");
}

export function ProjectFolderExist(path: string): UserError {
  return returnUserError(
    new Error(`Path ${path} alreay exists. Select a different folder.`),
    constants.cliSource,
    "ProjectFolderExist"
  );
}

export function EmptySubConfigOptions(): SystemError {
  return returnUserError(
    new Error(`Your Azure account has no active subscriptions. Please switch an Azure account.`),
    constants.cliSource,
    "EmptySubConfigOptions"
  );
}

export function NoInitializedHelpGenerator(): SystemError {
  return returnSystemError(
    new Error(`Please call the async function -- initializeQuestionsForHelp firstly!`),
    constants.cliSource,
    "NoInitializedHelpGenerator"
  );
}

export function NonTeamsFxProjectFolder(): UserError {
  return returnUserError(
    new Error(`Current folder is not a TeamsFx project folder.`),
    constants.cliSource,
    "NonTeamsFxProjectFolder"
  );
}

export function ConfigNameNotFound(name: string): UserError {
  return returnUserError(
    new Error(`Config ${name} is not found in project.`),
    constants.cliSource,
    "ConfigNameNotFound"
  );
}

export function InvalidEnvFile(msg: string, path: string): UserError {
  return returnUserError(
    new Error(msg + ` Please check the file ${path}.`),
    constants.cliSource,
    "InvalidEnvFile"
  );
}

export class EnvUndefined extends SystemError {
  constructor() {
    super(
      new.target.name,
      `env is undefined, isMultiEnvEnabled = ${isMultiEnvEnabled()}`,
      constants.cliSource
    );
  }
}

export class EnvNotSpecified extends UserError {
  constructor() {
    super(new.target.name, `The --env argument is not specified`, constants.cliSource);
  }
}

export class EnvNotFound extends UserError {
  constructor(env: string) {
    super(new.target.name, `The environment "${env}" is not found`, constants.cliSource);
  }
}

export class EnvNotProvisioned extends UserError {
  constructor(env: string) {
    super(new.target.name, `The environment "${env}" is not provisioned`, constants.cliSource);
  }
}

export class UserdataNotFound extends UserError {
  constructor(env: string) {
    super(
      new.target.name,
      `The userdata file ".${ConfigFolderName}/${StatesFolderName}/${env}.userdata" is not found. Please try to provision in the "${env}" envrionment`,
      constants.cliSource
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
