import * as dree from "dree";
import * as fs from "fs";
import { existsSync } from "fs";
import { encoding_for_model } from "tiktoken";
import * as vscode from "vscode";
import { AgentRequest } from "../chat/agent";
import {
  LanguageModelID,
  getResponseAsStringCopilotInteraction,
  verbatimCopilotInteraction,
} from "../chat/copilotInteractions";
import { IntentDetectionTarget, detectIntent } from "../chat/intentDetection";
import {
  SlashCommand,
  SlashCommandHandlerResult,
  SlashCommands,
} from "../chat/slashCommands";
import { AzureServices } from "../data/azureService";
import * as prompt from "../prompt/codeToCloudPrompt";
import path = require("path");

const codeToCloudCommandName = "codetocloud";

export function getCodeToCloudCommand(): SlashCommand {
  return [
    codeToCloudCommandName,
    {
      shortDescription: `code to cloud`,
      longDescription: `code to cloud`,
      intentDescription: "",
      handler: (request: AgentRequest) => codeToCloudHandler(request),
    },
  ];
}

const recommendHandlerName = "recommend";
function getRecommendHandler(): SlashCommand {
  return [
    recommendHandlerName,
    {
      shortDescription: `Recommend Azure Resources for your app, this is the first step to migrate your app to cloud.`,
      longDescription: `Recommend Azure Resources for your app, this is the first step to migrate your app to cloud.`,
      intentDescription: "",
      handler: (request: AgentRequest) => recommendHandler(request),
    },
  ];
}

const improveRecommendHandlerName = "improveRecommend";
function getImproveRecommendHandler(): SlashCommand {
  return [
    improveRecommendHandlerName,
    {
      shortDescription: `Improve, Add, Modify or Remove Azure Resources for your app. Used for improving the previous recommended Azure Resources for your app.`,
      longDescription: `Improve, Add, Modify or Remove Azure Resources for your app.  Used for improving the previous recommended Azure Resources for your app.`,
      intentDescription: "",
      handler: (request: AgentRequest) => improveRecommendHandler(request),
    },
  ];
}

const pipelineHandlerName = "pipeline";
function getPipelineHandler(): SlashCommand {
  return [
    pipelineHandlerName,
    {
      shortDescription: `Create GitHub Action pipeline for your app. After you recommend azure resource for your app, you can create GitHub Action pipeline for your app.`,
      longDescription: `Create GitHub Action pipeline for your app. After you recommend azure resource for your app, you can create GitHub Action pipeline for your app.`,
      intentDescription: "",
      handler: (request: AgentRequest) => pipelineHandler(request),
    },
  ];
}

const improvePipelineHandlerName = "improvePipeline";
function getImprovePipelineHandler(): SlashCommand {
  return [
    improvePipelineHandlerName,
    {
      shortDescription: `Improve GitHub Action pipeline for your app. After you generate pipeline for your app, you can improve it.`,
      longDescription: `Improve GitHub Action pipeline for your app. After you generate pipeline for your app, you can improve it.`,
      intentDescription: "",
      handler: (request: AgentRequest) => improvePipelineHandler(request),
    },
  ];
}

const LANGUAGE_MODEL_GPT4_ID = "copilot-gpt-4";
const LANGUAGE_MODEL_GPT35_TURBO_ID = "copilot-gpt-3.5-turbo";

const handlerMap = new Map([
  getRecommendHandler(),
  getPipelineHandler(),
  getImproveRecommendHandler(),
  getImprovePipelineHandler(),
]);
const invokeableCodeToCloudSubHandlers: SlashCommands = new Map();
for (const [name, config] of handlerMap.entries()) {
  invokeableCodeToCloudSubHandlers.set(name, config);
}

