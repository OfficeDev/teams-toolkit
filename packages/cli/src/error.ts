// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import {
  Question,
  IQuestion,
  QTreeNode,
  returnSystemError,
  returnUserError,
  SystemError,
  UserError
} from "fx-api";

import * as constants from "./constants";

export function NotSupportedProjectType(): UserError {
  return returnUserError(
    new Error(`Project type not supported`),
    constants.cliSource,
    "NotSupportedProjectType"
  );
}

export function NotValidInputValue(inputName: string, msg: string): UserError {
  return returnUserError(Error(`${inputName} - ${msg}`), constants.cliSource, "NotValidInputValue");
}

export function NotFoundInputedFolder(folder: string): UserError {
  return returnUserError(
    new Error(`Inputed folder (${folder}) not found.`),
    constants.cliSource,
    "NotFoundInputFolder"
  );
}

export function NotFoundSubscriptionId(): UserError {
  return returnUserError(
    new Error(`Inputed subscription not found in your tenant`),
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

export function SampleAppClonedFailed(sampleAppUrl: string, e: Error): SystemError {
  e.message = `Cannot clone this sample app from ${sampleAppUrl}. Error: ${e.message}`;
  return returnSystemError(
    e,
    constants.cliSource,
    "SampleAppClonedFailed"
  );
}

export function ReadFileError(e: Error): SystemError {
  return returnSystemError(e, constants.cliSource, "ReadFileError");
}

export function UnknownError(e: Error): SystemError {
  return returnSystemError(e, constants.cliSource, "UnknownError");
}

export function QTNConditionNotSupport(node: QTreeNode): SystemError {
  return returnSystemError(
    new Error(`The condition of the question tree node is not supported. (${JSON.stringify(node.condition)})`),
    constants.cliSource,
    "QTNConditionNotSupport"
  );
}

export function QTNQuestionTypeNotSupport(data: Question): SystemError {
  return returnSystemError(
    new Error(`The condition of the question tree node is not supported. (${JSON.stringify(data)})`),
    constants.cliSource,
    "QTNQuestionTypeNotSupport"
  );
}
