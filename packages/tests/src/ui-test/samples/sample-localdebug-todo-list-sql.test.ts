// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject, LocalDebugTaskLabel } from "../../utils/constants";
import {
  initTeamsPage,
  validateTodoList,
} from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { AzSqlHelper } from "../../utils/azureCliHelper";
import { SampledebugContext } from "./sampledebugContext";
import { expect } from "chai";
import * as path from "path";
import { editDotEnvFile } from "../../utils/commonUtils";
import { Env } from "../../utils/env";

class TodoListBackendTestCase extends CaseFactory {
  public override async onBefore(
    sampledebugContext: SampledebugContext,
    env: "local" | "dev",
    azSqlHelper?: AzSqlHelper | undefined
  ): Promise<AzSqlHelper | undefined> {
    // create sql db server
    const rgName = `${sampledebugContext.appName}-dev-rg`;
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
    return azSqlHelper;
  }
  override async onAfter(
    sampledebugContext: SampledebugContext
  ): Promise<void> {
    await sampledebugContext.sampleAfter(
      `${sampledebugContext.appName}-dev-rg}`
    );
  }
  public override async onAfterCreate(
    sampledebugContext: SampledebugContext,
    env: "local" | "dev",
    azSqlHelper?: AzSqlHelper | undefined
  ): Promise<void> {
    const envFilePath = path.resolve(
      sampledebugContext.projectPath,
      "env",
      `.env.${env}.user`
    );
    const res = await azSqlHelper?.createSql();
    expect(res).to.be.true;
    editDotEnvFile(envFilePath, "SQL_USER_NAME", azSqlHelper?.sqlAdmin ?? "");
    editDotEnvFile(envFilePath, "SQL_PASSWORD", azSqlHelper?.sqlPassword ?? "");
    editDotEnvFile(envFilePath, "SQL_ENDPOINT", azSqlHelper?.sqlEndpoint ?? "");
    editDotEnvFile(
      envFilePath,
      "SQL_DATABASE_NAME",
      azSqlHelper?.sqlDatabaseName ?? ""
    );
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
  9958511,
  "v-ivanchen@microsoft.com",
  "local",
  [LocalDebugTaskLabel.StartFrontend, LocalDebugTaskLabel.StartBackend],
  {
    teamsAppName: "toDoList-local",
    skipValidation: true,
  }
).test();
