// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  commands,
  Diagnostic,
  DiagnosticSeverity,
  ExtensionContext,
  extensions,
  Uri,
  Range,
  Position,
} from "vscode";

import {
  err,
  FxError,
  InputResult,
  ok,
  Result,
  SingleFileOrInputConfig,
} from "@microsoft/teamsfx-api";
import {
  assembleError,
  isValidHttpUrl,
  loadingDefaultPlaceholder,
  loadingOptionsPlaceholder,
} from "@microsoft/teamsfx-core";
import { InternalUIError, Localizer, sleep, VSCodeUI } from "@microsoft/vscode-ui";
import * as packageJson from "../../package.json";
import { TerminalName } from "../constants";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { getDefaultString, localize } from "../utils/localizeUtils";
import {
  SelectFileOrInputResultType,
  TelemetryEvent,
  TelemetryProperty,
} from "../telemetry/extTelemetryEvents";
import { diagnosticCollection, workspaceUri } from "../globalVariables";
import path = require("path");

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
    return "User canceled.";
  }
  cancelErrorDisplayMessage(): string {
    return "User canceled.";
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

export const ttkLocalizer = new TTKLocalizer();
export let VS_CODE_UI: VsCodeUI;

export class VsCodeUI extends VSCodeUI {
  context: ExtensionContext;
  constructor(context: ExtensionContext) {
    super(TerminalName, assembleError, ttkLocalizer);
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
          ttkLocalizer.internalErrorMessage(
            `commands.executeCommand("workbench.action.reloadWindow")`
          ),
          ttkLocalizer.internalErrorDisplayMessage(
            `commands.executeCommand("workbench.action.reloadWindow")`
          )
        )
      );
    }
  }

  /**
   * override selectFileOrInput() to send telemetry event
   */
  async selectFileOrInput(
    config: SingleFileOrInputConfig
  ): Promise<Result<InputResult<string>, FxError>> {
    const res = await super.selectFileOrInput(config);
    if (res.isOk()) {
      if (res.value.type === "success") {
        const value = res.value.result as string;
        if (isValidHttpUrl(value)) {
          ExtTelemetry.sendTelemetryEvent(TelemetryEvent.selectFileOrInputResultType, {
            [TelemetryProperty.SelectedOption]: SelectFileOrInputResultType.Input,
          });
        } else {
          ExtTelemetry.sendTelemetryEvent(TelemetryEvent.selectFileOrInputResultType, {
            [TelemetryProperty.SelectedOption]: SelectFileOrInputResultType.LocalFile,
          });
        }
      }
    }
    return res;
  }

  async showDiagnosticMessage(): Promise<Result<string, FxError>> {
    // if(!diagnosticCollection) {

    // }
    await sleep(1000);
    diagnosticCollection.clear();
    const errors = [
      {
        id: "958d86ff-864b-474d-bea4-d8068b8c8cad",
        title: "ShortNameContainsPreprodWording",
        content: "Short name doesn't contain beta environment keywords",
        helpUrl:
          "https://docs.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#name",
        filePath: "manifest.json",
        shortCodeNumber: 4000,
        validationCategory: "Name",
      },
    ];

    const diagnosticMap: Map<string, Diagnostic[]> = new Map();
    errors.forEach((error) => {
      const canonicalFile = "manifest.json";
      const regex = new RegExp(error.validationCategory);

      // const text = document.getText();

      // const line = document.lineAt(document.positionAt(matches.index).line);
      // const indexOf = line.text.indexOf(match);
      // const position = new Position(line.lineNumber, indexOf);
      const range = new Range(new Position(6, 2), new Position(6, 6));

      let diagnostics = diagnosticMap.get(canonicalFile);
      if (!diagnostics) {
        diagnostics = [];
      }

      //const message = `[✏️Edit env file](${commandUri.toString()})`;
      const diag = new Diagnostic(
        range,
        "Short name doesn't contain beta environment keywords",
        DiagnosticSeverity.Warning
      );
      diag.code = {
        value: "NameField",
        target: Uri.parse(
          "https://docs.microsoft.com/en-us/microsoftteams/platform/resources/schema/manifest-schema#name"
        ),
      };
      diag.source = "TTK";

      diagnostics.push(diag);
      diagnosticMap.set(canonicalFile, diagnostics);

      const fileUri = Uri.file(
        path.join(workspaceUri?.fsPath?.toString() ?? "", "appPackage", "manifest.json")
      );
      console.log(fileUri);
      diagnosticMap.forEach((diags, file) => {
        diagnosticCollection.set(fileUri, diags);
      });
    });

    return ok("donevsc");
  }
}

export function initVSCodeUI(context: ExtensionContext) {
  VS_CODE_UI = new VsCodeUI(context);
}
