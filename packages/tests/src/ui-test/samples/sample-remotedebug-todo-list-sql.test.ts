// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject } from "../../utils/constants";
import {
  initTeamsPage,
  validateTodoList,
} from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { AzSqlHelper } from "../../utils/azureCliHelper";
import { SampledebugContext } from "./sampledebugContext";
import * as uuid from "uuid";
import * as fs from "fs";
import * as path from "path";
import { editDotEnvFile } from "../../utils/commonUtils";
import { Env } from "../../utils/env";

class TodoListBackendTestCase extends CaseFactory {
  public override async onAfterCreate(
    sampledebugContext: SampledebugContext,
    env: "local" | "dev",
    azSqlHelper?: AzSqlHelper | undefined
  ): Promise<void> {
    const sqlUserName = "Abc123321";
    const sqlPassword = "Cab232332" + uuid.v4().substring(0, 6);
    const envFilePath = path.resolve(
      sampledebugContext.projectPath,
      "env",
      `.env.dev.user`
    );

    editDotEnvFile(envFilePath, "SQL_USER_NAME", sqlUserName);
    editDotEnvFile(envFilePath, "SQL_PASSWORD", sqlPassword);
    this.sqlUserName = sqlUserName;
    this.sqlPassword = sqlPassword;
  }
  public override async onBeforeBrowerStart(
    sampledebugContext: SampledebugContext
  ): Promise<void> {
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
      this.sqlUserName,
      this.sqlPassword
    );
    await sqlHelper.createTable(sqlEndpoint ?? "");
  }
  public override async onInitPage(
    sampledebugContext: SampledebugContext,
    teamsAppId: string,
    options?: {
      teamsAppName: string;
    }
  ): Promise<Page> {
    return await initTeamsPage(
      sampledebugContext.context!,
      teamsAppId,
      Env.username,
      Env.password,
      {
        teamsAppName: options?.teamsAppName,
      }
    );
  }
  override async onValidate(page: Page): Promise<void> {
    return await validateTodoList(page);
  }
}

new TodoListBackendTestCase(
  TemplateProject.TodoListBackend,
  14571882,
  "v-ivanchen@microsoft.com",
  "dev",
  [],
  { teamsAppName: "toDoList-dev", skipValidation: true }
).test();
