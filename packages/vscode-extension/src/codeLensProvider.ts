// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as vscode from "vscode";
import { localSettingsJsonName } from "./debug/constants";
import { manifestConfigDataRegex, manifestStateDataRegex } from "./constants";
import * as fs from "fs-extra";
import * as parser from "jsonc-parser";
import { Mutex } from "async-mutex";
import { AdaptiveCardsFolderName, ProjectConfigV3, Json } from "@microsoft/teamsfx-api";
import { TelemetryTiggerFrom } from "./telemetry/extTelemetryEvents";
import {
  isConfigUnifyEnabled,
  getPermissionMap,
  getAllowedAppMaps,
  environmentManager,
  getPropertyByPath,
} from "@microsoft/teamsfx-core";
import { localize } from "./utils/localizeUtils";
import { core, getSystemInputs } from "./handlers";
import isUUID from "validator/lib/isUUID";

export class ManifestPlacholderCodeLens extends vscode.CodeLens {
  constructor(
    public readonly placeholder: string,
    range: vscode.Range,
    command?: vscode.Command | undefined
  ) {
    super(range, command);
  }
}

/**
 * CodelensProvider
 */
export class CryptoCodeLensProvider implements vscode.CodeLensProvider {
  private userDataRegex: RegExp;
  private localDebugRegex: RegExp;

  constructor() {
    this.userDataRegex =
      /fx-resource-[a-zA-Z\-]+\.[a-zA-Z\-_]+(?:Secret|Password|VariableParams)=(.*)/g;
    this.localDebugRegex =
      /(?: *|\t*)"(?:clientSecret|SimpleAuthEnvironmentVariableParams|botPassword)": "(crypto_.*)"/g;
  }

  public provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    if (document.fileName.endsWith("userdata")) {
      return this.computeCodeLenses(document, this.userDataRegex);
    } else if (document.fileName.endsWith(localSettingsJsonName)) {
      return this.computeCodeLenses(document, this.localDebugRegex);
    } else {
      return [];
    }
  }

  private computeCodeLenses(
    document: vscode.TextDocument,
    secretRegex: RegExp
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const regex = new RegExp(secretRegex);
    let matches;
    while ((matches = regex.exec(text)) !== null) {
      const match = matches[1];
      const line = document.lineAt(document.positionAt(matches.index).line);
      const indexOf = line.text.indexOf(match);
      const position = new vscode.Position(line.lineNumber, indexOf);
      const range = new vscode.Range(
        position,
        new vscode.Position(line.lineNumber, indexOf + match.length)
      );
      const command = {
        title: "🔑Decrypt secret",
        command: "fx-extension.decryptSecret",
        arguments: [match, range],
      };
      if (range) {
        codeLenses.push(new vscode.CodeLens(range, command));
      }
    }
    return codeLenses;
  }
}

export class AdaptiveCardCodeLensProvider implements vscode.CodeLensProvider {
  public static async detectedAdaptiveCards(): Promise<boolean> {
    const searchTerm = "adaptivecards.io/schemas/adaptive-card.json";
    const files: vscode.Uri[] = await vscode.workspace.findFiles(
      `**/${AdaptiveCardsFolderName}/*.json`
    );
    for (const file of files) {
      const content = await fs.readFile(file.fsPath, "utf8");
      if (content.includes(searchTerm)) {
        return true;
      }
    }
    return false;
  }
  provideCodeLenses(_document: vscode.TextDocument): vscode.ProviderResult<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const topOfFile = new vscode.Range(0, 0, 0, 0);
    const command = {
      title: `👀${localize("teamstoolkit.commandsTreeViewProvider.previewAdaptiveCard")}`,
      command: "fx-extension.OpenAdaptiveCardExt",
      arguments: [TelemetryTiggerFrom.CodeLens],
    };
    codeLenses.push(new vscode.CodeLens(topOfFile, command));
    return codeLenses;
  }
}

export class ManifestTemplateCodeLensProvider implements vscode.CodeLensProvider {
  private schemaRegex = /\$schema/;

  private projectConfigs: ProjectConfigV3 | undefined = undefined;
  private mutex = new Mutex();

