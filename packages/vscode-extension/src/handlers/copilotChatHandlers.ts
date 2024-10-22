// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as util from "util";
import * as vscode from "vscode";

import { FxError, Result, SystemError, err, ok } from "@microsoft/teamsfx-api";
import { assembleError } from "@microsoft/teamsfx-core";
import { UserCancelError, sleep } from "@microsoft/vscode-ui";
import VsCodeLogInstance from "../commonlib/log";
import { ExtTelemetry } from "../telemetry/extTelemetry";
import {
  TelemetryEvent,
  TelemetryProperty,
  TelemetrySuccess,
  TelemetryTriggerFrom,
} from "../telemetry/extTelemetryEvents";
import { getTriggerFromProperty } from "../utils/telemetryUtils";
import { localize } from "../utils/localizeUtils";
import { showOutputChannelHandler } from "./showOutputChannel";
import { InstallCopilotChatLink } from "../constants";
import { isVSCodeInsiderVersion } from "../utils/versionUtil";
import { VS_CODE_UI } from "../qm/vsc_ui";

const githubCopilotChatExtensionId = "github.copilot-chat";
const teamsAgentLink = "https://aka.ms/install-teamsapp";
enum installationTarget {
  copilotChat = "copilot-chat",
  teamsAgent = "teams-agent",
}

function githubCopilotInstalled(): boolean {
  const extension = vscode.extensions.getExtension(githubCopilotChatExtensionId);
  return !!extension;
}

async function openGithubCopilotChat(query: string): Promise<Result<null, FxError>> {
  const eventName = "openCopilotChat";
  try {
    const options = {
      query,
      isPartialQuery: true,
    };
    await vscode.commands.executeCommand("workbench.panel.chat.view.copilot.focus");
    await vscode.commands.executeCommand("workbench.action.chat.open", options);
    return ok(null);
  } catch (e) {
    const error = new SystemError(
      eventName,
      "openCopilotError",
      util.format(localize("teamstoolkit.handlers.chatTeamsAgentError", query)),
      util.format(localize("teamstoolkit.handlers.chatTeamsAgentError", query))
    );
    VsCodeLogInstance.error(error.message);
    ExtTelemetry.sendTelemetryErrorEvent(eventName, error);

    const assembledError = assembleError(e);
    if (assembledError.message) {
      VsCodeLogInstance.error(assembledError.message);
    }

    return err(error);
  }
}

export async function installGithubCopilotChatExtension(
  triggerFrom: TelemetryTriggerFrom
): Promise<Result<{ installCopilot: boolean }, FxError>> {
  const eventName = "installCopilotChat";
  const telemetryProperties = {
    [TelemetryProperty.TriggerFrom]: triggerFrom,
  };
  ExtTelemetry.sendTelemetryEvent(eventName, telemetryProperties);
  try {
    const confirmRes = await vscode.window.showInformationMessage(
      localize("teamstoolkit.handlers.askInstallCopilot"),
      localize("teamstoolkit.handlers.askInstallCopilot.install"),
      localize("teamstoolkit.handlers.askInstallCopilot.installTeamsApp")
    );

    if (confirmRes === localize("teamstoolkit.handlers.askInstallCopilot.install")) {
      await vscode.commands.executeCommand(
        "workbench.extensions.installExtension",
        githubCopilotChatExtensionId,
        {
          installPreReleaseVersion: isVSCodeInsiderVersion(), // VSCode insider need to install Github Copilot Chat of pre-release version
          enable: true,
        }
      );

      ExtTelemetry.sendTelemetryEvent(eventName, {
        ...telemetryProperties,
        [TelemetryProperty.Success]: TelemetrySuccess.Yes,
        [TelemetryProperty.InstallTarget]: installationTarget.copilotChat,
      });

      return ok({ installCopilot: true });
    } else if (confirmRes === localize("teamstoolkit.handlers.askInstallCopilot.installTeamsApp")) {
      const openUrlRes = await VS_CODE_UI.openUrl(teamsAgentLink);
      if (openUrlRes.isOk()) {
        ExtTelemetry.sendTelemetryEvent(eventName, {
          ...telemetryProperties,
          [TelemetryProperty.Success]: TelemetrySuccess.Yes,
          [TelemetryProperty.InstallTarget]: installationTarget.teamsAgent,
        });
        return ok({ installCopilot: false });
      } else {
        ExtTelemetry.sendTelemetryErrorEvent(eventName, openUrlRes.error, telemetryProperties);
        return err(openUrlRes.error);
      }
    } else {
      const error = new UserCancelError(eventName, "cancel");
      ExtTelemetry.sendTelemetryErrorEvent(eventName, error, telemetryProperties);
      return err(error);
    }
  } catch (e) {
    const error = new SystemError(
      eventName,
      "InstallCopilotError",
      util.format(localize("teamstoolkit.handlers.installCopilotError", InstallCopilotChatLink)),
      util.format(localize("teamstoolkit.handlers.installCopilotError", InstallCopilotChatLink))
    );
    VsCodeLogInstance.error(error.message);
    ExtTelemetry.sendTelemetryErrorEvent(eventName, error, telemetryProperties);

    const assembledError = assembleError(e);
    if (assembledError.message) {
      VsCodeLogInstance.error(assembledError.message);
    }

    return err(error);
  }
}

