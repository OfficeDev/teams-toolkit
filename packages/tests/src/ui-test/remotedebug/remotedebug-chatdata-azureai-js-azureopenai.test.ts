// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */
import * as path from "path";
import { VSBrowser } from "vscode-extension-tester";
import { Timeout, ValidationContent } from "../../utils/constants";
import {
  RemoteDebugTestContext,
  provisionProject,
  deployProject,
} from "./remotedebugContext";
import {
  execCommandIfExist,
  createNewProject,
} from "../../utils/vscodeOperation";
import {
  initPage,
  validateWelcomeAndReplyBot,
} from "../../utils/playwrightOperation";
import { Env, OpenAiKey } from "../../utils/env";
import { it } from "../../utils/it";
import { editDotEnvFile, validateFileExist } from "../../utils/commonUtils";
import { AzSearchHelper } from "../../utils/azureCliHelper";
import { Executor } from "../../utils/executor";

describe("Remote debug Tests", function () {
  this.timeout(Timeout.testAzureCase);
  let remoteDebugTestContext: RemoteDebugTestContext;
  let testRootFolder: string;
  let appName: string;
  const appNameCopySuffix = "copy";
  let newAppFolderName: string;
  let projectPath: string;
  let azSearchHelper: AzSearchHelper;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    remoteDebugTestContext = new RemoteDebugTestContext("chatdata");
    testRootFolder = remoteDebugTestContext.testRootFolder;
    appName = remoteDebugTestContext.appName;
    newAppFolderName = appName + appNameCopySuffix;
    projectPath = path.resolve(testRootFolder, newAppFolderName);
    await remoteDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishAzureTestCase);
    await remoteDebugTestContext.after();

    //Close the folder and cleanup local sample project
    await execCommandIfExist("Workspaces: Close Workspace", Timeout.webView);
    console.log(`[Successfully] start to clean up for ${projectPath}`);
    await remoteDebugTestContext.cleanUp(
      appName,
      projectPath,
      false,
      true,
      false
    );
  });

  it(
    "[auto][JS][Azure OpenAI] Remote debug for basic rag bot using azure ai search data",
    {
      testPlanCaseId: 27569119,
      author: "v-ivanchen@microsoft.com",
    },
    async function () {
      const driver = VSBrowser.instance.driver;
      await createNewProject("chatdata", appName, {
        aiType: "Azure OpenAI",
        dataOption: "Azure AI Search",
      });
      validateFileExist(projectPath, "src/index.js");
      const envPath = path.resolve(projectPath, "env", ".env.dev.user");

      const isRealKey = OpenAiKey.azureOpenAiKey ? true : false;
      // create azure search
      if (isRealKey) {
        const rgName = `${remoteDebugTestContext.appName}-dev-rg`;

        azSearchHelper = new AzSearchHelper(rgName);
        await azSearchHelper.createSearch();
      }
      const azureOpenAiKey = OpenAiKey.azureOpenAiKey
        ? OpenAiKey.azureOpenAiKey
        : "fake";
      const azureOpenAiEndpoint = OpenAiKey.azureOpenAiEndpoint
        ? OpenAiKey.azureOpenAiEndpoint
        : "https://test.com";
      const azureOpenAiModelDeploymentName =
        OpenAiKey.azureOpenAiModelDeploymentName
          ? OpenAiKey.azureOpenAiModelDeploymentName
          : "fake";
      editDotEnvFile(envPath, "SECRET_AZURE_OPENAI_API_KEY", azureOpenAiKey);
      editDotEnvFile(envPath, "AZURE_OPENAI_ENDPOINT", azureOpenAiEndpoint);
      editDotEnvFile(
        envPath,
        "AZURE_OPENAI_DEPLOYMENT_NAME",
        azureOpenAiModelDeploymentName
      );
      const embeddingDeploymentName =
        OpenAiKey.azureOpenAiEmbeddingDeploymentName ?? "fake";
      editDotEnvFile(
        envPath,
        "AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME",
        embeddingDeploymentName
      );
      const searchKey = isRealKey ? azSearchHelper.apiKey : "fake";
      const searchEndpoint = isRealKey
        ? azSearchHelper.endpoint
        : "https://test.com";
      editDotEnvFile(envPath, "SECRET_AZURE_SEARCH_KEY", searchKey);
      editDotEnvFile(envPath, "AZURE_SEARCH_ENDPOINT", searchEndpoint);
      console.log(`
        SECRET_AZURE_OPENAI_API_KEY=${azureOpenAiKey}
        AZURE_OPENAI_ENDPOINT=${azureOpenAiEndpoint}
        AZURE_OPENAI_DEPLOYMENT_NAME=${azureOpenAiModelDeploymentName}
        AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME=${embeddingDeploymentName}
        SECRET_AZURE_SEARCH_KEY=${searchKey}
        AZURE_SEARCH_ENDPOINT=${searchEndpoint}
      `);

      // prepare for the npm run indexer:create
      const testToolEnvPath = path.resolve(
        projectPath,
        "env",
        ".env.testtool.user"
      );
      editDotEnvFile(
        testToolEnvPath,
        "SECRET_AZURE_OPENAI_API_KEY",
        azureOpenAiKey
      );
      editDotEnvFile(
        testToolEnvPath,
        "AZURE_OPENAI_ENDPOINT",
        azureOpenAiEndpoint
      );
      editDotEnvFile(
        testToolEnvPath,
        "AZURE_OPENAI_DEPLOYMENT_NAME",
        azureOpenAiModelDeploymentName
      );
      editDotEnvFile(
        testToolEnvPath,
        "AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME",
        embeddingDeploymentName
      );
      editDotEnvFile(testToolEnvPath, "SECRET_AZURE_SEARCH_KEY", searchKey);
      editDotEnvFile(testToolEnvPath, "AZURE_SEARCH_ENDPOINT", searchEndpoint);

      // create azure search data
      if (isRealKey) {
        console.log("Start to create azure search data");
        const installCmd = `npm install`;
        const { success } = await Executor.execute(
          installCmd,
          projectPath,
          process.env,
          undefined,
          "npm warn"
        );
        if (!success) {
          throw new Error("Failed to install packages");
        }

        const insertDataCmd = `npm run indexer:create -- ${searchKey} ${azureOpenAiKey}`;
        const { success: insertDataSuccess } = await Executor.execute(
          insertDataCmd,
          projectPath
        );
        if (!insertDataSuccess) {
          throw new Error("Failed to insert data");
        }
      }

      await provisionProject(appName, projectPath);
      await deployProject(projectPath, Timeout.botDeploy);
      const teamsAppId = await remoteDebugTestContext.getTeamsAppId(
        projectPath
      );
      const page = await initPage(
        remoteDebugTestContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      await driver.sleep(Timeout.longTimeWait);
      if (isRealKey) {
        await validateWelcomeAndReplyBot(page, {
          hasWelcomeMessage: false,
          hasCommandReplyValidation: true,
          botCommand: "Tell me about Contoso Electronics history",
          expectedWelcomeMessage: ValidationContent.AiChatBotWelcomeInstruction,
          expectedReplyMessage: "1985",
          timeout: Timeout.longTimeWait,
        });
      } else {
        await validateWelcomeAndReplyBot(page, {
          hasWelcomeMessage: false,
          hasCommandReplyValidation: true,
          botCommand: "helloWorld",
          expectedWelcomeMessage: ValidationContent.AiChatBotWelcomeInstruction,
          expectedReplyMessage: ValidationContent.AiBotErrorMessage,
          timeout: Timeout.longTimeWait,
        });
      }
    }
  );
});
