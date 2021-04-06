// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import { ConfigMap, ConfigValue, Core, Question } from "teamsfx-api";
import * as vscode from "vscode";
import { ExtensionContext, Uri } from "vscode";
import { questionVisit } from "./question/question";
import { InputResult } from "./question/types";
import { UserInput, IUserInput } from "./userInput";

/**
 * Namespace for common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
export namespace ext {
  export let context: ExtensionContext;
  export let ui: IUserInput;
  export let workspaceUri: Uri;
  export let visit: (
    q: Question,
    parentValue: any,
    answers: ConfigMap,
    canGoBack?: boolean
  ) => Promise<InputResult>;
}

export function initializeExtensionVariables(ctx: ExtensionContext): void {
  if (vscode.workspace && vscode.workspace.workspaceFolders) {
    if (vscode.workspace.workspaceFolders.length > 0) {
      ext.workspaceUri = vscode.workspace.workspaceFolders[0].uri;
    }
  }
  ext.context = ctx;
  ext.ui = new UserInput();
  ext.visit = questionVisit;
}
