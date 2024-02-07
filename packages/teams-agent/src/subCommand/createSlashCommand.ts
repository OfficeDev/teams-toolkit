import * as vscode from "vscode";
import { AgentRequest } from "../chat/agent";
import { verbatimCopilotInteraction } from "../chat/copilotInteractions";
import { SlashCommand, SlashCommandHandlerResult } from "../chat/slashCommands";
import { ProjectMetadata, matchProject } from "../projectMatch";
import { SampleUrlInfo, fetchOnlineSampleConfig } from '../sample';
import { downloadSampleFiles, getSampleFileInfo } from "../util";

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
    request.progress.report({
      content: vscode.l10n.t("Sorry, I can't help with that right now.\n"),
    });
    return { chatAgentResult: { slashCommand: '' }, followUp: [] };
  }
  // TODO: handle multiple matches
  const firstMatch = matchedResult[0];
  if (firstMatch.type === 'sample') {
    await describeProject(firstMatch, request);
    // TODO: display project folder structure
    const followupAction: vscode.ChatAgentFollowup = {
      commandId: CREATE_SAMPLE_COMMAND_ID,
      args: [[firstMatch.id]],
      title: vscode.l10n.t('Scaffold this project')
    };
    return { chatAgentResult: { slashCommand: 'create' }, followUp: [followupAction] };
  } else {
    // TODO: Call TTK to create template
    request.progress.report({
      content: vscode.l10n.t("Sorry, I can't help with that right now.\n"),
    });
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

export async function createCommand(sampleIds: string[]) {
  const sampleConfig = await fetchOnlineSampleConfig();
  const samples = sampleConfig.samples.filter((sample) => sampleIds.findIndex((id) => id === sample.id as string) >= 0);
  if (!samples) {
    return;
  }
  let sampleId = samples[0].id as string;
  let sample = samples[0];
  if (samples.length > 1) {
    const sampleNames = samples.map((sample) => sample.title as string);
    const sampleChoice = await vscode.window.showQuickPick(sampleNames);
    if (!sampleChoice) {
      return;
    }
    sample = samples.find((sample) => sample.title === sampleChoice)!;
    sampleId = sample.id as string;
  }
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

  let downloadUrlInfo = {
    owner: "OfficeDev",
    repository: "TeamsFx-Samples",
    ref: "dev",
    dir: sampleId,
  };
  if (sample["downloadUrlInfo"]) {
    downloadUrlInfo = sample["downloadUrlInfo"] as SampleUrlInfo;
  }
  const { samplePaths, fileUrlPrefix } = await getSampleFileInfo(downloadUrlInfo, 2);
  await downloadSampleFiles(
    fileUrlPrefix,
    samplePaths,
    dstPath,
    downloadUrlInfo.dir,
    2,
    20
  );
  if (folderChoice !== "Current workspace") {
    void vscode.commands.executeCommand(
      "vscode.openFolder",
      vscode.Uri.file(dstPath),
    );
  } else {
    vscode.window.showInformationMessage('Project is created in current workspace.');
  }
}