async function codeToCloudHandler(
  request: AgentRequest
): Promise<SlashCommandHandlerResult> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!workspaceFolder) {
    request.response.markdown(
      vscode.l10n.t("No workspace folder is opened.\n")
    );
  } else {
    const intentDetectionTargets = Array.from(
      invokeableCodeToCloudSubHandlers.entries()
    ).map(([name, config]) => ({
      name: name,
      intentDetectionDescription:
        config.intentDescription || config.shortDescription,
    }));

    const detectedTarget = await detectIntentWithHistory(
      intentDetectionTargets,
      request
    );
    if (detectedTarget !== undefined) {
      const subHandlerName = detectedTarget.name;
      const subHandler = invokeableCodeToCloudSubHandlers.get(subHandlerName);
      if (subHandler !== undefined) {
        await subHandler.handler(request);
      }
    } else {
      request.response.markdown(
        vscode.l10n.t("Sorry, I can't help with that right now.\n")
      );
    }
  }

  return {
    chatAgentResult: { metadata: { slashCommand: codeToCloudCommandName } },
    followUp: [],
  };
}

const excludePaths = [
  ".git",
  "node_modules",
  "dist",
  "infra",
  "Deployment",
  ".github",
  ".vscode",
  ".gitignore",
  ".npmignore",
  ".babelrc",
  "package-lock.json",
  "LICENSE",
  "LICENSE.md",
  "SECURITY.md",
  "CODE_OF_CONDUCT.md",
  "teamsapp.local.yml",
  "teamsapp.yml",
  "azure.yaml",
  "locales",
];

const excludeExtensions = [
  /.*\.css$/,
  /.*\.resx$/,
  /.*\.zip$/,
  /.*\.pbix$/,
  /.*\.idx$/,
  /.*\.pack$/,
  /.*\.rev$/,
  /.*\.png$/,
  /.*\.jpg$/,
  /.*\.jpeg$/,
  /.*\.resx$/,
  /.*\.gif$/,
  /.*\.bicep$/,
  /.*\.tf$/,
  /.*\.txt$/,
  /.*\.html$/,
  /.*\.d\.ts$/,
  /.*\.dll$/,
];

const excludeReg = [
  new RegExp(excludePaths.join("|")),
  ...excludeExtensions.map((ext) => new RegExp(ext)),
];

class WorkspaceContext {
  workspaceFolder: string;
  workspaceFolderTree: dree.Dree;
  workspaceFolderTreeString: string;

  constructor(workspaceFolder: string) {
    this.workspaceFolder = workspaceFolder;
  }

  async constuctWorkspaceFolderTree(): Promise<dree.Dree> {
    const folderDree: dree.Dree = await dree.scanAsync(this.workspaceFolder, {
      exclude: excludeReg,
    });

    const filterEmptyDirectory = (node: dree.Dree): void => {
      if (node.type === dree.Type.DIRECTORY) {
        node.children?.forEach((child) => filterEmptyDirectory(child));
        node.children = node.children?.filter((child) => {
          if (
            child.type === dree.Type.DIRECTORY &&
            (!child.children || child.children.length === 0)
          ) {
            return false;
          }
          return true;
        });
      }
    };

    filterEmptyDirectory(folderDree);

    return folderDree;
  }

  public async getWorkspaceFolderTree(): Promise<dree.Dree> {
    if (!this.workspaceFolderTree) {
      this.workspaceFolderTree = await this.constuctWorkspaceFolderTree();
    }

    return this.workspaceFolderTree;
  }

  public async getWorkspaceFolderTreeString(): Promise<string> {
    if (!this.workspaceFolderTreeString) {
      let folderTree = await this.getWorkspaceFolderTree();
      let folderTreeString = await dree.parseTreeAsync(folderTree);
      folderTreeString = folderTreeString
        .replace(/├── /g, "")
        .replace(/├─> /g, "")
        .replace(/│  /g, "")
        .replace(/└── /g, "")
        .replace(/└─> /g, "");

      this.workspaceFolderTreeString = folderTreeString;
    }

    return this.workspaceFolderTreeString;
  }

  public async asyncScanWorkspace(
    callback: (node: dree.Dree) => void,
    exclude: RegExp[] = excludeReg
  ) {
    await dree.scanAsync(this.workspaceFolder, { exclude }, callback);
  }
}

