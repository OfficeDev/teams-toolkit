import * as fs from "fs-extra";
import * as path from "path";
import * as tmp from "tmp";
import * as vscode from "vscode";
import { AgentRequest } from "../chat/agent";
import { getResponseAsStringCopilotInteraction, verbatimCopilotInteraction } from "../chat/copilotInteractions";
import { SlashCommand, SlashCommandHandlerResult } from "../chat/slashCommands";
import { ProjectMetadata, matchProject } from "../projectMatch";
import { SampleUrlInfo, fetchOnlineSampleConfig } from '../sample';
import { buildFileTree, downloadSampleFiles, getSampleFileInfo } from "../util";

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
  // TODO: Call TTK to create templates
  const matchedSamples = matchedResult.filter((result) => result.type === 'sample');

  if (matchedSamples.length === 0) {
    request.response.progress(vscode.l10n.t("Sorry, I can't help with that right now.\n"));
    return { chatAgentResult: { slashCommand: '' }, followUp: [] };
  }
  if (matchedSamples.length === 1) {
    const firstMatch = matchedSamples[0];
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
    request.response.markdown(`I found ${matchedSamples.slice(0, 3).length} projects that match your description.\n`);
    for (const project of matchedSamples.slice(0, 3)) {
      const introduction = await getResponseAsStringCopilotInteraction(
        `You are an advisor for Teams App developers. You need to describe the project based on name and description field of user's JSON content. You should control the output between 30 and 40 words.`,
        request
      );
      request.response.markdown(`- ${project.name}: ${introduction}\n`);
      request.response.button({
        command: CREATE_SAMPLE_COMMAND_ID,
        arguments: [project],
        title: vscode.l10n.t('Scaffold this project')
      });
    }
    return { chatAgentResult: { slashCommand: 'create' }, followUp: [] };
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

export async function createCommand(folderOrSample: string | ProjectMetadata) {
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
    if (typeof folderOrSample === "string") {
      await fs.copy(folderOrSample, dstPath);
    } else {
      const downloadUrlInfo = await getSampleDownloadUrlInfo(folderOrSample.id);
      const { samplePaths, fileUrlPrefix } = await getSampleFileInfo(downloadUrlInfo, 2);
      await downloadSampleFiles(fileUrlPrefix, samplePaths, dstPath, downloadUrlInfo.dir, 2, 20);
    }
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
