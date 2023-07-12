/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */
import {
  Timeout,
  TemplateProject,
  TemplateProjectFolder,
  LocalDebugTaskLabel,
  LocalDebugTaskResult,
} from "../../utils/constants";
import { startDebugging, waitForTerminal } from "../../utils/vscodeOperation";
import { initPage, validateShareNow } from "../../utils/playwrightOperation";
import { Env } from "../../utils/env";
import { SampledebugContext } from "./sampledebugContext";
import { it } from "../../utils/it";
import { VSBrowser } from "vscode-extension-tester";
import { getScreenshotName } from "../../utils/nameUtil";
import { editDotEnvFile } from "../../utils/commonUtils";
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
      TemplateProject.ShareNow,
      TemplateProjectFolder.ShareNow
    );
    await sampledebugContext.before();
    // create sql db server
    rgName = `${sampledebugContext.appName}-dev-rg`;
    const sqlCommands = [
      `CREATE TABLE [TeamPostEntity](
          [PostID] [int] PRIMARY KEY IDENTITY,
          [ContentUrl] [nvarchar](400) NOT NULL,
          [CreatedByName] [nvarchar](50) NOT NULL,
          [CreatedDate] [datetime] NOT NULL,
          [Description] [nvarchar](500) NOT NULL,
          [IsRemoved] [bit] NOT NULL,
          [Tags] [nvarchar](100) NULL,
          [Title] [nvarchar](100) NOT NULL,
          [TotalVotes] [int] NOT NULL,
          [Type] [int] NOT NULL,
          [UpdatedDate] [datetime] NOT NULL,
          [UserID] [uniqueidentifier] NOT NULL
       );`,
      `CREATE TABLE [UserVoteEntity](
        [VoteID] [int] PRIMARY KEY IDENTITY,
        [PostID] [int] NOT NULL,
        [UserID] [uniqueidentifier] NOT NULL
      );`,
    ];
    azSqlHelper = new AzSqlHelper(rgName, sqlCommands);
  });

  afterEach(async function () {
    this.timeout(Timeout.finishAzureTestCase);
    await sampledebugContext.sampleAfter(rgName);
  });

  it(
    "[auto] local debug for Sample Share Now",
    {
      testPlanCaseId: 9958523,
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
      const page = await initPage(
        sampledebugContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      await validateShareNow(page);
      console.log("debug finish!");
    }
  );
});
