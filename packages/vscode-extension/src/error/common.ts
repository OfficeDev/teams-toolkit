// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  UserError,
  SystemError,
  FxError,
  Result,
  err,
  ok,
  OptionItem,
} from "@microsoft/teamsfx-api";
import { isUserCancelError, ConcurrentError, PortsConflictError } from "@microsoft/teamsfx-core";
import { Uri, commands, window } from "vscode";
import {
  RecommendedOperations,
  openTestToolMessage,
  openTestToolDisplayMessage,
} from "../debug/common/debugConstants";
import { workspaceUri } from "../globalVariables";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import { anonymizeFilePaths } from "../utils/fileSystemUtils";
import { localize } from "../utils/localizeUtils";
import { isTestToolEnabledProject } from "../utils/projectChecker";
import { TelemetryEvent, TelemetryProperty } from "../telemetry/extTelemetryEvents";
import VsCodeLogInstance from "../commonlib/log";
import { ExtensionSource, ExtensionErrors } from "./error";
import { processUtil } from "../utils/processUtil";
import fs from "fs-extra";
import path from "path";
import detectPort from "detect-port";
import { VS_CODE_UI } from "../qm/vsc_ui";

async function replacePortInPackageJson(filePath: string, oldPort: number, newPort: number) {
  // Read the file content
  const content = await fs.readFile(filePath, "utf-8");
  // Regular expression to match the --inspect=<oldPort>
  const portRegex = new RegExp(`--inspect=${oldPort}`, "g");
  // Replace the old port with the new port
  const updatedContent = content.replace(portRegex, `--inspect=${newPort}`);
  // Write the updated content back to package.json
  await fs.writeFile(filePath, updatedContent, "utf-8");
  console.log(`Port replaced from ${oldPort} to ${newPort} in ${filePath}`);
}
async function replacePortInLaunchJson(filePath: string, oldPort: number, newPort: number) {
  // Read the file content
  const content = await fs.readFile(filePath, "utf-8");
  // Regular expression to match the --inspect=<oldPort>
  const portRegex = new RegExp(`"port"\\s*:\\s*${oldPort}\s*`, "g");
  // Replace the old port with the new port
  const updatedContent = content.replace(portRegex, `"port": ${newPort}`);
  // Write the updated content back to package.json
  await fs.writeFile(filePath, updatedContent, "utf-8");
  console.log(`Port replaced from ${oldPort} to ${newPort} in ${filePath}`);
}
async function replacePortInTaskJson(filePath: string, oldPort: number, newPort: number) {
  // Read the file content
  const content = await fs.readFile(filePath, "utf-8");

  // Regular expression to match the old port number in the portOccupancy array
  const portRegex = new RegExp(`\\b${oldPort}\\b`, "g");

  // Replace the old port with the new port
  const updatedContent = content.replace(portRegex, `${newPort}`);

  // Write the updated content back to the file
  await fs.writeFile(filePath, updatedContent, "utf-8");

  console.log(`Port replaced from ${oldPort} to ${newPort} in ${filePath}`);
}

async function replaceInspectPort(projectPath: string, oldPort: number, newPort: number) {
  const taskJson = path.join(projectPath, ".vscode", "tasks.json");
  const launchJson = path.join(projectPath, ".vscode", "launch.json");
  const packageJson = path.join(projectPath, "package.json");
  await replacePortInTaskJson(taskJson, oldPort, newPort);
  await replacePortInPackageJson(packageJson, oldPort, newPort);
  await replacePortInLaunchJson(launchJson, oldPort, newPort);
}

