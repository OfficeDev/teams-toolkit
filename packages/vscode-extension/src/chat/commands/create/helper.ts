// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import axios from "axios";
import * as fs from "fs-extra";
import { includes } from "lodash";
import * as path from "path";
import * as tmp from "tmp";

import { sampleProvider } from "@microsoft/teamsfx-core";
import {
  getSampleFileInfo,
  runWithLimitedConcurrency,
  sendRequestWithRetry,
} from "@microsoft/teamsfx-core/build/component/generator/utils";
import {
  CancellationToken,
  ChatRequest,
  ChatResponseFileTree,
  ChatResponseStream,
  LanguageModelChatSystemMessage,
  LanguageModelChatUserMessage,
  Uri,
} from "vscode";
import { getProjectMatchSystemPrompt } from "../../prompts";
import { IChatTelemetryData } from "../../types";
import {
  countMessageTokens,
  getCopilotResponseAsString,
  getSampleDownloadUrlInfo,
} from "../../utils";
import * as teamsTemplateMetadata from "./templateMetadata.json";
import { ProjectMetadata } from "./types";

const TOKEN_LIMITS = 2700;
const SCORE_LIMIT = 0.7;

export async function matchProject(
  request: ChatRequest,
  token: CancellationToken,
  telemetryMetadata: IChatTelemetryData
): Promise<ProjectMetadata[]> {
  const allProjectMetadata = [...getTeamsTemplateMetadata(), ...(await getTeamsSampleMetadata())];
  const matchedProjects = [
    ...(await matchSamples(request, token, telemetryMetadata)),
    ...(await matchTemplates(request, token, telemetryMetadata)),
  ];
  matchedProjects.sort((a, b) => b.score - a.score);
  const result: ProjectMetadata[] = [];
  for (const { id, score } of matchedProjects) {
    if (score < SCORE_LIMIT) {
      break;
    }
    const matchedProject = allProjectMetadata.find((config) => config.id === id);
    if (matchedProject) {
      result.push(matchedProject);
    }
  }
  return result;
}

async function matchTemplates(
  request: ChatRequest,
  token: CancellationToken,
  telemetryMetadata: IChatTelemetryData
): Promise<Array<{ id: string; score: number }>> {
  const templateExamples = [
    {
      user: "an app shown in sharepoint",
      app: "tab-spfx",
    },
    {
      user: "a tab app",
      app: "tab-non-sso",
    },
    {
      user: "a bot that accepts commands",
      app: "command-bot",
    },
  ];
  const templateMetadata = getTeamsTemplateMetadata();
  const matchedTemplates = await sendCopilotMatchRequest(
    getProjectMatchSystemPrompt(templateMetadata, templateExamples),
    request,
    token,
    telemetryMetadata
  );
  return matchedTemplates;
}

async function matchSamples(
  request: ChatRequest,
  token: CancellationToken,
  telemetryMetadata: IChatTelemetryData
): Promise<Array<{ id: string; score: number }>> {
  const sampleMetadata = await getTeamsSampleMetadata();
  const sampleExamples = [
    {
      user: "an app that manages to-do list and works in Outlook",
      app: "todo-list-with-Azure-backend-M365",
    },
    {
      user: "an app to send notification to a lot of users",
      app: "large-scale-notification",
    },
  ];
  const exampleIds = sampleExamples.map((example) => example.app);
  const sampleExampleMetadata = sampleMetadata.filter((config) => includes(exampleIds, config.id));
  const remainingSampleMetadata = sampleMetadata.filter(
    (config) => !includes(exampleIds, config.id)
  );
  let index = 0;
  let projectMetadata: ProjectMetadata[] = [...sampleExampleMetadata];
  const matchedSamples: Array<{ id: string; score: number }> = [];
  while (index < remainingSampleMetadata.length) {
    projectMetadata.push(remainingSampleMetadata[index]);
    index += 1;
    const systemPrompt = getProjectMatchSystemPrompt(projectMetadata, sampleExamples);
    const tokenNumber = countMessageTokens(systemPrompt);
    if (tokenNumber > TOKEN_LIMITS) {
      matchedSamples.push(
        ...(await sendCopilotMatchRequest(systemPrompt, request, token, telemetryMetadata))
      );
      projectMetadata = [...sampleExampleMetadata];
    }
  }
  if (projectMetadata.length > sampleExampleMetadata.length) {
    matchedSamples.push(
      ...(await sendCopilotMatchRequest(
        getProjectMatchSystemPrompt(projectMetadata, sampleExamples),
        request,
        token,
        telemetryMetadata
      ))
    );
  }
  return matchedSamples;
}

