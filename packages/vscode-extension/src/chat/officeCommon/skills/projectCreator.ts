// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as tmp from "tmp";
import * as crypto from "crypto";
import * as path from "path";
import * as fs from "fs-extra";
import * as vscode from "vscode";
import {
  ChatRequest,
  ChatResponseStream,
  LanguageModelChatAssistantMessage,
  CancellationToken,
  ChatResponseFileTree,
  Uri,
} from "vscode";
import { ISkill } from "./iSkill";
import { Spec } from "./spec";
import { ExecutionResultEnum } from "./executionResultEnum";
import { fileTreeAdd } from "../../commands/create/createCommandHandler";
import { TelemetryTriggerFrom } from "../../../telemetry/extTelemetryEvents";
import { CHAT_CREATE_OFFICEADDIN_SAMPLE_COMMAND_ID, CHAT_EXECUTE_COMMAND_ID } from "../../consts";
import { CommandKey } from "../../../constants";
import { localize } from "../../../utils/localizeUtils";

export class projectCreator implements ISkill {
  name: string | undefined;
  capability: string | undefined;

  constructor() {
    this.name = "Project Creator";
    this.capability = "Create a new project template";
  }

  public canInvoke(request: ChatRequest, spec: Spec): boolean {
    return (
      !!spec.userInput &&
      !!spec.appendix.codeSnippet &&
      !!spec.appendix.codeTaskBreakdown &&
      spec.appendix.codeTaskBreakdown.length > 0
    );
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async invoke(
    languageModel: LanguageModelChatAssistantMessage,
    request: ChatRequest,
    response: ChatResponseStream,
    token: CancellationToken,
    spec: Spec
  ): Promise<{ result: ExecutionResultEnum; spec: Spec }> {
    const tempFolder = tmp.dirSync({ unsafeCleanup: true }).name;
    const tempAppName = `office-addin-${crypto.randomBytes(8).toString("hex")}`;
    const nodes = await this.buildProjectFromSpec(spec, tempFolder, tempAppName);
    response.filetree(nodes, Uri.file(path.join(tempFolder, tempAppName)));
    const sampleTitle = localize("teamstoolkit.chatParticipants.create.sample");
    response.button({
      command: CHAT_CREATE_OFFICEADDIN_SAMPLE_COMMAND_ID,
      arguments: [path.join(tempFolder, tempAppName)],
      title: sampleTitle,
    });
    return { result: ExecutionResultEnum.Success, spec: spec };
  }

  private async buildProjectFromSpec(
    spec: Spec,
    tempFolder: string,
    tempAppName: string
  ): Promise<ChatResponseFileTree[]> {
    const host = spec.appendix.host.toLowerCase();
    const createInputs = {
      capabilities: spec.appendix.isCustomFunction ? "excel-cfshared" : `${host}-taskpane`,
      "project-type": "office-xml-addin-type",
      "addin-host": host,
      "programming-language": "typescript",
      folder: tempFolder,
      "app-name": tempAppName,
      isFromCodeGen: true,
    };
    await vscode.commands.executeCommand(
      CHAT_EXECUTE_COMMAND_ID,
      CommandKey.Create,
      TelemetryTriggerFrom.CopilotChat,
      createInputs
    );
    if (spec.appendix.isCustomFunction) {
      await this.mergeCFCode(path.join(tempFolder, tempAppName), spec.appendix.codeSnippet);
    } else {
      await this.mergeTaskpaneCode(path.join(tempFolder, tempAppName), spec.appendix.codeSnippet);
    }
    const rootFolder = path.join(tempFolder, tempAppName);
    const root: ChatResponseFileTree = {
      name: rootFolder,
      children: [],
    };
    // this.buildTemplateFileTree(rootFolder, root);
    this.traverseFiles(rootFolder, (fullPath) => {
      const relativePath = path.relative(rootFolder, fullPath);
      fileTreeAdd(root, relativePath);
    });
    return root.children ?? [];
  }

  private traverseFiles(dir: string, callback: (relativePath: string) => void): void {
    fs.readdirSync(dir).forEach((file) => {
      const fullPath = path.join(dir, file);
      if (fs.lstatSync(fullPath).isDirectory()) {
        this.traverseFiles(fullPath, callback);
      } else {
        callback(fullPath);
      }
    });
  }

  private async mergeTaskpaneCode(filePath: string, generatedCode: string) {
    const tsFileUri = vscode.Uri.file(path.join(filePath, "src", "taskpane", "taskpane.ts"));
    const htmlFileUri = vscode.Uri.file(path.join(filePath, "src", "taskpane", "taskpane.html"));

    try {
      // Read the file
      const tsFileData = await vscode.workspace.fs.readFile(tsFileUri);
      const tsFileContent: string = tsFileData.toString();
      const htmlFileData = await vscode.workspace.fs.readFile(htmlFileUri);
      const htmlFileContent: string = htmlFileData.toString();

      // Replace the code snippet part in taskpane.ts
      const runFunctionStart = tsFileContent.indexOf("export async function run()");
      const runFunctionEnd: number = tsFileContent.lastIndexOf("}");
      const runFunction = tsFileContent.slice(runFunctionStart, runFunctionEnd + 1);
      let modifiedTSContent = tsFileContent.replace(runFunction, generatedCode);
      // Replace the onClick event
      const mapStartIndex = modifiedTSContent.indexOf(
        `document.getElementById("run").onclick = run`
      );
      const mapEndIndex = mapStartIndex + `document.getElementById("run").onclick = run`.length;
      const map = modifiedTSContent.slice(mapStartIndex, mapEndIndex);
      modifiedTSContent = modifiedTSContent.replace(
        map,
        `document.getElementById("run").onclick = main`
      );

      // Update the HTML content
      const ulStart = htmlFileContent.indexOf('<ul class="ms-List ms-welcome__features">');
      const ulEnd = htmlFileContent.indexOf("</ul>") + "</ul>".length;
      const ulSection = htmlFileContent.slice(ulStart, ulEnd);
      const htmlIntroduction = `<p class="ms-font-l"> This is an add-in generated by Office Agent in GitHub Copilot</p>`;
      const modifiedHtmlContent = htmlFileContent.replace(ulSection, htmlIntroduction);

      // Write the modified content back to the file
      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(tsFileUri, encoder.encode(modifiedTSContent));
      await vscode.workspace.fs.writeFile(htmlFileUri, encoder.encode(modifiedHtmlContent));
    } catch (error) {
      console.error("Failed to modify file", error);
    }
  }

  private async mergeCFCode(filePath: string, generatedCode: string) {
    const functionFileUri = vscode.Uri.file(
      path.join(filePath, "src", "functions", "functions.ts")
    );
    try {
      // Read the file
      const functionFileData = await vscode.workspace.fs.readFile(functionFileUri);
      const functionFileContent: string = functionFileData.toString();
      // Add the new function to functions.ts
      const modifiedFunctionContent = "\n" + functionFileContent + generatedCode + "\n";
      // Write the modified content back to the file
      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(functionFileUri, encoder.encode(modifiedFunctionContent));
    } catch (error) {
      console.error("Failed to modify file", error);
    }
  }
}
