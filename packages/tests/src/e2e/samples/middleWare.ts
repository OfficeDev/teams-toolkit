// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { TemplateProjectFolder } from "../../utils/constants";
import { Executor } from "../../utils/executor";
import { expect } from "chai";
import fs from "fs-extra";
import path from "path";
import { removeTeamsAppExtendToM365, editDotEnvFile } from "../commonUtils";
import { getUuid } from "../../commonlib/utilities";

export const middleWareMap: Record<
  TemplateProjectFolder,
  (
    sampleName: TemplateProjectFolder,
    testFolder: string,
    appName: string,
    projectPath: string,
    steps?: {
      create?: boolean;
      afterCreate?: boolean;
      beforeProvision?: boolean;
    }
  ) => Promise<void>
> = {
  [TemplateProjectFolder.HelloWorldTabBackEnd]: commonMiddleWare,
  [TemplateProjectFolder.ContactExporter]: commonMiddleWare,
  [TemplateProjectFolder.HelloWorldBotSSO]: commonMiddleWare,
  [TemplateProjectFolder.TodoListSpfx]: TodoListSpfxMiddleWare,
  [TemplateProjectFolder.MyFirstMetting]: commonMiddleWare,
  [TemplateProjectFolder.TodoListM365]: commonMiddleWare,
  [TemplateProjectFolder.NpmSearch]: commonMiddleWare,
  [TemplateProjectFolder.ProactiveMessaging]: proactiveMessagingMiddleWare,
  [TemplateProjectFolder.AdaptiveCard]: commonMiddleWare,
  [TemplateProjectFolder.IncomingWebhook]: commonMiddleWare,
  [TemplateProjectFolder.StockUpdate]: commonMiddleWare,
  [TemplateProjectFolder.QueryOrg]: commonMiddleWare,
  [TemplateProjectFolder.GraphConnector]: commonMiddleWare,
  [TemplateProjectFolder.OneProductivityHub]: commonMiddleWare,
  [TemplateProjectFolder.TodoListBackend]: TodoListBackendMiddleWare,
  [TemplateProjectFolder.ShareNow]: shareNowMiddleWare,
  [TemplateProjectFolder.Dashboard]: commonMiddleWare,
  [TemplateProjectFolder.OutlookSignature]: outlookSignatureMiddleWare,
  [TemplateProjectFolder.OutlookTab]: commonMiddleWare,
  [TemplateProjectFolder.AssistDashboard]: assistantDashboardMiddleWare,
  [TemplateProjectFolder.DiceRoller]: commonMiddleWare,
  [TemplateProjectFolder.ChefBot]: commonMiddleWare,
  [TemplateProjectFolder.Deeplinking]: commonMiddleWare,
};

async function proactiveMessagingMiddleWare(
  sampleName: TemplateProjectFolder,
  testFolder: string,
  appName: string,
  projectPath: string,
  steps?: { create?: boolean; afterCreate?: boolean }
) {
  if (steps?.create) {
    await Executor.openTemplateProject(
      appName,
      testFolder,
      sampleName,
      undefined,
      "samples"
    );
  }
  if (steps?.afterCreate) {
    expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;
  }
}

async function outlookSignatureMiddleWare(
  sampleName: TemplateProjectFolder,
  testFolder: string,
  appName: string,
  projectPath: string,
  steps?: { create?: boolean }
) {
  if (steps?.create) {
    await Executor.openTemplateProject(
      appName,
      testFolder,
      sampleName,
      undefined,
      "Samples"
    );
  }
}

async function commonMiddleWare(
  sampleName: TemplateProjectFolder,
  testFolder: string,
  appName: string,
  projectPath: string,
  steps?: { create?: boolean }
) {
  if (steps?.create) {
    await Executor.openTemplateProject(appName, testFolder, sampleName);
  }
}

async function TodoListSpfxMiddleWare(
  sampleName: TemplateProjectFolder,
  testFolder: string,
  appName: string,
  projectPath: string,
  steps?: { create?: boolean; afterCreate?: boolean }
) {
  if (steps?.create) {
    await Executor.openTemplateProject(appName, testFolder, sampleName);
  }
  if (steps?.afterCreate) {
    expect(fs.pathExistsSync(path.resolve(projectPath, "src", "src"))).to.be
      .true;
  }
}

async function assistantDashboardMiddleWare(
  sampleName: TemplateProjectFolder,
  testFolder: string,
  appName: string,
  projectPath: string,
  steps?: { create?: boolean; afterCreate?: boolean }
) {
  if (steps?.create) {
    await Executor.openTemplateProject(appName, testFolder, sampleName);
  }
  if (steps?.afterCreate) {
    // remove teamsApp/extendToM365 in case it fails
    removeTeamsAppExtendToM365(path.join(projectPath, "teamsapp.yml"));
  }
}

async function shareNowMiddleWare(
  sampleName: TemplateProjectFolder,
  testFolder: string,
  appName: string,
  projectPath: string,
  steps?: { create?: boolean; beforeProvision?: boolean }
) {
  if (steps?.create) {
    await Executor.openTemplateProject(appName, testFolder, sampleName);
  }
  if (steps?.beforeProvision) {
    const envFilePath = path.resolve(projectPath, "env", ".env.dev.user");
    editDotEnvFile(envFilePath, "SQL_USER_NAME", "Abc123321");
    editDotEnvFile(
      envFilePath,
      "SQL_PASSWORD",
      "Cab232332" + getUuid().substring(0, 6)
    );
  }
}

async function TodoListBackendMiddleWare(
  sampleName: TemplateProjectFolder,
  testFolder: string,
  appName: string,
  projectPath: string,
  steps?: { create?: boolean; beforeProvision?: boolean }
) {
  if (steps?.create) {
    await Executor.openTemplateProject(appName, testFolder, sampleName);
  }
  if (steps?.beforeProvision) {
    const envFilePath = path.resolve(projectPath, "env", ".env.dev.user");
    editDotEnvFile(envFilePath, "SQL_USER_NAME", "Abc123321");
    editDotEnvFile(
      envFilePath,
      "SQL_PASSWORD",
      "Cab232332" + getUuid().substring(0, 6)
    );
  }
}