class ChatMessageHistory {
  MaxHistoryNumber = 10;
  recommendChatMessageHistory: vscode.LanguageModelChatMessage[] = [];
  pipelineChatMessageHistory: vscode.LanguageModelChatMessage[] = [];

  public addRecommendChatMessageHistory(
    ...history: vscode.LanguageModelChatMessage[]
  ) {
    this.recommendChatMessageHistory.push(...history);
    if (this.recommendChatMessageHistory.length > this.MaxHistoryNumber) {
      this.recommendChatMessageHistory = this.recommendChatMessageHistory.slice(
        -this.MaxHistoryNumber
      );
    }
  }

  public getRecommendChatMessageHistory(count: number = 1) {
    return this.recommendChatMessageHistory.slice(-count);
  }

  public addPipelineChatMessageHistory(
    ...history: vscode.LanguageModelChatMessage[]
  ) {
    this.pipelineChatMessageHistory.push(...history);
    if (this.pipelineChatMessageHistory.length > this.MaxHistoryNumber) {
      this.pipelineChatMessageHistory = this.pipelineChatMessageHistory.slice(
        -this.MaxHistoryNumber
      );
    }
  }

  public getPipelineChatMessageHistory() {
    return this.pipelineChatMessageHistory;
  }
}

/** Context of current workspace */
class Context {
  static instance: Context;
  workspaceFolder: string;
  workspaceContext: WorkspaceContext;
  chatMessageHistory: ChatMessageHistory;
  lastRecommendResult: string;
  lastPipelineResult: string;

  constructor(workspaceFolder: string) {
    // TODO: the workspace folder should exist
    this.workspaceFolder = workspaceFolder;
    this.workspaceContext = new WorkspaceContext(workspaceFolder);
    this.chatMessageHistory = new ChatMessageHistory();
  }

  public static getInstance(): Context {
    const workspaceFolder = vscode.workspace.workspaceFolders![0].uri.fsPath;
    if (
      !Context.instance ||
      Context.instance.workspaceFolder !== workspaceFolder
    ) {
      Context.instance = new Context(workspaceFolder);
    }

    return Context.instance;
  }
}

/** Recommend and Improve Azure Resources */
export interface ScanProjectResult {
  filePath: string;
  explanation?: string;
  relevance: number;
}

export interface VerifyFilePathResult {
  relativePath: string;
  absolutePath: string;
}

export interface AnalyzeFileResult {
  filePath: string;
  analyzeResult: string;
}

const TopFileNumber = 10;

async function recommendHandler(
  request: AgentRequest
): Promise<SlashCommandHandlerResult> {
  const scanProjectResults: ScanProjectResult[] = await scanProject(request);
  const filepaths: VerifyFilePathResult[] = await verifyFilePath(
    scanProjectResults.map((item) => item.filePath),
    request
  );
  const analyzeFileResults: AnalyzeFileResult[] = await analyzeFile(
    filepaths.map((item) => {
      return {
        absolutePath: item.absolutePath,
        relativePath: item.relativePath,
      };
    }),
    request
  );
  // TODO: check token size
  const analyzeSummarization: string = await summarizeAnalyzeResult(
    analyzeFileResults.map((item) => item.analyzeResult),
    request
  );
  const proposals: string[] = await recommendProposal(
    analyzeSummarization,
    request
  );

  await aggregateProposal(proposals, request);

  return undefined;
}

// match package.json or app.ts
const rulebasedFileName = [
  "package.json",
  "app.ts",
  "app.js",
  "index.ts",
  "index.js",
  "README.md",
  /.*\.csproj$/,
  "Program.cs",
  "Startup.cs",
  "appsettings.json",
  "Dockerfile",
];
const fileReg = new RegExp(rulebasedFileName.join("|"));