  public provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    if (document.fileName.endsWith("template.json")) {
      // env info needs to be reloaded
      this.projectConfigs = undefined;
      return this.computeTemplateCodeLenses(document);
    } else {
      return this.computePreviewCodeLenses(document);
    }
  }

  public async resolveCodeLens(
    lens: vscode.CodeLens,
    _token: vscode.CancellationToken
  ): Promise<vscode.CodeLens> {
    if (isConfigUnifyEnabled() && lens instanceof ManifestPlacholderCodeLens) {
      const key = lens.placeholder.replace(/{/g, "").replace(/}/g, "");
      if (!this.projectConfigs) {
        const release = await this.mutex.acquire();
        try {
          if (!this.projectConfigs) {
            const inputs = getSystemInputs();
            const getConfigRes = await core.getProjectConfigV3(inputs);
            if (getConfigRes.isErr()) throw getConfigRes.error;
            this.projectConfigs = getConfigRes.value;
          }
        } finally {
          release();
        }
      }

      if (this.projectConfigs) {
        let title = "👉";
        const localEnvInfo = this.projectConfigs.envInfos[environmentManager.getLocalEnvName()];
        const defaultEnvInfo = this.projectConfigs.envInfos[environmentManager.getDefaultEnvName()];

        const localValue = getPropertyByPath(localEnvInfo, key);
        title = `${title} ${environmentManager.getLocalEnvName()}: ${localValue}`;

        const defaultValue = getPropertyByPath(defaultEnvInfo, key);
        title = `${title}, ${defaultEnvInfo.envName}: ${defaultValue}`;

        lens.command = {
          title: title,
          command: "fx-extension.openConfigState",
          arguments: [{ type: key.startsWith("state") ? "state" : "config" }],
        };
        return lens;
      }
    }
    return lens;
  }

  private computeTemplateCodeLenses(document: vscode.TextDocument) {
    const codeLenses: vscode.CodeLens[] = [];
    const command = {
      title: "🖼️Preview",
      command: "fx-extension.openPreviewFile",
      arguments: [{ fsPath: document.fileName }],
    };
    codeLenses.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), command));

    const text = document.getText();
    const regex = new RegExp(this.schemaRegex);
    const matches = regex.exec(text);
    if (matches != null) {
      const match = matches[0];
      const line = document.lineAt(document.positionAt(matches.index).line);
      const indexOf = line.text.indexOf(match);
      const position = new vscode.Position(line.lineNumber, indexOf);
      const range = new vscode.Range(
        position,
        new vscode.Position(line.lineNumber, indexOf + match.length)
      );
      const url = line.text.substring(line.text.indexOf("https"), line.text.length - 2);
      const schemaCommand = {
        title: "Open schema",
        command: "fx-extension.openSchema",
        arguments: [{ url: url }],
      };
      codeLenses.push(new vscode.CodeLens(range, schemaCommand));
    }

    if (isConfigUnifyEnabled()) {
      if (document.fileName.endsWith("manifest.template.json")) {
        // code lens will be resolved later
        const configCodelenses = this.calculateCodeLens(document, manifestConfigDataRegex);
        codeLenses.push(...configCodelenses);

        const stateCodelenses = this.calculateCodeLens(document, manifestStateDataRegex);
        codeLenses.push(...stateCodelenses);
      }
    } else {
      if (document.fileName.endsWith("manifest.remote.template.json")) {
        const configCodelenses = this.calculateCodeLens(document, manifestConfigDataRegex, {
          title: "✏️Edit the config file",
          command: "fx-extension.openConfigState",
          arguments: [{ type: "config" }],
        });
        codeLenses.push(...configCodelenses);

        const stateCodelenses = this.calculateCodeLens(document, manifestStateDataRegex, {
          title: "👀View the state file",
          command: "fx-extension.openConfigState",
          arguments: [{ type: "state" }],
        });
        codeLenses.push(...stateCodelenses);
      }
    }

    return codeLenses;
  }

  private calculateCodeLens(
    document: vscode.TextDocument,
    regex: RegExp,
    command?: vscode.Command
  ) {
    let matches;
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    while ((matches = regex.exec(text)) !== null) {
      const line = document.lineAt(document.positionAt(matches.index).line);
      const indexOf = line.text.indexOf(matches[0]);
      const position = new vscode.Position(line.lineNumber, indexOf);
      const range = document.getWordRangeAtPosition(position, new RegExp(regex));

      if (range) {
        if (command) {
          codeLenses.push(new vscode.CodeLens(range, command));
        } else {
          codeLenses.push(new ManifestPlacholderCodeLens(matches[0], range, undefined));
        }
      }
    }
    return codeLenses;
  }

  private computePreviewCodeLenses(document: vscode.TextDocument) {
    const codeLenses: vscode.CodeLens[] = [];
    const updateCmd = {
      title: "🔄Update to Teams platform",
      command: "fx-extension.updatePreviewFile",
      arguments: [{ fsPath: document.fileName }, TelemetryTiggerFrom.CodeLens],
    };
    codeLenses.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), updateCmd));

    const editTemplateCmd = {
      title: "⚠️This file is auto-generated, click here to edit the manifest template file",
      command: "fx-extension.editManifestTemplate",
      arguments: [{ fsPath: document.fileName }, TelemetryTiggerFrom.CodeLens],
    };
    codeLenses.push(new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), editTemplateCmd));
    return codeLenses;
  }
}

export interface PropertyPair {
  name: parser.Node;
  value: parser.Node;
}

export class AadAppTemplateCodeLensProvider implements vscode.CodeLensProvider {
  constructor() {}

