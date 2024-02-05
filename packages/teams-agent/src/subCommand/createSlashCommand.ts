import * as vscode from "vscode";
import { AgentRequest } from "../chat/agent";
import { verbatimCopilotInteraction } from "../chat/copilotInteractions";
import { SlashCommand, SlashCommandHandlerResult } from "../chat/slashCommands";
import { SampleUrlInfo, fetchOnlineSampleConfig } from '../sample';
import { downloadSampleFiles, getSampleFileInfo } from "../util";

const createCommandName = "create";
const CREATE_SAMPLE_COMMAND_ID = 'teamsAgent.createSample';

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
  const sampleConfig = await fetchOnlineSampleConfig();

  const { copilotResponded, copilotResponse } = await verbatimCopilotInteraction(
    getCreateSystemPrompt(sampleConfig),
    request
  );
  if (!copilotResponded) {
    request.progress.report({
      content: vscode.l10n.t("Sorry, I can't help with that right now.\n"),
    });
    return { chatAgentResult: { slashCommand: '' }, followUp: [] };
  } else {
    const candidates: Set<string> = new Set();
    for (const sample of sampleConfig.samples) {
      if (copilotResponse.includes(sample.id as string) || copilotResponse.includes(sample.title as string)) {
        candidates.add(sample.id as string);
      }
    }
    if (candidates.size > 0) {
      let followupAction: vscode.ChatAgentFollowup = {
        commandId: CREATE_SAMPLE_COMMAND_ID,
        args: [[...candidates.values()]],
        title: vscode.l10n.t('Create Sample')
      };

      return { chatAgentResult: { slashCommand: 'create' }, followUp: [followupAction] };
    }

    return { chatAgentResult: { slashCommand: '' }, followUp: [] };
  }
}

function getCreateSystemPrompt(sampleConfig): string {
  return `
  - You are an advisor for Teams App developers.
  - You want to help them to find the right Teams App sample from the sample list for their needs.
  - You need to get all Teams App samples from sample list.
  - You should analyze the Teams App samples from its title, description, types and tags etc to match user's requirement.
  - If there are multiple Teams App samples in sample list that meets requirement, you must list all of them including Teams app sample id and description sentences.
  - If you have found the best matched Teams app sample, you must let developer know the Teams App sample id and describe the sample based on its information.
  - If there is no matched Teams App sample in sample list, you should just let the developer know.
  - Here's the sample list: ${JSON.stringify(sampleConfig.samples)}.
  `;
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