async function scanProject(
  request: AgentRequest
): Promise<ScanProjectResult[]> {
  request.response.progress("Scan Project...");

  const context: Context = Context.getInstance();
  const workspaceContext: WorkspaceContext = context.workspaceContext;

  const folderTreeString =
    await workspaceContext.getWorkspaceFolderTreeString();
  const { systemPrompt, userPrompt } = prompt.getScanProjectPrompt(
    folderTreeString,
    TopFileNumber
  );
  const response = await getResponseInteraction(
    systemPrompt,
    userPrompt,
    request,
    LANGUAGE_MODEL_GPT4_ID
  );

  let scanProjectResult: ScanProjectResult[] = [];
  try {
    scanProjectResult = JSON.parse(response).result;
    scanProjectResult.sort((a, b) => b.relevance - a.relevance);
  } catch (error) {
    // rule-based file path filtering
    const cache = new Set<string>();
    await workspaceContext.asyncScanWorkspace((node) => {
      if (scanProjectResult.length > TopFileNumber) {
        return;
      }

      const fileRelativePathWithoutExt = path.join(
        path.dirname(node.relativePath),
        node.name.split(".")[0]
      );

      if (cache.has(fileRelativePathWithoutExt)) {
        return;
      } else if (fileReg.test(node.name)) {
        cache.add(fileRelativePathWithoutExt);
        scanProjectResult.push({
          filePath: node.relativePath,
          relevance: 10,
        });
      }
    });
  }
  return scanProjectResult;
}

async function verifyFilePath(
  filePaths: string[],
  request
): Promise<VerifyFilePathResult[]> {
  let verifiedFilePaths: VerifyFilePathResult[] = [];
  const workspaceContext: WorkspaceContext =
    Context.getInstance().workspaceContext;

  const scanFilePaths = filePaths.map((item) => {
    return {
      relativePath: item,
      absolutePath: path.join(workspaceContext.workspaceFolder, item),
    };
  });

  const unexistFiles: string[] = [];
  scanFilePaths.forEach((item) => {
    if (
      existsSync(item.absolutePath) &&
      fs.lstatSync(item.absolutePath).isFile()
    ) {
      verifiedFilePaths.push({
        relativePath: item.relativePath,
        absolutePath: item.absolutePath,
      });
    } else {
      console.log(
        `File not exists: ${item.relativePath} - ${item.absolutePath}`
      );
      unexistFiles.push(item.relativePath);
    }
  });

  if (unexistFiles.length > 0) {
    await Context.getInstance().workspaceContext.asyncScanWorkspace((node) => {
      if (unexistFiles.length === 0) {
        return;
      }
      // check if the node.relativePath has the end string of one of unexistFiles
      for (const file of unexistFiles) {
        if (node.relativePath.endsWith(file)) {
          verifiedFilePaths.push({
            relativePath: node.relativePath,
            absolutePath: path.join(
              Context.getInstance().workspaceFolder,
              node.relativePath
            ),
          });
          unexistFiles.splice(unexistFiles.indexOf(file), 1);
          break;
        }
      }
    });
  }

  verifiedFilePaths = verifiedFilePaths.slice(0, TopFileNumber);
  request.response.markdown(
    `## Identify the following files for analysis: \n\n
\`\`\`
${verifiedFilePaths.map((item) => `- ${item.relativePath}`).join("\n")}
\`\`\``
  );

  return verifiedFilePaths;
}

/** TODO:
 * 1. how many tokens could be used for extension
 * 2. token limit calculation includes the whole userMessage and history
 */
const FileContentTokenLimit: number = 800; // a temporary value
async function readAndCompressFileContent(
  filePath: string,
  tokenLimit: number = FileContentTokenLimit
): Promise<string> {
  // read file content and remove all empty line
  const fileContent = await vscode.workspace.fs.readFile(
    vscode.Uri.file(filePath)
  );

  const textDecoder = new TextDecoder();
  const decodedContent = textDecoder.decode(fileContent);
  // remove empty line and the leading and trailing white space
  const compressedContent = decodedContent
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => line.trim())
    .join("\n");

  // compress the content to fit the token limit
  // TODO: set model ID dynamicly.
  const enc = encoding_for_model("gpt-3.5-turbo");
  const encodedContent = enc.encode(compressedContent);
  if (encodedContent.length > tokenLimit) {
    const compressedContent = textDecoder.decode(
      enc.decode(encodedContent.slice(0, tokenLimit))
    );
    return compressedContent;
  }
  return compressedContent;
}

