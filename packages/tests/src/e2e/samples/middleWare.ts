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
  [TemplateProjectFolder.TodoListSpfx]: todoListSpfxMiddleWare,
  [TemplateProjectFolder.MyFirstMetting]: commonMiddleWare,
  [TemplateProjectFolder.TodoListM365]: commonMiddleWare,
  [TemplateProjectFolder.NpmSearch]: commonMiddleWare,
  [TemplateProjectFolder.ProactiveMessaging]: proactiveMessagingMiddleWare,
  [TemplateProjectFolder.AdaptiveCard]: commonMiddleWare,
  [TemplateProjectFolder.IncomingWebhook]: commonMiddleWare,
  [TemplateProjectFolder.StockUpdate]: stockUpdateMiddleWare,
  [TemplateProjectFolder.QueryOrg]: commonMiddleWare,
  [TemplateProjectFolder.GraphConnector]: commonMiddleWare,
  [TemplateProjectFolder.OneProductivityHub]: commonMiddleWare,
  [TemplateProjectFolder.TodoListBackend]: todoListBackendMiddleWare,
  [TemplateProjectFolder.ShareNow]: shareNowMiddleWare,
  [TemplateProjectFolder.Dashboard]: commonMiddleWare,
  [TemplateProjectFolder.OutlookSignature]: outlookSignatureMiddleWare,
  [TemplateProjectFolder.OutlookTab]: commonMiddleWare,
  [TemplateProjectFolder.AssistDashboard]: assistDashboardMiddleWare,
  [TemplateProjectFolder.DiceRoller]: commonMiddleWare,
  [TemplateProjectFolder.ChefBot]: chefBotMiddleWare,
  [TemplateProjectFolder.Deeplinking]: commonMiddleWare,
};

async function proactiveMessagingMiddleWare(
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
      "samples"
    );
  }
}

async function outlookSignatureMiddleWare(
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
      "Samples"
    );
  }
  if (steps?.afterCreate) {
    expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;
  }
}

async function commonMiddleWare(
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
    expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;
  }
}

async function todoListSpfxMiddleWare(
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

async function shareNowMiddleWare(
  sampleName: TemplateProjectFolder,
  testFolder: string,
  appName: string,
  projectPath: string,
  steps?: { create?: boolean; afterCreate?: boolean; beforeProvision?: boolean }
) {
  if (steps?.create) {
    await Executor.openTemplateProject(appName, testFolder, sampleName);
  }
  if (steps?.afterCreate) {
    expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;
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

async function todoListBackendMiddleWare(
  sampleName: TemplateProjectFolder,
  testFolder: string,
  appName: string,
  projectPath: string,
  steps?: { create?: boolean; afterCreate?: boolean; beforeProvision?: boolean }
) {
  if (steps?.create) {
    await Executor.openTemplateProject(appName, testFolder, sampleName);
  }
  if (steps?.afterCreate) {
    expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;
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

async function stockUpdateMiddleWare(
  sampleName: TemplateProjectFolder,
  testFolder: string,
  appName: string,
  projectPath: string,
  steps?: { create?: boolean; afterCreate?: boolean; beforeProvision?: boolean }
) {
  if (steps?.create) {
    await Executor.openTemplateProject(appName, testFolder, sampleName);
  }
  if (steps?.afterCreate) {
    expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;

    const envFile = path.resolve(projectPath, "env", `.env.dev`);
    let ENDPOINT = fs.readFileSync(envFile, "utf-8");
    ENDPOINT +=
      "\nTEAMSFX_API_ALPHAVANTAGE_ENDPOINT=https://www.alphavantage.co";
    fs.writeFileSync(envFile, ENDPOINT);
    console.log(`add endpoint ${ENDPOINT} to .env.dev file`);
    const userFile = path.resolve(projectPath, "env", `.env.dev.user`);
    let KEY = fs.readFileSync(userFile, "utf-8");
    KEY += "\nTEAMSFX_API_ALPHAVANTAGE_API_KEY=demo";
    fs.writeFileSync(userFile, KEY);
    console.log(`add key ${KEY} to .env.dev.user file`);
  }
}

async function assistDashboardMiddleWare(
  sampleName: TemplateProjectFolder,
  testFolder: string,
  appName: string,
  projectPath: string,
  steps?: { create?: boolean; afterCreate?: boolean; beforeProvision?: boolean }
) {
  if (steps?.create) {
    await Executor.openTemplateProject(appName, testFolder, sampleName);
  }
  if (steps?.afterCreate) {
    expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;
    // remove teamsApp/extendToM365 in case it fails
    removeTeamsAppExtendToM365(path.join(projectPath, "teamsapp.yml"));

    const envFilePath = path.resolve(projectPath, "env", `.env.dev.user`);
    const envString =
      'PLANNER_GROUP_ID=YOUR_PLANNER_GROUP_ID\nDEVOPS_ORGANIZATION_NAME=msazure\nDEVOPS_PROJECT_NAME="Microsoft Teams Extensibility"\nGITHUB_REPO_NAME=test002\nGITHUB_REPO_OWNER=hellyzh\nPLANNER_PLAN_ID=YOUR_PLAN_ID\nPLANNER_BUCKET_ID=YOUR_BUCKET_ID\nSECRET_DEVOPS_ACCESS_TOKEN=YOUR_DEVOPS_ACCESS_TOKEN\nSECRET_GITHUB_ACCESS_TOKEN=YOUR_GITHUB_ACCESS_TOKEN';
    fs.writeFileSync(envFilePath, envString);
  }
}

async function chefBotMiddleWare(
  sampleName: TemplateProjectFolder,
  testFolder: string,
  appName: string,
  projectPath: string,
  steps?: { create?: boolean; afterCreate?: boolean; beforeProvision?: boolean }
) {
  if (steps?.create) {
    await Executor.openTemplateProject(appName, testFolder, sampleName);
  }
  if (steps?.afterCreate) {
    expect(fs.pathExistsSync(path.resolve(projectPath, "infra"))).to.be.true;

    const userFile = path.resolve(projectPath, "env", `.env.dev.user`);
    const KEY = "SECRET_OPENAI_API_KEY=MY_OPENAI_API_KEY";
    fs.writeFileSync(userFile, KEY);
    console.log(`add key ${KEY} to .env.dev.user file`);
  }
}
