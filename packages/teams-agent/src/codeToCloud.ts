import axios from "axios";
import * as dree from "dree";
import * as path from 'path';
import * as vscode from "vscode";
import * as util from "./util";

interface BaseModel { }

interface ScanProjectResult extends BaseModel {
  filePath: string;
  explanation: string;
}

interface Component extends BaseModel {
  name: string;
  codeSnippet: string;
  permalink?: string;
}

interface AnalyzeFileResult extends BaseModel {
  language: string;
  appType: string;
  framework: string;
  explanation: string;
  component: Component[];
}

interface RecommendationResult extends BaseModel {
  azure_service: string;
  component: string;
  explanation: string;
  rating_score: number;
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
];

const excludeReg = [
  new RegExp(excludePaths.join("|")),
  ...excludeExtensions.map((ext) => new RegExp(ext)),
];

const buildMarkdownTableForRecommendationResult = (
  recommendationResult: RecommendationResult[],
): string[] => {
  const markdownTable = [
    '|Azure Service|Component|Explanation|Rating Score|\n',
    '|---|---|---|---|\n',
  ];
  recommendationResult.map((item) =>
    markdownTable.push(
      `|${item.azure_service}|${item.component}|${item.explanation}|${item.rating_score}|\n`,
    ),
  );
  return markdownTable;
};

export class CodeToCloud {
  topN = 10;
  progress: vscode.Progress<vscode.ChatAgentProgress>;
  token: vscode.CancellationToken;
  folderStructure?: dree.Dree;
  currentWorkspaceFolder: string;
  agentServerURL = process.env.AGENT_SERVER_URL || "http://localhost:8000";
  constructor(
    progress: vscode.Progress<vscode.ChatAgentProgress>,
    token: vscode.CancellationToken
  ) {
    this.progress = progress;
    this.token = token;
    this.currentWorkspaceFolder = vscode.workspace.workspaceFolders?.[0].uri
      .fsPath as string;
  }

  async requsetChat(chatMessages: vscode.ChatMessage[]): Promise<string> {
    const access = await vscode.chat.requestChatAccess("copilot");
    const chatRequest = await access.makeRequest(
      chatMessages,
      { response_format: { type: "json_object" } }, // TODO: seems not work
      this.token
    );
    let response = "";
    for await (const fragment of chatRequest.response) {
      response += fragment;
    }
    return response;
  }

  loadResult(response: string): any {
    console.log(
      `start to load response: \n${JSON.stringify(response, null, 2)})}`
    );
    const responseObj = JSON.parse(response);
    const result = responseObj.result;
    return result;
  }

  async reportMessage(message: string): Promise<void> {
    this.progress.report({
      content: new vscode.MarkdownString(`**${message}**\n\n`).value
    });
  }

  async constructFolderStructure(): Promise<string> {
    if (!this.folderStructure) {
      // TODO: check if there is a workspace folder
      const folderStructure: dree.Dree = await dree.scanAsync(
        this.currentWorkspaceFolder,
        {
          exclude: excludeReg,
        }
      );

      // remove directory without files
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
      filterEmptyDirectory(folderStructure);

      this.folderStructure = folderStructure;
    }

    return await dree.parseTreeAsync(this.folderStructure);
  }

