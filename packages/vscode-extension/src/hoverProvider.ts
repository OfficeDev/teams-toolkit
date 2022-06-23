// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import {
  getPropertyByPath,
  environmentManager,
} from "@microsoft/teamsfx-core";
import { manifestConfigDataRegex, manifestStateDataRegex } from "./constants";
import { core, getSystemInputs } from "./handlers";
import { getProvisionSucceedFromEnv } from "./utils/commonUtils";

export class ManifestTemplateHoverProvider implements vscode.HoverProvider {
  public async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    const line = document.lineAt(position.line);

    let regex;
    let matches = manifestStateDataRegex.exec(line.text);
    if (matches !== null) {
      regex = manifestStateDataRegex;
    } else {
      matches = manifestConfigDataRegex.exec(line.text);
      if (matches !== null) {
        regex = manifestConfigDataRegex;
      }
    }

    if (matches !== null && regex !== undefined) {
      const key = matches[0].replace(/{/g, "").replace(/}/g, "");
      const indexOf = line.text.indexOf(matches[0]);
      const position = new vscode.Position(line.lineNumber, indexOf);
      const range = document.getWordRangeAtPosition(
        new vscode.Position(position.line, indexOf),
        new RegExp(regex)
      );
      const message = await this.generateHoverMessage(key);
      const hover = new vscode.Hover(message, range);
      return hover;
    }

    return undefined;
  }

  private async generateHoverMessage(key: string): Promise<vscode.MarkdownString> {
    const inputs = getSystemInputs();
    inputs.loglevel = "Debug";
    const getConfigRes = await core.getProjectConfigV3(inputs);
    if (getConfigRes.isErr()) throw getConfigRes.error;
    const projectConfigs = getConfigRes.value;

    let message = "";
    if (projectConfigs && projectConfigs.envInfos) {
      for (const envName in projectConfigs.envInfos) {
        const envInfo = projectConfigs.envInfos[envName];
        const value = getPropertyByPath(envInfo, key);
        if (value || key.startsWith("config")) {
          message += `**${envName}**: ${value} \n\n`;
        } else {
          if (envName === environmentManager.getLocalEnvName()) {
            const commandUri = vscode.Uri.parse("command:fx-extension.pre-debug-check");
            message += `**${envName}**: [Trigger local debug to see placeholder value](${commandUri}) \n\n`;
          } else {
            const provisioned = await getProvisionSucceedFromEnv(envName);
            if (provisioned) {
              message += `**${envName}**: ${value} \n\n`;
            } else {
              const commandUri = vscode.Uri.parse("command:fx-extension.provision");
              message += `**${envName}**: [Trigger Teams: Provision in the cloud command to see placeholder value](${commandUri}) \n\n`;
            }
          }
        }
      }
      if (key.startsWith("state")) {
        const args = [{ type: "state" }];
        const commandUri = vscode.Uri.parse(
          `command:fx-extension.openConfigState?${encodeURIComponent(JSON.stringify(args))}`
        );
        message += `[👀View the state file](${commandUri})`;
      } else {
        const args = [{ type: "config" }];
        const commandUri = vscode.Uri.parse(
          `command:fx-extension.openConfigState?${encodeURIComponent(JSON.stringify(args))}`
        );
        message += `[✏️Edit the config file](${commandUri})`;
      }
    }
    const markdown = new vscode.MarkdownString(message);
    markdown.isTrusted = true;
    return markdown;
  }
}