async function sendCopilotMatchRequest(
  systemPrompt: LanguageModelChatSystemMessage,
  request: ChatRequest,
  token: CancellationToken,
  telemetryMetadata: IChatTelemetryData
) {
  const messages = [systemPrompt, new LanguageModelChatUserMessage(request.prompt)];
  telemetryMetadata.chatMessages.push(...messages);

  const response = await getCopilotResponseAsString("copilot-gpt-3.5-turbo", messages, token);

  if (response) {
    try {
      const responseJson = JSON.parse(response);
      if (responseJson && responseJson.app) {
        return responseJson.app as Array<{ id: string; score: number }>;
      }
    } catch (e) {}
  }
  return [];
}

export function getTeamsTemplateMetadata(): ProjectMetadata[] {
  return teamsTemplateMetadata.map((config) => {
    return {
      id: config.id,
      type: "template",
      platform: "Teams",
      name: config.name,
      description: config.description,
      data: {
        capabilities: config.id,
        "project-type": config["project-type"],
      },
    };
  });
}

export async function getTeamsSampleMetadata(): Promise<ProjectMetadata[]> {
  const sampleCollection = await sampleProvider.SampleCollection;
  const result: ProjectMetadata[] = [];
  for (const sample of sampleCollection.samples) {
    result.push({
      id: sample.id,
      type: "sample",
      platform: "Teams",
      name: sample.title,
      description: sample.fullDescription,
    });
  }
  return result;
}

export async function showFileTree(
  projectMetadata: ProjectMetadata,
  response: ChatResponseStream
): Promise<string> {
  response.markdown(
    "\nWe've found a sample project that matches your description. Take a look at it below."
  );
  const downloadUrlInfo = await getSampleDownloadUrlInfo(projectMetadata.id);
  const { samplePaths, fileUrlPrefix } = await getSampleFileInfo(downloadUrlInfo, 2);
  const tempFolder = tmp.dirSync({ unsafeCleanup: true }).name;
  const nodes = await buildFileTree(
    fileUrlPrefix,
    samplePaths,
    tempFolder,
    downloadUrlInfo.dir,
    2,
    20
  );
  response.filetree(nodes, Uri.file(path.join(tempFolder, downloadUrlInfo.dir)));
  return path.join(tempFolder, downloadUrlInfo.dir);
}

export async function buildFileTree(
  fileUrlPrefix: string,
  samplePaths: string[],
  dstPath: string,
  relativeFolderName: string,
  retryLimits: number,
  concurrencyLimits: number
): Promise<ChatResponseFileTree[]> {
  const root: ChatResponseFileTree = {
    name: relativeFolderName,
    children: [],
  };
  const downloadCallback = async (samplePath: string) => {
    const file = (await sendRequestWithRetry(async () => {
      return await axios.get(fileUrlPrefix + samplePath, {
        responseType: "arraybuffer",
      });
    }, retryLimits)) as unknown as any;
    const relativePath = path.relative(`${relativeFolderName}/`, samplePath);
    const filePath = path.join(dstPath, samplePath);
    fileTreeAdd(root, relativePath);
    await fs.ensureFile(filePath);
    await fs.writeFile(filePath, Buffer.from(file.data));
  };
  await runWithLimitedConcurrency(samplePaths, downloadCallback, concurrencyLimits);
  return root.children ?? [];
}

export function fileTreeAdd(root: ChatResponseFileTree, relativePath: string) {
  const filename = path.basename(relativePath);
  const folderName = path.dirname(relativePath);
  const segments = path.sep === "\\" ? folderName.split("\\") : folderName.split("/");
  let parent = root;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment === ".") {
      continue;
    }
    let child = parent.children?.find((child) => child.name === segment);
    if (!child) {
      child = {
        name: segment,
        children: [],
      };
      parent.children?.push(child);
    }
    parent = child;
  }
  parent.children?.push({
    name: filename,
  });
}
