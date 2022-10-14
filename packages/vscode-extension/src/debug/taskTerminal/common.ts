/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as util from "util";

import {
  err,
  FxError,
  ok,
  Result,
  UserError,
  UserErrorOptions,
  Void,
} from "@microsoft/teamsfx-api";
import { DebugAction } from "@microsoft/teamsfx-core/build/component/debugHandler";

import VsCodeLogInstance from "../../commonlib/log";
import { ExtensionSource } from "../../error";
import { ProgressHandler } from "../../progressHandler";
import { getDefaultString, localize } from "../../utils/localizeUtils";
import { DisplayMessages } from "../constants";
import { doctorConstant } from "../depsChecker/doctorConstant";
import { Step } from "../commonUtils";

export async function handleDebugActions(
  actions: DebugAction[],
  displayMessages: DisplayMessages
): Promise<Result<Void, FxError>> {
  const step = new Step(actions.length);

  VsCodeLogInstance.outputChannel.appendLine(displayMessages.checkNumber(step.totalSteps));
  VsCodeLogInstance.outputChannel.appendLine("");

  let error: FxError | undefined = undefined;
  const messagesArr: string[][] = [];

  const progressHandler = new ProgressHandler(displayMessages.taskName, step.totalSteps);
  await progressHandler.start();

  for (const action of actions) {
    await progressHandler.next(action.startMessage);
    VsCodeLogInstance.outputChannel.appendLine(`${step.getPrefix()} ${action.startMessage}`);

    const result = await action.run();
    if (result.isErr()) {
      error = result.error;
      break;
    }

    if (result.value.length > 0) {
      messagesArr.push(result.value);
    }
  }
  await progressHandler.end(error === undefined);

  VsCodeLogInstance.outputChannel.appendLine("");
  VsCodeLogInstance.outputChannel.appendLine(displayMessages.summary);
  VsCodeLogInstance.outputChannel.appendLine("");

  if (messagesArr.length > 0) {
    for (const messages of messagesArr) {
      VsCodeLogInstance.outputChannel.appendLine(`${doctorConstant.Tick} ${messages[0]}`);
      for (let i = 1; i < messages.length; ++i) {
        VsCodeLogInstance.outputChannel.appendLine(`  ${messages[i]}`);
      }
    }
    VsCodeLogInstance.outputChannel.appendLine("");
  }

  if (error) {
    VsCodeLogInstance.outputChannel.appendLine(
      `${doctorConstant.Cross} ${error.name}: ${error.message}`
    );
    VsCodeLogInstance.outputChannel.appendLine("");
  }

  VsCodeLogInstance.outputChannel.appendLine(
    displayMessages.learnMore(displayMessages.learnMoreHelpLink)
  );
  VsCodeLogInstance.outputChannel.appendLine("");

  if (error) {
    const message =
      getDefaultString(displayMessages.errorMessageKey) + " " + displayMessages.showDetailMessage();
    const displayMessage =
      localize(displayMessages.errorDisplayMessageKey) +
      " " +
      displayMessages.showDetailDisplayMessage();

    const errorOptions: UserErrorOptions = {
      source: ExtensionSource,
      name: displayMessages.errorName,
      message: message,
      displayMessage: displayMessage,
      helpLink: displayMessages.errorHelpLink,
    };
    return err(new UserError(errorOptions));
  }

  return ok(Void);
}