export async function showError(e: UserError | SystemError) {
  let notificationMessage = e.displayMessage ?? e.message;
  const errorCode = `${e.source}.${e.name}`;
  const runTestTool = {
    title: localize("teamstoolkit.handlers.debugInTestTool"),
    run: async () => {
      ExtTelemetry.sendTelemetryEvent(TelemetryEvent.MessageDebugInTestTool);
      await commands.executeCommand("workbench.action.quickOpen", "debug Debug in Test Tool");
      return ok<unknown, FxError>(null);
    },
  };
  const recommendTestTool =
    e.recommendedOperation === RecommendedOperations.DebugInTestTool &&
    workspaceUri?.fsPath &&
    isTestToolEnabledProject(workspaceUri.fsPath);

  if (recommendTestTool) {
    const recommendTestToolMessage = openTestToolMessage();
    const recommendTestToolDisplayMessage = openTestToolDisplayMessage();
    e.message += ` ${recommendTestToolMessage}`;
    notificationMessage += ` ${recommendTestToolDisplayMessage}`;
  }
  if (isUserCancelError(e)) {
    return;
  } else if ("helpLink" in e && e.helpLink && typeof e.helpLink != "undefined") {
    const helpLinkUrl = Uri.parse(`${e.helpLink}`);
    const help = {
      title: localize("teamstoolkit.handlers.getHelp"),
      run: () => {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.ClickGetHelp, {
          [TelemetryProperty.ErrorCode]: errorCode,
          [TelemetryProperty.ErrorMessage]: notificationMessage,
          [TelemetryProperty.HelpLink]: e.helpLink!,
        });
        void commands.executeCommand("vscode.open", helpLinkUrl);
      },
    };
    VsCodeLogInstance.error(`code:${errorCode}, message: ${e.message}\n Help link: ${e.helpLink}`);
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    VsCodeLogInstance.debug(`Call stack: ${e.stack || e.innerError?.stack || ""}`);
    const buttons = recommendTestTool ? [runTestTool, help] : [help];
    const ux = 1;
    // if (e instanceof PortsConflictError) {
    //   buttons.push({
    //     title: "Kill Process",
    //     run: async () => {
    //       const error = e;
    //       const ports = (error.telemetryProperties?.["occupied-ports"] || "")
    //         .split(",")
    //         .map((p) => parseInt(p));
    //       if (ux === 0) {
    //         for (const port of ports) {
    //           const processId = await processUtil.getProcessId(port);
    //           if (processId) {
    //             const processInfo = await processUtil.getProcessInfo(parseInt(processId));
    //             const res = await VS_CODE_UI.showMessage(
    //               "info",
    //               `Process(pid=${processId}) on port ${port} is: '${processInfo}', do you want to kill it?`,
    //               true,
    //               "Yes",
    //               "No"
    //             );
    //             if (res.isOk() && res.value === "Yes") {
    //               await processUtil.killProcess(processId);
    //               void VS_CODE_UI.showMessage(
    //                 "info",
    //                 `Process ${processId} has been killed.`,
    //                 false
    //               );
    //             }
    //           }
    //         }
    //       } else {
    //         const processIds = new Set<string>();
    //         for (const port of ports) {
    //           const processId = await processUtil.getProcessId(port);
    //           if (processId) {
    //             processIds.add(processId);
    //           }
    //         }
    //         if (processIds.size > 0) {
    //           const options: OptionItem[] = [];
    //           for (const processId of processIds) {
    //             const processInfo = await processUtil.getProcessInfo(parseInt(processId));
    //             options.push({ id: processId, label: processInfo });
    //           }
    //           const res = await VS_CODE_UI.selectOptions({
    //             title: "Select the following processes to kill",
    //             name: "select_processes",
    //             options,
    //           });
    //           if (res.isOk() && res.value.type === "success") {
    //             const processIds = res.value.result as string[];
    //             for (const processId of processIds) {
    //               await processUtil.killProcess(processId);
    //             }
    //             if (processIds.length > 0) {
    //               void VS_CODE_UI.showMessage(
    //                 "info",
    //                 `Processes ${Array.from(processIds).join(",")} have been killed.`,
    //                 false
    //               );
    //             }
    //           }
    //         }
    //       }
    //     },
    //   });
    // }
    const button = await window.showErrorMessage(
      `[${errorCode}]: ${notificationMessage}`,
      ...buttons
    );
    if (button) button.run();
  } else if (e instanceof SystemError) {
    const sysError = e;
    const path = "https://github.com/OfficeDev/TeamsFx/issues/new?";
    const param = `title=bug+report: ${errorCode}&body=${anonymizeFilePaths(
      e.message
    )}\n\nstack:\n${anonymizeFilePaths(e.stack)}\n\n${
      sysError.userData ? anonymizeFilePaths(sysError.userData) : ""
    }`;
    const issueLink = Uri.parse(`${path}${param}`);
    const issue = {
      title: localize("teamstoolkit.handlers.reportIssue"),
      run: () => {
        void commands.executeCommand("vscode.open", issueLink);
      },
    };
    const similarIssueLink = Uri.parse(
      `https://github.com/OfficeDev/TeamsFx/issues?q=is:issue+in:title+${errorCode}`
    );
    const similarIssues = {
      title: localize("teamstoolkit.handlers.similarIssues"),
      run: async (): Promise<void> => {
        ExtTelemetry.sendTelemetryEvent(TelemetryEvent.FindSimilarIssues);
        await commands.executeCommand("vscode.open", similarIssueLink);
      },
    };
    VsCodeLogInstance.error(`code:${errorCode}, message: ${e.message}`);
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    VsCodeLogInstance.debug(`Call stack: ${e.stack || e.innerError?.stack || ""}`);
    const buttons = recommendTestTool
      ? [runTestTool, issue, similarIssues]
      : [issue, similarIssues];
    const button = await window.showErrorMessage(
      `[${errorCode}]: ${notificationMessage}`,
      ...buttons
    );
    if (button) button.run();
  } else {
    if (!(e instanceof ConcurrentError)) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      VsCodeLogInstance.debug(`Call stack: ${e.stack || e.innerError?.stack || ""}`);
      const buttons = recommendTestTool ? [runTestTool] : [];
      const button = await window.showErrorMessage(
        `[${errorCode}]: ${notificationMessage}`,
        ...buttons
      );
      if (button) void button.run();
    }
  }
}

export function wrapError(e: Error): Result<null, FxError> {
  if (
    e instanceof UserError ||
    e instanceof SystemError ||
    (e.constructor &&
      e.constructor.name &&
      (e.constructor.name === "SystemError" || e.constructor.name === "UserError"))
  ) {
    return err(e as FxError);
  }
  return err(
    new SystemError({ error: e, source: ExtensionSource, name: ExtensionErrors.UnknwonError })
  );
}

export function isLoginFailureError(error: FxError): boolean {
  return !!error.message && error.message.includes("Cannot get user login information");
}