export async function invokeTeamsAgent(args?: any[]): Promise<Result<null, FxError>> {
  const eventName = TelemetryEvent.InvokeTeamsAgent;
  const triggerFromProperty = getTriggerFromProperty(args);
  ExtTelemetry.sendTelemetryEvent(eventName, triggerFromProperty);

  const query =
    triggerFromProperty["trigger-from"] === TelemetryTriggerFrom.TreeView ||
    triggerFromProperty["trigger-from"] === TelemetryTriggerFrom.CommandPalette
      ? "@teamsapp Use this GitHub Copilot extension to ask questions about Teams app development."
      : "@teamsapp Find relevant templates or samples to build your Teams app as per your description. E.g. @teamsapp create an AI assistant bot that can complete common tasks.";
  let res: Result<null, FxError>;

  const isExtensionInstalled = githubCopilotInstalled();
  if (isExtensionInstalled) {
    res = await openGithubCopilotChat(query);
  } else {
    VsCodeLogInstance.info(
      util.format(
        localize("teamstoolkit.handlers.installExtension.output"),
        InstallCopilotChatLink,
        teamsAgentLink
      )
    );
    showOutputChannelHandler();

    const maxRetry = 5;
    const installRes = await installGithubCopilotChatExtension(
      triggerFromProperty[TelemetryProperty.TriggerFrom]
    );
    if (installRes.isOk() && installRes.value.installCopilot) {
      let checkCount = 0;
      let verifyExtensionInstalled = false;
      while (checkCount < maxRetry) {
        verifyExtensionInstalled = githubCopilotInstalled();
        if (!verifyExtensionInstalled) {
          await sleep(3000);
          checkCount++;
        } else {
          break;
        }
      }

      if (verifyExtensionInstalled) {
        await sleep(2000); // wait for extension activation
        res = await openGithubCopilotChat(query);
      } else {
        const error = new SystemError(
          eventName,
          "CannotVerifyGithubCopilotChat",
          util.format(
            localize("teamstoolkit.handlers.verifyCopilotExtensionError", InstallCopilotChatLink)
          ),
          util.format(
            localize("teamstoolkit.handlers.verifyCopilotExtensionError", InstallCopilotChatLink)
          )
        );
        VsCodeLogInstance.error(error.message);
        res = err(error);
      }
    } else if (installRes.isOk()) {
      res = ok(null);
    } else {
      res = err(installRes.error);
    }
  }
  if (res.isErr()) {
    ExtTelemetry.sendTelemetryErrorEvent(eventName, res.error, triggerFromProperty);
  } else {
    ExtTelemetry.sendTelemetryEvent(eventName, {
      [TelemetryProperty.Success]: TelemetrySuccess.Yes,
      ...triggerFromProperty,
    });
  }
  return res;
}
