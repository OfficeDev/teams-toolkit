import * as vscode from "vscode";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent } from "../telemetry/extTelemetryEvents";
import * as StringResources from "../resources/Strings.json";
import { ext } from "../extensionVariables";
import { validateV1Project } from "@microsoft/teamsfx-core";

export async function enableMigrateV1(): Promise<void> {
  const v1ProjectErrorMessage = await validateV1Project(ext.workspaceUri?.fsPath);
  const validV1Project = !v1ProjectErrorMessage;
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.OpenV1Project, {
    v1: validV1Project ? "true" : "false",
    reason: v1ProjectErrorMessage ?? "",
  });
  vscode.commands.executeCommand("setContext", "fx-extension.v1Project", validV1Project);
  if (validV1Project) {
    showNotification();
  }
}

async function showNotification(): Promise<void> {
  ExtTelemetry.sendTelemetryEvent(TelemetryEvent.MigrateV1ProjectNotificationStart);
  const confirm = {
    title: StringResources.vsc.migrateV1.confirm.title,
    run: async (): Promise<void> => {
      vscode.commands.executeCommand("fx-extension.migrateV1Project");
    },
  };

  vscode.window
    .showInformationMessage(StringResources.vsc.migrateV1.banner, confirm)
    .then((selection) => {
      if (selection) {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.MigrateV1ProjectNotification, {
          status: StringResources.vsc.migrateV1.confirm.status,
        });
        selection.run();
      } else {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.MigrateV1ProjectNotification, {
          status: StringResources.vsc.migrateV1.cancel.status,
        });
      }
    });
}