async function analyzeFile(
  filePaths: { absolutePath: string; relativePath: string }[],
  request: AgentRequest
): Promise<AnalyzeFileResult[]> {
  const result: AnalyzeFileResult[] = [];

  const filePathContents = await Promise.all(
    filePaths.map(async (filePath) => {
      return {
        absolutePath: filePath.absolutePath,
        relativePath: filePath.relativePath,
        fileContent: await readAndCompressFileContent(filePath.absolutePath),
      };
    })
  );

  for (let filePathContent of filePathContents) {
    request.response.progress(`Analyze ${filePathContent.relativePath}...`);
    const { systemPrompt, userPrompt } = prompt.getAnalyzeFilePrompt(
      filePathContent.absolutePath,
      filePathContent.fileContent
    );
    const response = await getResponseInteraction(
      systemPrompt,
      userPrompt,
      request
    );

    result.push({
      filePath: filePathContent.relativePath,
      analyzeResult: response,
    });
  }

  return result;
}

async function summarizeAnalyzeResult(
  analyzeResults: string[],
  request: AgentRequest
): Promise<string> {
  request.response.progress("Aggregrate Analyze Result...");

  const { systemPrompt, userPrompt } =
    prompt.getSummarizeAnalyzeResultPrompt(analyzeResults);

  return await getResponseInteraction(systemPrompt, userPrompt, request);
}

const ProposalNumber = 3;

async function recommendProposal(
  analyzeSummarization: string,
  request: AgentRequest
): Promise<string[]> {
  request.response.progress(`Recommend Azure Resource proposal...`);

  const proposals: string[] = [];
  const allAzureService = Object.values(AzureServices).join("\n\n");
  const { systemPrompt, userPrompt } = prompt.getRecommendProposalPrompt(
    analyzeSummarization,
    allAzureService,
    request.userPrompt
  );

  // execute 3 times
  for (let i = 0; i < ProposalNumber; i++) {
    const response = await getResponseInteraction(
      systemPrompt,
      userPrompt,
      request,
      LANGUAGE_MODEL_GPT4_ID
    );
    proposals.push(response);
  }

  return proposals;
}

async function aggregateProposal(
  proposals: string[],
  request: AgentRequest
): Promise<void> {
  request.response.progress(`Aggregate Azure Resource...`);

  const chatMessageHistory: vscode.LanguageModelChatMessage[] = [];
  const systemPrompt = prompt.RecommendSystemPrompt;
  const userCountPrompt = prompt.getRecommendCountPrompt(proposals).userPrompt;
  const countResponse = await getResponseInteraction(
    systemPrompt,
    userCountPrompt,
    request,
    LANGUAGE_MODEL_GPT4_ID
  );
  chatMessageHistory.push(
    new vscode.LanguageModelChatUserMessage(userCountPrompt),
    new vscode.LanguageModelChatAssistantMessage(countResponse)
  );

  const userSelectPrompt = prompt.getRecommendSelectPrompt(
    ProposalNumber,
    countResponse
  ).userPrompt;
  const selectResponse = await getResponseInteraction(
    systemPrompt,
    userSelectPrompt,
    request,
    LANGUAGE_MODEL_GPT4_ID
  );
  chatMessageHistory.push(
    new vscode.LanguageModelChatUserMessage(userSelectPrompt),
    new vscode.LanguageModelChatAssistantMessage(selectResponse)
  );

  const userAggregatePrompt = prompt.getRecommendAggregatePrompt(
    ProposalNumber,
    selectResponse
  ).userPrompt;
  const response: {
    copilotResponded: boolean;
    copilotResponse: undefined | string;
  } = await verbatimInteraction(
    systemPrompt,
    userAggregatePrompt,
    request,
    LANGUAGE_MODEL_GPT4_ID,
    chatMessageHistory
  );

  if (response.copilotResponded) {
    const context = Context.getInstance();
    context.chatMessageHistory.addRecommendChatMessageHistory(
      new vscode.LanguageModelChatAssistantMessage(
        response.copilotResponse as string
      )
    );
    context.lastRecommendResult = response.copilotResponse as string;
  }
}

