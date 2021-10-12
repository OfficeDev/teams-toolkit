import * as vscode from "vscode";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent } from "../telemetry/extTelemetryEvents";
import * as StringResources from "../resources/Strings.json";
import { ext } from "../extensionVariables";
import { validateV1Project } from "@microsoft/teamsfx-core";
import { VS_CODE_UI } from "../extension";
import * as constants from "../constants";

export async function enableMigrateV1(): Promise<void> {
  const v1ProjectErrorMessage = await validateV1Project(ext.workspaceUri?.fsPath);
  const validV1Project = !v1ProjectErrorMessage;
  vscode.commands.executeCommand("setContext", "fx-extension.v1Project", validV1Project);
  if (validV1Project) {
    showNotification();
  }
}

async function showNotification(): Promise<void> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.MigrateV1ProjectNotificationStart);
  const learnMore = {
    title: StringResources.vsc.migrateV1.learnMore.title,
    run: async (): Promise<void> => {
      VS_CODE_UI.openUrl(constants.migrateV1DocUrl);
    },
  };
  const confirm = {
    title: StringResources.vsc.migrateV1.confirm.title,
    run: async (): Promise<void> => {
      vscode.commands.executeCommand("fx-extension.migrateV1Project");
    },
  };

  vscode.window
    .showInformationMessage(StringResources.vsc.migrateV1.banner, learnMore, confirm)
    .then((selection) => {
      if (selection?.title === StringResources.vsc.migrateV1.confirm.title) {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.MigrateV1ProjectNotification, {
          status: StringResources.vsc.migrateV1.confirm.status,
        });
        selection.run();
      } else if (selection?.title === StringResources.vsc.migrateV1.learnMore.title) {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.MigrateV1ProjectNotification, {
          status: StringResources.vsc.migrateV1.learnMore.status,
        });
        selection.run();
      } else {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.MigrateV1ProjectNotification, {
          status: StringResources.vsc.migrateV1.cancel.status,
        });
      }
    });
}
