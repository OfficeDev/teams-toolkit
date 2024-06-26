// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as tmp from "tmp";
import * as officeTemplateMeatdata from "./officeTemplateMetadata.json";
import * as fs from "fs-extra";
import * as path from "path";
import {
  ChatRequest,
  CancellationToken,
  ChatResponseStream,
  ChatResponseFileTree,
  Uri,
  LanguageModelChatMessage,
  LanguageModelChatMessageRole,
} from "vscode";
import { IChatTelemetryData } from "../../../chat/types";
import { ProjectMetadata } from "../../../chat/commands/create/types";
import { getCopilotResponseAsString } from "../../../chat/utils";
import { getOfficeProjectMatchSystemPrompt } from "../../officePrompts";
import { officeSampleProvider } from "./officeSamples";
import { fileTreeAdd, buildFileTree } from "../../../chat/commands/create/helper";
import { getOfficeSampleDownloadUrlInfo } from "../../utils";
import { getSampleFileInfo } from "@microsoft/teamsfx-core/build/component/generator/utils";
import { OfficeXMLAddinGenerator } from "./officeXMLAddinGenerator/generator";
import { CreateProjectInputs } from "@microsoft/teamsfx-api";
import { core } from "../../../globalVariables";

export async function matchOfficeProject(
  request: ChatRequest,
  token: CancellationToken,
  telemetryMetadata: IChatTelemetryData
): Promise<ProjectMetadata | undefined> {
  const allOfficeProjectMetadata = [
    ...getOfficeTemplateMetadata(),
    ...(await getOfficeSampleMetadata()),
  ];
  const messages = [
    getOfficeProjectMatchSystemPrompt(allOfficeProjectMetadata),
    new LanguageModelChatMessage(LanguageModelChatMessageRole.User, request.prompt),
  ];
  telemetryMetadata.chatMessages.push(...messages);
  const response = await getCopilotResponseAsString("copilot-gpt-4", messages, token);
  let matchedProjectId: string;
  if (response) {
    try {
      const responseJson = JSON.parse(response);
      if (responseJson && responseJson.addin) {
        matchedProjectId = responseJson.addin;
      }
    } catch (e) {}
  }
  let result: ProjectMetadata | undefined;
  const matchedProject = allOfficeProjectMetadata.find((config) => config.id === matchedProjectId);
  if (matchedProject) {
    result = matchedProject;
  }
  return result;
}

export async function getOfficeSampleMetadata(): Promise<ProjectMetadata[]> {
  const sampleCollection = await officeSampleProvider.OfficeSampleCollection;
  const result: ProjectMetadata[] = [];
  for (const sample of sampleCollection.samples) {
    result.push({
      id: sample.id,
      type: "sample",
      platform: "WXP",
      name: sample.title,
      description: sample.fullDescription,
    });
  }
  return result;
}

export function getOfficeTemplateMetadata(): ProjectMetadata[] {
  return officeTemplateMeatdata.map((config) => {
    return {
      id: config.id,
      type: "template",
      platform: "WXP",
      name: config.name,
      description: config.description,
      data: {
        capabilities: config.id,
        "project-type": config["project-type"],
        "addin-host": config["addin-host"],
        agent: "office",
        "programming-language": "typescript",
      },
    };
  });
}

export async function showOfficeSampleFileTree(
  projectMetadata: ProjectMetadata,
  response: ChatResponseStream
): Promise<string> {
  response.markdown(
    "\nWe've found a sample project that matches your description. Take a look at it below."
  );
  const downloadUrlInfo = await getOfficeSampleDownloadUrlInfo(projectMetadata.id);
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

export async function showOfficeTemplateFileTree(
  data: any,
  response: ChatResponseStream,
  codeSnippet?: string
): Promise<string> {
  const tempFolder = tmp.dirSync({ unsafeCleanup: true }).name;
  const nodes = await buildTemplateFileTree(data, tempFolder, data.capabilities, codeSnippet);
  response.filetree(nodes, Uri.file(path.join(tempFolder, data.capabilities)));
  return path.join(tempFolder, data.capabilities);
}

export async function buildTemplateFileTree(
  data: any,
  tempFolder: string,
  appName: string,
  codeSnippet?: string
): Promise<ChatResponseFileTree[]> {
  const createInputs: CreateProjectInputs = {
    ...data,
    folder: tempFolder,
    "app-name": appName,
  };
  const generator = new OfficeXMLAddinGenerator();
  const result = await core.createProjectByCustomizedGenerator(createInputs, generator);
  if (result.isErr()) {
    throw new Error("Failed to generate the project.");
  }
  const projectPath = result.value.projectPath;
  const isCustomFunction = data.capabilities.includes("excel-custom-functions");
  if (!!isCustomFunction && !!codeSnippet) {
    await mergeCFCode(projectPath, codeSnippet);
  } else if (!!codeSnippet) {
    await mergeTaskpaneCode(projectPath, codeSnippet);
  }
  const root: ChatResponseFileTree = {
    name: projectPath,
    children: [],
  };
  await fs.ensureDir(projectPath);
  traverseFiles(projectPath, (fullPath) => {
    const relativePath = path.relative(projectPath, fullPath);
    fileTreeAdd(root, relativePath);
  });
  return root.children ?? [];
}

export function traverseFiles(dir: string, callback: (relativePath: string) => void): void {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      traverseFiles(fullPath, callback);
    } else {
      callback(fullPath);
    }
  });
}

