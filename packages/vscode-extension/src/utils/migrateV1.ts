import * as vscode from "vscode";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { TelemetryEvent } from "../telemetry/extTelemetryEvents";
import * as StringResources from "../resources/Strings.json";
import { ext } from "../extensionVariables";
import { isV1Project } from "@microsoft/teamsfx-core";

export function enableMigrateV1(): void {
  const validProject = ext.workspaceUri && isV1Project(ext.workspaceUri.fsPath);
  vscode.commands.executeCommand("setContext", "fx-extension.v1Project", validProject);
  if (validProject) {
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
  const selection = await vscode.window.showInformationMessage(
    StringResources.vsc.migrateV1.banner,
    confirm
  );

  if (selection) {
    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.MigrateV1ProjectNotification, {
      status: StringResources.vsc.migrateV1.confirm.message,
    });
    await selection.run();
  } else {
    ExtTelemetry.sendTelemetryEvent(TelemetryEvent.MigrateV1ProjectNotification, {
      status: StringResources.vsc.migrateV1.cancel.message,
    });
  }
}