  public provideCodeLenses(
    document: vscode.TextDocument
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    if (document.fileName.endsWith("aad.template.json")) {
      return this.computeCodeLenses(document);
    } else {
      return [];
    }
  }

  private getPropertyValueOfObjectByKey(key: string, node: parser.Node): parser.Node | undefined {
    if (node.type !== "object" || !node.children) {
      return undefined;
    }
    let propertyPair: PropertyPair | undefined;
    for (const child of node.children) {
      propertyPair = this.parseProperty(child);
      if (!propertyPair) {
        continue;
      }
      if (propertyPair.name.value === key) {
        return propertyPair.value;
      }
    }
    return undefined;
  }

  private parseProperty(node: parser.Node): PropertyPair | undefined {
    if (node.type !== "property" || !node.children || node.children.length !== 2) {
      return undefined;
    }
    return { name: node.children[0], value: node.children[1] };
  }

  private computeRequiredResAccessCodeLenses(
    document: vscode.TextDocument,
    jsonNode: parser.Node
  ): vscode.CodeLens[] {
    const codeLenses: vscode.CodeLens[] = [];
    const requiredResourceAccessNode = parser.findNodeAtLocation(jsonNode, [
      "requiredResourceAccess",
    ]);
    const map = getPermissionMap();
    requiredResourceAccessNode?.children?.forEach((requiredResource) => {
      const resIdNode = this.getPropertyValueOfObjectByKey("resourceAppId", requiredResource);
      if (resIdNode) {
        const range = new vscode.Range(
          document.positionAt(resIdNode.offset),
          document.positionAt(resIdNode.offset + resIdNode.length)
        );

        const resIdOrName = resIdNode.value;

        let title = "";
        if (isUUID(resIdNode.value)) {
          title = map[resIdOrName]?.displayName;
        } else {
          title = map[resIdOrName]?.id;
        }

        if (title) {
          codeLenses.push(
            new vscode.CodeLens(range, {
              command: "",
              title: `👉 resourceAppId: "${title}"`,
            })
          );
        }

        const resAccessArrNode = this.getPropertyValueOfObjectByKey(
          "resourceAccess",
          requiredResource
        );

        resAccessArrNode?.children?.forEach((resAccessNode) => {
          const resAccessIdNode = this.getPropertyValueOfObjectByKey("id", resAccessNode);
          if (resAccessIdNode) {
            const type = this.getPropertyValueOfObjectByKey("type", resAccessNode);
            let title = "";
            if (isUUID(resAccessIdNode?.value)) {
              if (type?.value === "Scope") {
                title = map[resIdOrName]?.scopeIds[resAccessIdNode?.value];
              } else if (type?.value === "Role") {
                title = map[resIdOrName]?.roleIds[resAccessIdNode?.value];
              }
            } else {
              if (type?.value === "Scope") {
                title = map[resIdOrName]?.scopes[resAccessIdNode?.value];
              } else if (type?.value === "Role") {
                title = map[resIdOrName]?.roles[resAccessIdNode?.value];
              }
            }
            const range = new vscode.Range(
              document.positionAt(resAccessIdNode.offset),
              document.positionAt(resAccessIdNode.offset + resAccessIdNode.length)
            );

            if (title) {
              codeLenses.push(
                new vscode.CodeLens(range, {
                  command: "",
                  title: `👉 id: "${title}"`,
                })
              );
            }
          }
        });
      }
    });

    return codeLenses;
  }

  private computePreAuthAppCodeLenses(
    document: vscode.TextDocument,
    jsonNode: parser.Node
  ): vscode.CodeLens[] {
    const preAuthAppArrNode = parser.findNodeAtLocation(jsonNode, ["preAuthorizedApplications"]);
    const map = getAllowedAppMaps();
    const codeLenses: vscode.CodeLens[] = [];

    preAuthAppArrNode?.children?.forEach((preAuthAppNode) => {
      const appIdNode = this.getPropertyValueOfObjectByKey("appId", preAuthAppNode);
      if (appIdNode) {
        const range = new vscode.Range(
          document.positionAt(appIdNode.offset),
          document.positionAt(appIdNode.offset + appIdNode.length)
        );
        const appName = map[appIdNode.value];
        if (appName) {
          codeLenses.push(
            new vscode.CodeLens(range, {
              command: "",
              title: `👉 resource name: "${appName}"`,
            })
          );
        }
      }
    });
    return codeLenses;
  }

  private computeCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const text = document.getText();
    const jsonNode: parser.Node | undefined = parser.parseTree(text);
    if (jsonNode) {
      const resAccessCodeLenses = this.computeRequiredResAccessCodeLenses(document, jsonNode);
      const preAuthAppCodeLenses = this.computePreAuthAppCodeLenses(document, jsonNode);

      return [...resAccessCodeLenses, ...preAuthAppCodeLenses];
    }

    return [];
  }
}