export async function mergeTaskpaneCode(filePath: string, generatedCode: string) {
  const tsFilePath = path.join(filePath, "src", "taskpane", "taskpane.ts");
  const htmlFilePath = path.join(filePath, "src", "taskpane", "taskpane.html");

  try {
    // Read the file
    const tsFileData = await fs.readFile(tsFilePath, "utf8");
    const tsFileContent: string = tsFileData.toString();
    const htmlFileData = await fs.readFile(htmlFilePath, "utf8");
    const htmlFileContent: string = htmlFileData.toString();

    // Replace the code snippet part in taskpane.ts
    const runFunctionStart = tsFileContent.indexOf("export async function run()");
    const runFunctionEnd: number = tsFileContent.lastIndexOf("}");
    const runFunction = tsFileContent.slice(runFunctionStart, runFunctionEnd + 1);
    let modifiedTSContent = tsFileContent.replace(runFunction, generatedCode);
    // Replace the onClick event
    const mapStartIndex = modifiedTSContent.indexOf(`document.getElementById("run").onclick = run`);
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
    const htmlIntroduction = `<p class="ms-font-l"> This is an add-in generated by GitHub Copilot Extension for Office Add-ins</p>`;
    const modifiedHtmlContent = htmlFileContent.replace(ulSection, htmlIntroduction);

    // Write the modified content back to the file
    const encoder = new TextEncoder();
    await fs.writeFile(tsFilePath, encoder.encode(modifiedTSContent), "utf8");
    await fs.writeFile(htmlFilePath, encoder.encode(modifiedHtmlContent), "utf8");
  } catch (error) {
    console.error("Failed to modify file", error);
    throw new Error("Failed to merge the taskpane project.");
  }
}

export async function mergeCFCode(filePath: string, generatedCode: string) {
  const functionFilePath = path.join(filePath, "src", "functions", "functions.ts");
  try {
    // Read the file
    const functionFileContent = await fs.readFile(functionFilePath, "utf8");
    // Add the new function to functions.ts
    const modifiedFunctionContent = "\n" + functionFileContent + generatedCode + "\n";
    // Write the modified content back to the file
    await fs.writeFile(functionFilePath, modifiedFunctionContent, "utf8");
  } catch (error) {
    console.error("Failed to modify file", error);
    throw new Error("Failed to merge the CF project.");
  }
}

// export async function matchOfficeProjectByBM25(
//   request: ChatRequest
// ): Promise<ProjectMetadata | undefined> {
//   const allOfficeProjectMetadata = [
//     ...getOfficeTemplateMetadata(),
//     ...(await getOfficeSampleMetadata()),
//   ];
//   const documents: DocumentWithmetadata[] = allOfficeProjectMetadata.map((sample) => {
//     return {
//       documentText: prepareDiscription(sample.description.toLowerCase()).join(" "),
//       metadata: sample,
//     };
//   });

//   const bm25 = new BM25(documents);
//   const query = prepareDiscription(request.prompt.toLowerCase());

//   // at most match one sample or template
//   const matchedDocuments: BMDocument[] = bm25.search(query, 3);

//   let result: ProjectMetadata | undefined;

//   // adjust score when more samples added
//   if (matchedDocuments.length === 1 && matchedDocuments[0].score > 1) {
//     result = matchedDocuments[0].document.metadata as ProjectMetadata;
//   }

//   return result;
// }
