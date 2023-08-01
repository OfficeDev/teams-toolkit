// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  Timeout,
  TemplateProject,
  TemplateProjectFolder,
} from "../../utils/constants";
import { runProvision, runDeploy } from "../remotedebug/remotedebugContext";
import {
  initTeamsPage,
  validateTodoList,
} from "../../utils/playwrightOperation";
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
      TemplateProject.TodoListBackend,
      TemplateProjectFolder.TodoListBackend
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
    "[auto] remote debug for Sample todo list sql",
    {
      testPlanCaseId: 14571882,
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

      // read database from devEnvFilePath
      const devEnvFilePath = path.resolve(
        sampledebugContext.projectPath,
        "env",
        ".env.dev"
      );
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
        `CREATE TABLE Todo
        (
            id INT IDENTITY PRIMARY KEY,
            description NVARCHAR(128) NOT NULL,
            objectId NVARCHAR(36),
            channelOrChatId NVARCHAR(128),
            isCompleted TinyInt NOT NULL default 0,
        )`,
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
      const page = await initTeamsPage(
        sampledebugContext.context!,
        teamsAppId,
        Env.username,
        Env.password,
        "toDoList-dev"
      );
      // await validateTodoList(page, Env.displayName);
      console.log("debug finish!");
    }
  );
});
