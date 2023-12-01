// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { commands, ExtensionContext, extensions } from "vscode";

import { err, FxError, ok, Result } from "@microsoft/teamsfx-api";
import {
  assembleError,
  loadingDefaultPlaceholder,
  loadingOptionsPlaceholder,
} from "@microsoft/teamsfx-core";
import { Localizer, VSCodeUI } from "@microsoft/vscode-ui";
import * as packageJson from "../../package.json";
import { TerminalName } from "../constants";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { sleep } from "../utils/commonUtils";
import { getDefaultString, localize } from "../utils/localizeUtils";
import { InternalUIError } from "@microsoft/vscode-ui";

export class TTKLocalizer implements Localizer {
  loadingOptionsPlaceholder(): string {
    return loadingOptionsPlaceholder();
  }
  loadingDefaultPlaceholder(): string {
    return loadingDefaultPlaceholder();
  }
  loadingOptionsTimeoutMessage(): string {
    return "loading options timeout";
  }
  multiSelectKeyboardPlaceholder(): string {
    return localize("teamstoolkit.qm.multiSelectKeyboard");
  }
  defaultFolder(): string {
    return localize("teamstoolkit.qm.defaultFolder");
  }
  browse(): string {
    return localize("teamstoolkit.qm.browse");
  }
  emptyOptionErrorMessage(): string {
    return getDefaultString("teamstoolkit.qm.emptySelection");
  }
  emptyOptionErrorDisplayMessage(): string {
    return localize("teamstoolkit.qm.emptySelection");
  }
  cancelErrorMessage(): string {
    return getDefaultString("teamstoolkit.qm.userCancel");
  }
  cancelErrorDisplayMessage(): string {
    return localize("teamstoolkit.qm.userCancel");
  }
  internalErrorDisplayMessage(action: string): string {
    return "VS Code failed to operate: " + action;
  }
  internalErrorMessage(action: string): string {
    return "VS Code failed to operate: " + action;
  }
  commandTimeoutErrorMessage(command: string): string {
    return "Execute command timeout: " + command;
  }
  commandTimeoutErrorDisplayMessage(command: string): string {
    return "Execute command timeout: " + command;
  }
}

export class VsCodeUI extends VSCodeUI {
  context: ExtensionContext;
  constructor(context: ExtensionContext) {
    super(TerminalName, assembleError, new TTKLocalizer());
    this.context = context;
  }
  async reload(): Promise<Result<boolean, FxError>> {
    // The following code only fixes the bug that cause telemetry event lost for projectMigrator().
    // When this reload() function has more users, they may need to dispose() more resources that allocated in activate().
    const extension = extensions.getExtension(`${packageJson.publisher}.${packageJson.name}`);
    if (!extension?.isActive) {
      // When our extension is not activated, we can determine this is in the vscode extension activate() context.
      // Since we are not activated yet, vscode will not deactivate() and dispose() our resourses (which have been allocated in activate()).
      // This may cause resource leaks.For example, buffered events in TelemetryReporter is not sent.
      // So manually dispose them.
      await ExtTelemetry.reporter?.dispose();
    }

    // wait 2 seconds before reloading.
    await sleep(2000);
    const success = await commands.executeCommand("workbench.action.reloadWindow");
    if (success) {
      return ok(success as boolean);
    } else {
      return err(
        new InternalUIError(
          super.localizer.internalErrorMessage(
            `commands.executeCommand("workbench.action.reloadWindow")`
          ),
          super.localizer.internalErrorDisplayMessage(
            `commands.executeCommand("workbench.action.reloadWindow")`
          )
        )
      );
    }
  }
}
