// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  Timeout,
  TemplateProject,
  TemplateProjectFolder,
  LocalDebugTaskLabel,
  LocalDebugTaskResult,
} from "../../utils/constants";
import { startDebugging, waitForTerminal } from "../../utils/vscodeOperation";
import {
  initTeamsPage,
  validateTodoList,
} from "../../utils/playwrightOperation";
import { VSBrowser } from "vscode-extension-tester";
import { Env } from "../../utils/env";
import { SampledebugContext } from "./sampledebugContext";
import { it } from "../../utils/it";
import { editDotEnvFile } from "../../utils/commonUtils";
import { getScreenshotName } from "../../utils/nameUtil";
import { AzSqlHelper } from "../../utils/azureCliHelper";
import path from "path";
import { expect } from "chai";

describe("Sample Tests", function () {
  this.timeout(Timeout.testAzureCase);
  let sampledebugContext: SampledebugContext;
  let azSqlHelper: AzSqlHelper;
  let rgName: string;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    sampledebugContext = new SampledebugContext(
      TemplateProject.TodoListBackend,
      TemplateProjectFolder.TodoListBackend
    );
    await sampledebugContext.before();
    // create sql db server
    rgName = `${sampledebugContext.appName}-dev-rg`;
    const sqlCommands = [
      `CREATE TABLE Todo
        (
            id INT IDENTITY PRIMARY KEY,
            description NVARCHAR(128) NOT NULL,
            objectId NVARCHAR(36),
            channelOrChatId NVARCHAR(128),
            isCompleted TinyInt NOT NULL default 0,
        )`,
    ];
    azSqlHelper = new AzSqlHelper(rgName, sqlCommands);
  });

  afterEach(async function () {
    this.timeout(Timeout.finishAzureTestCase);
    await sampledebugContext.sampleAfter(rgName);
  });

  it(
    "[auto] local debug for Sample todo list sql",
    {
      testPlanCaseId: 9958511,
      author: "v-ivanchen@microsoft.com",
    },
    async function () {
      // create project
      await sampledebugContext.openResourceFolder();
      // await sampledebugContext.createTemplate();

      const res = await azSqlHelper.createSql();
      expect(res).to.be.true;
      const envFilePath = path.resolve(
        sampledebugContext.projectPath,
        "env",
        ".env.local.user"
      );
      editDotEnvFile(envFilePath, "SQL_USER_NAME", azSqlHelper.sqlAdmin);
      editDotEnvFile(envFilePath, "SQL_PASSWORD", azSqlHelper.sqlPassword);
      editDotEnvFile(envFilePath, "SQL_ENDPOINT", azSqlHelper.sqlEndpoint);
      editDotEnvFile(
        envFilePath,
        "SQL_DATABASE_NAME",
        azSqlHelper.sqlDatabaseName
      );

      try {
        // local debug
        await startDebugging();

        console.log("wait frontend start");
        await waitForTerminal(
          LocalDebugTaskLabel.StartFrontend,
          LocalDebugTaskResult.FrontendSuccess
        );

        console.log("wait backend start");
        await waitForTerminal(
          LocalDebugTaskLabel.StartBackend,
          LocalDebugTaskResult.BotAppSuccess
        );
      } catch (error) {
        await VSBrowser.instance.takeScreenshot(getScreenshotName("debug"));
        console.log("[Skip Error]: ", error);
        await VSBrowser.instance.driver.sleep(Timeout.playwrightDefaultTimeout);
      }

      const teamsAppId = await sampledebugContext.getTeamsAppId("local");
      console.log(teamsAppId);
      const page = await initTeamsPage(
        sampledebugContext.context!,
        teamsAppId,
        Env.username,
        Env.password,
        "toDoList-local"
      );
      // await validateTodoList(page, Env.displayName);
      console.log("debug finish!");
    }
  );
});
