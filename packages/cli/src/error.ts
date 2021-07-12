// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import {
  IQuestion,
  returnSystemError,
  returnUserError,
  SystemError,
  UserError,
} from "@microsoft/teamsfx-api";

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

export function NotSupportedQuestionType(msg: IQuestion): SystemError {
  return returnSystemError(
    new Error(
      `Question.${msg.type} is not supported. The whole question is ${JSON.stringify(msg, null, 4)}`
    ),
    constants.cliSource,
    "NotSupportedQuestionType"
  );
}

export function ConfigNotFoundError(configpath: string): SystemError {
  return returnSystemError(
    new Error(`Config file ${configpath} does not exists`),
    constants.cliSource,
    "ConfigNotFound"
  );
}

export function SampleAppDownloadFailed(sampleAppUrl: string, e: Error): SystemError {
  e.message = `Cannot download this sample app from ${sampleAppUrl}. Error: ${e.message}`;
  return returnSystemError(e, constants.cliSource, "SampleAppDownloadFailed");
}

export function ReadFileError(e: Error): SystemError {
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