async function improveRecommendHandler(
  request: AgentRequest
): Promise<SlashCommandHandlerResult> {
  request.response.progress("Improve Azure Resources...");
  Context.getInstance().chatMessageHistory;
  const chatMessageHistory = collectChatMessageHistory(request, 4);
  const { systemPrompt, userPrompt } = prompt.getImproveRecommendPrompt(
    Context.getInstance().lastRecommendResult,
    request.userPrompt
  );

  const response: {
    copilotResponded: boolean;
    copilotResponse: undefined | string;
  } = await verbatimInteraction(
    systemPrompt,
    userPrompt,
    request,
    LANGUAGE_MODEL_GPT4_ID,
    chatMessageHistory
  );

  if (response.copilotResponded) {
    const context = Context.getInstance();
    context.chatMessageHistory.addRecommendChatMessageHistory(
      new vscode.LanguageModelChatAssistantMessage(
        response.copilotResponse as string
      )
    );
    context.lastRecommendResult = response.copilotResponse as string;
  }

  return undefined;
}

/** Recommend and Improve GitHub Action Pipeline */
async function pipelineHandler(
  request: AgentRequest
): Promise<SlashCommandHandlerResult> {
  // const subproject = await detectSubproject(request);

  await generatePipeline(request);

  return undefined;
}

async function detectSubproject(request: AgentRequest): Promise<string> {
  request.response.progress("Identify the project...");

  const workspaceContext: WorkspaceContext =
    Context.getInstance().workspaceContext;
  const folderTreeString =
    await workspaceContext.getWorkspaceFolderTreeString();
  const { systemPrompt, userPrompt } =
    prompt.getDetectSubprojectPrompt(folderTreeString);

  const response = await getResponseInteraction(
    systemPrompt,
    userPrompt,
    request,
    LANGUAGE_MODEL_GPT4_ID
  );

  return response;
}

async function generatePipeline(request: AgentRequest): Promise<void> {
  request.response.progress("Generate GitHub Action Pipeline...");
  const folderTreeString =
    await Context.getInstance().workspaceContext.getWorkspaceFolderTreeString();
  const azureResourceRecommendation = Context.getInstance().lastRecommendResult;
  const { systemPrompt, userPrompt } = prompt.getGeneratePipelinePrompt(
    folderTreeString,
    request.userPrompt,
    azureResourceRecommendation
  );
  const response: {
    copilotResponded: boolean;
    copilotResponse: undefined | string;
  } = await verbatimInteraction(
    systemPrompt,
    userPrompt,
    request,
    LANGUAGE_MODEL_GPT4_ID
  );

  if (response.copilotResponded) {
    Context.getInstance().chatMessageHistory.addPipelineChatMessageHistory(
      new vscode.LanguageModelChatAssistantMessage(
        response.copilotResponse as string
      )
    );
    Context.getInstance().lastPipelineResult =
      response.copilotResponse as string;
  }
}

async function improvePipelineHandler(
  request: AgentRequest
): Promise<SlashCommandHandlerResult> {
  request.response.progress("Improve GitHub Action Pipeline...");
  const azureResourceRecommendation = Context.getInstance().lastRecommendResult;
  const lastPipelineResult = Context.getInstance().lastPipelineResult;
  const { systemPrompt, userPrompt } = prompt.getImprovePipelinePrompt(
    request.userPrompt,
    azureResourceRecommendation,
    lastPipelineResult
  );
  const response: {
    copilotResponded: boolean;
    copilotResponse: undefined | string;
  } = await verbatimInteraction(
    systemPrompt,
    userPrompt,
    request,
    LANGUAGE_MODEL_GPT4_ID
  );

  if (response.copilotResponded) {
    Context.getInstance().chatMessageHistory.addPipelineChatMessageHistory(
      new vscode.LanguageModelChatAssistantMessage(
        response.copilotResponse as string
      )
    );
    Context.getInstance().lastPipelineResult =
      response.copilotResponse as string;
  }

  return undefined;
}

