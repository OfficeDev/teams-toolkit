/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */
import {
  Timeout,
  TemplateProject,
  TemplateProjectFolder,
} from "../../constants";
import { runProvision, runDeploy } from "../remotedebug/remotedebugContext";
import { initPage, validateShareNow } from "../../playwrightOperation";
import { Env } from "../../utils/env";
import { SampledebugContext } from "./sampledebugContext";
import { it } from "../../utils/it";
import { editDotEnvFile } from "../../utils/commonUtils";
import { AzSqlHelper } from "../../utils/azureCliHelper";
import path from "path";
import * as uuid from "uuid";
import fs from "fs-extra";

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
  });

  afterEach(async function () {
    this.timeout(Timeout.finishAzureTestCase);
    await sampledebugContext.sampleAfter(
      `${sampledebugContext.appName}-dev-rg`
    );
  });

  it(
    "[auto] local debug for Sample Share Now",
    {
      testPlanCaseId: 24121485,
      author: "v-ivanchen@microsoft.com",
    },
    async function () {
      // create project
      await sampledebugContext.openResourceFolder();
      // await sampledebugContext.createTemplate();

      // Provision
      const envFilePath = path.resolve(
        sampledebugContext.projectPath,
        "env",
        ".env.dev.user"
      );
      const sqlUserName = "Abc123321";
      const sqlPassword = "Cab232332" + uuid.v4().substring(0, 6);
      editDotEnvFile(envFilePath, "SQL_USER_NAME", sqlUserName);
      editDotEnvFile(envFilePath, "SQL_PASSWORD", sqlPassword);
      await runProvision(sampledebugContext.appName);

      // Deploy
      await runDeploy();

      const devEnvFilePath = path.resolve(
        sampledebugContext.projectPath,
        "env",
        ".env.dev"
      );
      // read database from devEnvFilePath
      const sqlDatabaseName = fs
        .readFileSync(devEnvFilePath, "utf-8")
        .split("\n")
        .find((line) =>
          line.startsWith("PROVISIONOUTPUT__AZURESQLOUTPUT__DATABASENAME")
        )
        ?.split("=")[1];
      const sqlEndpoint = fs
        .readFileSync(devEnvFilePath, "utf-8")
        .split("\n")
        .find((line) =>
          line.startsWith("PROVISIONOUTPUT__AZURESQLOUTPUT__SQLENDPOINT")
        )
        ?.split("=")[1];

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
      const sqlHelper = new AzSqlHelper(
        `${sampledebugContext.appName}-dev-rg`,
        sqlCommands,
        sqlDatabaseName,
        sqlDatabaseName,
        sqlUserName,
        sqlPassword
      );
      await sqlHelper.createTable(sqlEndpoint as string);

      const teamsAppId = await sampledebugContext.getTeamsAppId("dev");
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