  async __searchFile(filePath: string): Promise<string | undefined> {
    let result: string | undefined;
    const absFilePath = `${this.currentWorkspaceFolder}/${filePath}`;
    // check if file exists
    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(absFilePath));
      result = absFilePath;
    } catch (e) {
      // get file name without extension
      const fileName = path.basename(filePath, path.extname(filePath));
      // walk through the folder structure to find the file
      const findFile = (node: dree.Dree): void => {
        if (node.type === dree.Type.DIRECTORY) {
          node.children?.forEach((child) => findFile(child));
        } else if (node.type === dree.Type.FILE) {
          //check  node.name contain fileName
          if (node.name.includes(fileName)) {
            result = node.path;
          }
        }
      };
    }

    return result;
  }

  async scanProject(): Promise<ScanProjectResult[]> {
    const folderStructureString = await this.constructFolderStructure();

    const chatMessages: vscode.ChatMessage[] = scanProjectChatMessage(
      folderStructureString,
      this.topN
    );

    const response = await this.requsetChat(chatMessages);

    // load result
    const result: ScanProjectResult[] = this.loadResult(response);

    return result;
  }

  async verify_filePath(
    scanProjectResults: ScanProjectResult[]
  ): Promise<string[]> {
    const filePaths: string[] = [];
    for (const item of scanProjectResults) {
      const filePath = await this.__searchFile(item.filePath);
      if (filePath) {
        filePaths.push(filePath);
      }
    }

    return filePaths;
  }

  async analyzeFile(filePath: string): Promise<any> {
    const fileContent = await vscode.workspace.fs.readFile(
      vscode.Uri.file(filePath)
    );
    const fileContentStr = Buffer.from(fileContent).toString("utf8");

    const chatMessages: vscode.ChatMessage[] = analyzeSingleFileChatMessage(
      filePath,
      fileContentStr
    );

    const response = await this.requsetChat(chatMessages);

    // load result
    const result: AnalyzeFileResult[] = this.loadResult(response);

    return result;
  }

  async recommendAzureResources(): Promise<string> {
    this.reportMessage("Start to scan project...");
    const scanProjectResults: ScanProjectResult[] = await this.scanProject();
    // TODO: show intermidiate result of scanProjectResults

    // verify file path
    const filePaths = await this.verify_filePath(scanProjectResults);

    // analyze file
    this.reportMessage("Start to analyze files...");
    const analyzeFileResults: AnalyzeFileResult[] = [];
    for (const filePath of filePaths) {
      const singleFileResult = await this.analyzeFile(filePath);
      analyzeFileResults.push(...singleFileResult);
    }

    // recommend azure resources
    this.reportMessage("Start to recommend azure resources...");
    const data = {
      analyzation_result: {
        language: analyzeFileResults.map((item) => item.language).join(","),
        app_type: analyzeFileResults.map((item) => item.appType).join(","),
        framework: analyzeFileResults.map((item) => item.framework).join(","),
        component: analyzeFileResults
          .map(
            (item) => item.component?.map((cItem) => cItem.name).join(",") || ""
          )
          .join(","),
      },
      folder_structure: await this.constructFolderStructure(),
    };

    const response = await util.sendRequestWithTimeout(async () => {
      return await axios.post(
        `${this.agentServerURL}/recommend_azure_resource`,
        data
      );
    }, 1000 * 60 * 5);

    const recommendationResult: RecommendationResult[] = response.data;

    const markdownTable = buildMarkdownTableForRecommendationResult(recommendationResult);

    return markdownTable.join("");
  }
}

const scanProjectChatMessage = (
  folderStructure: string,
  topNumber: number = 10
): vscode.ChatMessage[] => {
  const chatMessages: vscode.ChatMessage[] = [];

  // system message
  const systemMessage: vscode.ChatMessage = new vscode.ChatMessage(
    vscode.ChatMessageRole.System,
    "As a senior developer and consultant specializing in Azure services, your task is to examine the provided code file and recommend the most suitable Azure services for deploying the application."
  );

  // user message
  const userMessage: vscode.ChatMessage = new vscode.ChatMessage(
    vscode.ChatMessageRole.User,
    `
Analyze the project with the given [Folder Structure], determine which source files need to be examined for recommending an Azure service. Proceed step by step and follow the [Guidance Rules] throughout the process. Response the answer follow by [Response Rules].

[Guidance Rules]
- To locate the file name corresponding to a given file path, utilize your expertise and experience to assess the file type and its potential significance in relation to the analysis objectives. For instance, if the file path leads to a "/path/.../package.json" file, it is likely a configuration file utilized in Node.js projects, making it pertinent to the analysis goals.
- Identify key component: Look for the main components of the project, such as source code files, documentation, configuration files, and test files. These components will help you narrow down the list of potentially relevant files.
- Analyze file extensions: Different file types serve different purposes. For example, source code files usually have extensions like .c, .cpp, .java, .js, .py, etc. By looking at the file extensions, you can identify the types of files and their potential relevance to the analysis.
- Consult project documentation: Well-documented projects will often provide guidance on which files are essential to the project or outline the overall structure of the project. This can help you identify key files for analysis.
- Focus on your analysis goals: Always keep your analysis goals in mind when selecting files. Choose files that are most relevant to your objectives and will provide the most valuable insights.
[Guidance Rules]

[Folder Structure]
${folderStructure}
[Folder Structure]

[Folder Structure Format]
- Each folder and file is listed on a separate line.
- The indentation level is determined by the number of spaces before the folder or file name.
- The indentation level represents the depth or level in the directory hierarchy.
- Each level of indentation corresponds to two spaces (" ").
- The higher the level value, the deeper the indentation.
- Folders are listed before files at each level of the hierarchy.
- Subfolders and files within a folder are indented by an additional two spaces for each level of nesting.
[Folder Structure Format]

[Response Rules]
- **IMPORTANT: Ensure that answers are ONLY given in the [Response JSON Format].**
- List at least the top ${topNumber} files for analyzing the components of the project, ranked in order of their potential relevance to the analysis goals, from highest to lowest relevance.
- MAKE SURE the 'filepath' is picked from [Folder Structure]
- Make sure the response is valid JSON
[Response Rules]

The response JSON only contain one key "result", the value of result is an array composed of multi json content showd as bellow:
[Response JSON Format]
  "filePath": "Provide the file path of the code to be examined and analyzed. Do not include the project root path. Use '/' to delimit each directory. IMPORTANT: DO NOT return an invalid or non-existent 'filePath' that does not exist in the [Folder Structure] and MAKE SURE the 'filepath' is picked from [Folder Structure]. The format of the [Folder Structure] is explained in the [Folder Structure Format]."
  "explanation": "Explain the rationale behind selecting this file for examination."
  "reference": "Provide origin path in [Folder Structure], concat them by ";". This is a double-check for the filepath is picked from [Folder Structure]."
[Response JSON Format]

The response only contain json content WITHOUT ANY OTHER DATA, an example showed as bellow:
{
  "result": [
    {
      "filePath": "src/codeToCloud.ts",
      "explanation": "The codeToCloud.ts file contains the logic for the Code to Cloud feature.",
      "reference": "src/codeToCloud.ts"
    },
    {
      "filePath": "src/util.ts",
      "explanation": "The util.ts file contains the logic for the utility functions.",
      "reference": "src/util.ts"
    }
  ]
}

response:
`
  );

  // push messages
  chatMessages.push(systemMessage);
  chatMessages.push(userMessage);

  return chatMessages;
};