/** utils */
function collectChatMessageHistory(
  request: AgentRequest,
  historyNumber: number = 6
): vscode.LanguageModelChatMessage[] {
  const chatMessageHistory: vscode.LanguageModelChatMessage[] = [];

  for (let history of request.context.history.slice(-historyNumber)) {
    if (history instanceof vscode.ChatRequestTurn) {
      const userPrompt = (history as vscode.ChatRequestTurn).prompt;
      chatMessageHistory.push(
        new vscode.LanguageModelChatUserMessage(userPrompt)
      );
    } else {
      for (let response of history.response) {
        let assistantPrompt = "";
        switch (response.constructor) {
          case vscode.ChatResponseMarkdownPart:
            assistantPrompt = (response as vscode.ChatResponseMarkdownPart)
              .value.value;
            break;
        }
        if (assistantPrompt !== "") {
          chatMessageHistory.push(
            new vscode.LanguageModelChatAssistantMessage(assistantPrompt)
          );
        }
      }
    }
  }

  return chatMessageHistory;
}

async function getResponseInteraction(
  systemPrompt: string,
  userPrompt: string,
  request: AgentRequest,
  languageModelID: LanguageModelID = LANGUAGE_MODEL_GPT35_TURBO_ID,
  chatMessageHistory: vscode.LanguageModelChatMessage[] = []
): Promise<string> {
  const originalUserPrompt = request.userPrompt;
  request.userPrompt = userPrompt;
  request.commandVariables = { languageModelID, chatMessageHistory };
  const response = await getResponseAsStringCopilotInteraction(
    systemPrompt,
    request
  );

  request.userPrompt = originalUserPrompt;
  request.commandVariables = undefined;
  return response || "";
}

async function verbatimInteraction(
  systemPrompt: string,
  userPrompt: string,
  request: AgentRequest,
  languageModelID: LanguageModelID = LANGUAGE_MODEL_GPT35_TURBO_ID,
  chatMessageHistory: vscode.LanguageModelChatMessage[] = []
): Promise<{ copilotResponded: boolean; copilotResponse: undefined | string }> {
  const originalUserPrompt = request.userPrompt;
  request.userPrompt = userPrompt;
  request.commandVariables = { languageModelID, chatMessageHistory };
  const response = await verbatimCopilotInteraction(systemPrompt, request);

  request.userPrompt = originalUserPrompt;
  request.commandVariables = undefined;
  return response;
}

async function detectIntentWithHistory(
  intentDetectionTargets: {
    name: string;
    intentDetectionDescription: string;
  }[],
  request: AgentRequest
): Promise<IntentDetectionTarget | undefined> {
  const originalUserPrompt = request.userPrompt;
  let promptPrefix = "";
  const recommendChatMessageHistory: vscode.LanguageModelChatMessage[] =
    Context.getInstance().chatMessageHistory.getRecommendChatMessageHistory();
  if (recommendChatMessageHistory.length > 0) {
    promptPrefix = [
      promptPrefix,
      "You have recommend Azure resources for me.",
    ].join(",");
  }

  const pipelineChatMessageHistory: vscode.LanguageModelChatMessage[] =
    Context.getInstance().chatMessageHistory.getPipelineChatMessageHistory();
  if (pipelineChatMessageHistory.length > 0) {
    promptPrefix = [
      promptPrefix,
      "You have generate GitHub Action pipeline for me.",
    ].join(",");
  }

  const userPrompt = promptPrefix + originalUserPrompt;
  request.userPrompt = userPrompt;
  const chatMessageHistory: vscode.LanguageModelChatMessage[] =
    collectChatMessageHistory(request, 2);
  request.commandVariables = {
    languageModelID: "copilot-gpt-4",
    chatMessageHistory,
  };

  const detectedTarget = await detectIntent(intentDetectionTargets, request);
  request.commandVariables = undefined;
  request.userPrompt = originalUserPrompt;

  return detectedTarget;
}
