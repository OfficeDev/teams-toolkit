// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import { convertManifestTemplateToV3 } from "@microsoft/teamsfx-core/build/component/migrate";
import { getPropertyByPath } from "@microsoft/teamsfx-core/build/common/tools";
import { isV3Enabled, envUtil } from "@microsoft/teamsfx-core";
import {
  manifestConfigDataRegex,
  manifestStateDataRegex,
  environmentVariableRegex,
} from "./constants";
import { core, getSystemInputs } from "./handlers";
import { getProvisionSucceedFromEnv } from "./utils/commonUtils";
import { DotenvParseOutput } from "dotenv";

export class ManifestTemplateHoverProvider implements vscode.HoverProvider {
  public async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    const line = document.lineAt(position.line);

    let regex, matches;
    if (isV3Enabled()) {
      matches = environmentVariableRegex.exec(line.text);
      regex = environmentVariableRegex;
    } else {
      matches = manifestStateDataRegex.exec(line.text);
      if (matches !== null) {
        regex = manifestStateDataRegex;
      } else {
        matches = manifestConfigDataRegex.exec(line.text);
        if (matches !== null) {
          regex = manifestConfigDataRegex;
        }
      }
    }

    if (matches !== null && regex !== undefined) {
      const key = matches[0].replace(/{/g, "").replace(/}/g, "").replace(/\$/g, "");
      const indexOf = line.text.indexOf(matches[0]);
      const position = new vscode.Position(line.lineNumber, indexOf);
      const range = document.getWordRangeAtPosition(
        new vscode.Position(position.line, indexOf),
        new RegExp(regex)
      );
      let message;
      if (isV3Enabled()) {
        const spfxLocal = document.fileName.endsWith("manifest.template.local.json");
        message = await this.generateHoverMessageV3(key, spfxLocal);
      } else {
        message = await this.generateHoverMessage(key);
      }
      const hover = new vscode.Hover(message, range);
      return hover;
    }

    return undefined;
  }

  private async generateHoverMessageV3(
    key: string,
    displayLocalValue: boolean
  ): Promise<vscode.MarkdownString> {
    // Get environment variables
    const inputs = getSystemInputs();
    const envNamesRes = await envUtil.listEnv(inputs.projectPath!);
    if (envNamesRes.isErr()) {
      return new vscode.MarkdownString();
    }
    const envNames: string[] = envNamesRes.value;

    const envInfos: { [key: string]: DotenvParseOutput } = {};
    for (const envName of envNames) {
      const envRes = await envUtil.readEnv(inputs.projectPath!, envName, false);
      if (envRes.isOk()) {
        envInfos[envName] = envRes.value;
      }
    }

    // Generate hover message
    let message = "";
    let args;
    if (displayLocalValue) {
      const envName = environmentManager.getLocalEnvName();
      const envInfo = envInfos[envName];
      const value = envInfo ? envInfo[key] : undefined;
      if (value) {
        message = `**${envName}**: ${value} \n\n`;
      } else {
        message += `**${envName}** Trigger debug to see placeholder value \n\n`;
      }
      args = [{ type: "env", env: envName }];
    } else {
      for (const envName of envNames) {
        const envInfo = envInfos[envName];
        const value = envInfo[key];
        if (value) {
          message += `**${envName}**: ${value} \n\n`;
        } else {
          if (envName === environmentManager.getLocalEnvName()) {
            if (isV3Enabled()) {
              message += `**${envName}** Trigger debug to see placeholder value \n\n`;
            } else {
              const commandUri = vscode.Uri.parse("command:fx-extension.pre-debug-check");
              message += `**${envName}**: [Trigger debug to see placeholder value](${commandUri}) \n\n`;
            }
          } else {
            const commandUri = vscode.Uri.parse("command:fx-extension.provision");
            message += `**${envName}**: [Trigger Teams: Provision in the cloud command to see placeholder value](${commandUri}) \n\n`;
          }
        }
      }
      args = [{ type: "env" }];
    }

    const commandUri = vscode.Uri.parse(
      `command:fx-extension.openConfigState?${encodeURIComponent(JSON.stringify(args))}`
    );
    message += `[✏️Edit env file](${commandUri})`;

    const markdown = new vscode.MarkdownString(message);
    markdown.isTrusted = true;
    return markdown;
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
        const keyV3 = convertManifestTemplateToV3(key);
        const value = getPropertyByPath(envInfo, keyV3);
        if (value || key.startsWith("config")) {
          message += `**${envName}**: ${value} \n\n`;
        } else {
          if (envName === environmentManager.getLocalEnvName()) {
            const commandUri = vscode.Uri.parse("command:fx-extension.pre-debug-check");
            message += `**${envName}**: [Trigger debug to see placeholder value](${commandUri}) \n\n`;
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