const analyzeSingleFileChatMessage = (
  filePath: string,
  fileContent: string
): vscode.ChatMessage[] => {
  const chatMessage: vscode.ChatMessage[] = [];

  // system message
  const systemMessage: vscode.ChatMessage = new vscode.ChatMessage(
    vscode.ChatMessageRole.System,
    "As a senior developer and consultant specializing in Azure services, your task is to examine the provided code file"
  );
  chatMessage.push(systemMessage);

  // user message
  const userMessage: vscode.ChatMessage = new vscode.ChatMessage(
    vscode.ChatMessageRole.User,
    `
Analyze the source code or document of ${filePath} provided in the [Code or Document] section, offering precise and detailed information about the project's components, along with evidence and reasoning. Follow the [Guidance Rules] step by step. Response the answer follow by [Response Rules].

[Guidance Rules]
- Lookup the code or document line by line. Especially the code snippet contains any key word that related to Azure Service. Put the Azure Service name as the component in the [Response JSON Format].
- Pay attention to the packages or lib in the begging of code file. It contains key and important infomation that related to Azure Service. Put the Azure Service name as the component in the [Response JSON Format].
- Programming language and runtime: Check the source code and README for the programming languages and runtime versions used in the project. This will help in determining the appropriate Azure services and runtime environments (e.g. Azure Functions, Web Apps, or Kubernetes) to deploy the application.
- Dependencies and libraries: Identify the external libraries and dependencies used in the project. You may find this information in package.json (for Node.js), requirements.txt (for Python), or similar files for other programming languages. This will help in setting up the appropriate Azure services and ensuring compatibility.
- Database requirements: Check the source code and README for any references to database systems used in the project, such as SQL or NoSQL databases. This information will help you select the appropriate Azure database services, like Azure SQL Database, Cosmos DB, or Azure Database for PostgreSQL.
- Scalability and performance requirements: Look for information about the expected load, performance, and scalability requirements of the application. This will help in choosing the right Azure services and configurations, such as VM sizes, autoscaling settings, and load balancing options.
- Authentication and authorization: Identify any authentication and authorization mechanisms used in the project, such as OAuth, JWT, or API keys. This information will help you to set up the appropriate Azure security services, like Azure Active Directory, Azure AD B2C, or API Management.
- Storage requirements: Check for any data storage requirements, such as file storage, blobs, or queues. This will help you choose the right Azure storage services, like Azure Blob Storage, Azure Files, or Azure Queue Storage.
- Networking and communication: Look for any networking and communication requirements, like VNETs, VPNs, or private endpoints. This will help you set up the appropriate Azure networking services, such as Azure Virtual Network, Azure VPN Gateway, or Azure Private Link.
- Monitoring and logging: Identify any monitoring and logging requirements or tools used in the project, such as application insights, log analytics, or custom logging. This will help you configure the appropriate Azure monitoring and logging services, like Azure Monitor, Log Analytics, or Application Insights.
[Guidance Rules]

[Code or Document]
${fileContent}
[Code or Document]

[Response Rules]
- **IMPORTANT: Ensure that answers are ONLY given in the [Response JSON Format].**
- For every item in the response json, set the proper value as you can. If you cannot, Just fill in "UNKNOW".
- DO NOT miss the "result" key
[Response Rules]

The response JSON only contain one key **result**, the value of result is **an array composed of multi json content showd as bellow**:
[Response JSON Format]
    "language": What is the programming language.
    "appType": What is the application type of given code. If you are not able to determine the app type, return "Unknow.
    "framework": What framework is used in the given code, such as Asp.Net, React, Vue etc.
    "explanation": Explain how you determine the app type, component, framework.
    "component": the value of "Component" is a list with mutli json that contains two keys
        "name": What component is used in the given code, such as database information, message system, cache, gateway, Azure function etc.
        "codeSnippet": the code snippet in "File Path" to infer this component.
[Response JSON Format]
`
  );
  chatMessage.push(userMessage);

  return chatMessage;
};
