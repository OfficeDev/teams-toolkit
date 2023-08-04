// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { Page } from "playwright";
import { TemplateProject, LocalDebugTaskLabel } from "../../utils/constants";
import { validateShareNow } from "../../utils/playwrightOperation";
import { CaseFactory } from "./sampleCaseFactory";
import { AzSqlHelper } from "../../utils/azureCliHelper";
import { SampledebugContext } from "./sampledebugContext";
import * as uuid from "uuid";
import * as fs from "fs";
import * as path from "path";
import { editDotEnvFile } from "../../utils/commonUtils";

class ShareNowTestCase extends CaseFactory {
  public sqlUserName: string;
  public sqlPassword: string;
  constructor(
    sampleName: TemplateProject,
    testPlanCaseId: number,
    author: string,
    env: "local" | "dev",
    validate: LocalDebugTaskLabel[] = [],
    options: {
      teamsAppName?: string;
      dashboardFlag?: boolean;
      type?: string;
      testRootFolder?: string;
      includeFunction?: boolean;
      npmName?: string;
      skipInit?: boolean;
      skipValidation?: boolean;
    } = {}
  ) {
    super(sampleName, testPlanCaseId, author, env, validate, options);
    this.sqlUserName = "Abc123321";
    this.sqlPassword = "Cab232332" + uuid.v4().substring(0, 6);
  }
  public override onAfterCreate = async (
    sampledebugContext: SampledebugContext
  ): Promise<void> => {
    const envFilePath = path.resolve(
      sampledebugContext.projectPath,
      "env",
      ".env.dev.user"
    );
    const user = this.sqlUserName;
    const password = this.sqlPassword;
    editDotEnvFile(envFilePath, "SQL_USER_NAME", user);
    editDotEnvFile(envFilePath, "SQL_PASSWORD", password);
  };
  public override onBeforeBrowerStart = async (
    sampledebugContext: SampledebugContext
  ): Promise<void> => {
    const user = this.sqlUserName;
    const password = this.sqlPassword;
    const devEnvFilePath = path.resolve(
      sampledebugContext.projectPath,
      "env",
      ".env.dev"
    );
    // read database from devEnvFilePath
    const sqlDatabaseNameLine = fs
      .readFileSync(devEnvFilePath, "utf-8")
      .split("\n")
      .find((line: string) =>
        line.startsWith("PROVISIONOUTPUT__AZURESQLOUTPUT__DATABASENAME")
      );

    const sqlDatabaseName = sqlDatabaseNameLine
      ? sqlDatabaseNameLine.split("=")[1]
      : undefined;

    const sqlEndpointLine = fs
      .readFileSync(devEnvFilePath, "utf-8")
      .split("\n")
      .find((line: string) =>
        line.startsWith("PROVISIONOUTPUT__AZURESQLOUTPUT__SQLENDPOINT")
      );

    const sqlEndpoint = sqlEndpointLine
      ? sqlEndpointLine.split("=")[1]
      : undefined;

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
      user,
      password
    );
    await sqlHelper.createTable(sqlEndpoint ?? "");
  };
  override async onValidate(page: Page): Promise<void> {
    return await validateShareNow(page);
  }
}

new ShareNowTestCase(
  TemplateProject.ShareNow,
  24121485,
  "v-ivanchen@microsoft.com",
  "dev",
  [],
  { skipValidation: true }
).test();
