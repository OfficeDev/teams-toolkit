import * as fs from "fs-extra";
import * as path from "path";
import * as tmp from "tmp";
import * as vscode from "vscode";
import { AgentRequest } from "../chat/agent";
import { verbatimCopilotInteraction } from "../chat/copilotInteractions";
import { SlashCommand, SlashCommandHandlerResult } from "../chat/slashCommands";
import { ProjectMetadata, matchProject } from "../projectMatch";
import { SampleUrlInfo, fetchOnlineSampleConfig } from '../sample';
import { buildFileTree, getSampleFileInfo } from "../util";

const createCommandName = "create";
export const CREATE_SAMPLE_COMMAND_ID = 'teamsAgent.createSample';

export function getCreateCommand(): SlashCommand {
  return [createCommandName,
    {
      shortDescription: `Describe what kind of app you want to create in Teams`,
      longDescription: `Describe what kind of app you want to create in Teams`,
      intentDescription: '',
      handler: (request: AgentRequest) => createHandler(request)
    }];
}

async function createHandler(request: AgentRequest): Promise<SlashCommandHandlerResult> {
  const matchedResult = await matchProject(request);
  if (matchedResult.length === 0) {
    request.response.markdown(vscode.l10n.t("Sorry, I can't help with that right now.\n"));
    return { chatAgentResult: { slashCommand: '' }, followUp: [] };
  }
  // TODO: handle multiple matches
  const firstMatch = matchedResult[0];
  if (firstMatch.type === 'sample') {
    await describeProject(firstMatch, request);
    const folder = await showFileTree(firstMatch, request);
    const createButton: vscode.Command = {
      command: CREATE_SAMPLE_COMMAND_ID,
      arguments: [folder],
      title: vscode.l10n.t('Scaffold this project')
    };
    request.response.button(createButton);
    return { chatAgentResult: { slashCommand: 'create' }, followUp: [] };
  } else {
    // TODO: Call TTK to create template
    request.response.markdown(vscode.l10n.t("Sorry, I can't help with that right now.\n"));
    return { chatAgentResult: { slashCommand: '' }, followUp: [] };
  }
}

async function describeProject(projectMetadata: ProjectMetadata, request: AgentRequest): Promise<void> {
  const originPrompt = request.userPrompt;
  request.userPrompt = `The project you are looking for is '${JSON.stringify(projectMetadata)}'.`;
  await verbatimCopilotInteraction(
    `You are an advisor for Teams App developers. You need to describe the project based on name and description field of user's JSON content. You should control the output between 50 and 80 words.`,
    request
  );
  request.userPrompt = originPrompt;
}

async function showFileTree(projectMetadata: ProjectMetadata, request: AgentRequest): Promise<string> {
  request.response.markdown(vscode.l10n.t('\nHere is the files of the sample project.'));
  const downloadUrlInfo = await getSampleDownloadUrlInfo(projectMetadata.id);
  const { samplePaths, fileUrlPrefix } = await getSampleFileInfo(downloadUrlInfo, 2);
  const tempFolder = tmp.dirSync({ unsafeCleanup: true }).name;
  const nodes = await buildFileTree(fileUrlPrefix, samplePaths, tempFolder, downloadUrlInfo.dir, 2, 20);
  request.response.filetree(nodes, vscode.Uri.file(path.join(tempFolder, downloadUrlInfo.dir)));
  return path.join(tempFolder, downloadUrlInfo.dir);
}

async function getSampleDownloadUrlInfo(sampleId: string): Promise<SampleUrlInfo> {
  const sampleConfig = await fetchOnlineSampleConfig();
  const sample = sampleConfig.samples.find((sample) => sample.id === sampleId);
  let downloadUrlInfo = {
    owner: "OfficeDev",
    repository: "TeamsFx-Samples",
    ref: "dev",
    dir: sampleId,
  };
  if (sample && sample["downloadUrlInfo"]) {
    downloadUrlInfo = sample["downloadUrlInfo"] as SampleUrlInfo;
  }
  return downloadUrlInfo;
}

export async function createCommand(folder: string) {
  // Let user choose the project folder
  let dstPath = "";
  let folderChoice: string | undefined = undefined;
  if (vscode.workspace.workspaceFolders !== undefined && vscode.workspace.workspaceFolders.length > 0) {
    folderChoice = await vscode.window.showQuickPick(["Current workspace", "Browse..."]);
    if (!folderChoice) {
      return;
    }
    if (folderChoice === "Current workspace") {
      dstPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
    }
  }
  if (dstPath === "") {
    const customFolder = await vscode.window.showOpenDialog({
      title: "Choose where to save your project",
      openLabel: "Select Folder",
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
    });
    if (!customFolder) {
      return;
    }
    dstPath = customFolder[0].fsPath;
  }
  try {
    await fs.copy(folder, dstPath);
    if (folderChoice !== "Current workspace") {
      void vscode.commands.executeCommand(
        "vscode.openFolder",
        vscode.Uri.file(dstPath),
      );
    } else {
      vscode.window.showInformationMessage('Project is created in current workspace.');
      vscode.commands.executeCommand('workbench.view.extension.teamsfx');
    }
  } catch (error) {
    console.error('Error copying files:', error);
    vscode.window.showErrorMessage('Project cannot be created.');
  }
}
