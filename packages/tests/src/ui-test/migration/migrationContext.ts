// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import path from "path";
import * as fs from "fs-extra";
import { openExistingProject } from "../../utils/vscodeOperation";
import {
  Capability,
  Trigger,
  Framework,
  TestFilePath,
} from "../../utils/constants";
import { TestContext } from "../testContext";
import { CliHelper } from "../cliHelper";
import { stopDebugging } from "../../utils/vscodeOperation";
import { Env } from "../../utils/env";
import { dotenvUtil } from "../../utils/envUtil";
import {
  cleanAppStudio,
  cleanTeamsApp,
  GraphApiCleanHelper,
} from "../../utils/cleanHelper";
import { isV3Enabled } from "@microsoft/teamsfx-core";
import { AzSqlHelper } from "../../utils/azureCliHelper";

export class MigrationTestContext extends TestContext {
  public testName: Capability;
  public lang: "javascript" | "typescript" = "javascript";
  public projectPath: string;
  public trigger?: Trigger;
  public framework?: Framework;
  public rgName: string;

  constructor(
    testName: Capability,
    lang: "javascript" | "typescript" = "javascript",
    trigger?: Trigger,
    framework?: Framework
  ) {
    super(testName);
    this.testName = testName;
    this.lang = lang;
    this.trigger = trigger;
    this.framework = framework;
    this.projectPath = path.resolve(this.testRootFolder, this.appName);
    this.rgName = `${this.appName}-dev-rg`;
  }

  public async openTemplateFolder(templateName: string): Promise<void> {
    console.log("start to open template: ", templateName);
    // copy from template
    const templateRootPath = path.resolve(
      "src",
      "ui-test",
      "migration",
      "templates"
    );
    const templatePath = path.resolve(templateRootPath, templateName);
    const projectPath = path.resolve(this.testRootFolder, this.appName);
    await fs.mkdir(projectPath);
    try {
      await fs.copy(templatePath, projectPath);
      await openExistingProject(projectPath);
      console.log("create complate !!!", this.appName, " path: ", projectPath);
    } catch (error) {
      throw new Error(`copy template failed: ${error}`);
    }
  }

  public async createProjectCLI(V3: boolean): Promise<string> {
    if (V3) {
      process.env["TEAMSFX_V3"] = "true";
    } else {
      process.env["TEAMSFX_V3"] = "false";
    }
    if (this.trigger) {
      await CliHelper.createProjectWithCapability(
        this.appName,
        this.testRootFolder,
        this.testName,
        this.lang,
        `--bot-host-type-trigger ${this.trigger}`
      );
    } else if (this.framework) {
      await CliHelper.createProjectWithCapability(
        this.appName,
        this.testRootFolder,
        this.testName,
        this.lang,
        `--spfx-framework-type ${this.framework}`
      );
    } else {
      await CliHelper.createProjectWithCapability(
        this.appName,
        this.testRootFolder,
        this.testName,
        this.lang
      );
    }
    const projectPath = path.resolve(this.testRootFolder, this.appName);
    await openExistingProject(projectPath);
    return projectPath;
  }

  public async disableDebugConsole(): Promise<void> {
    const filePath = path.resolve(
      this.testRootFolder,
      this.appName,
      ".vscode/launch.json"
    );
    const content = await fs.readJson(filePath);
    const configs = content.configurations as any[];
    for (const config of configs) {
      config.internalConsoleOptions = "neverOpen";
    }
    await fs.writeJson(filePath, content);
  }

  public async after(
    hasAadPlugin = true,
    hasBotPlugin = false,
    envName = "dev"
  ) {
    await stopDebugging();
    await this.context!.close();
    await this.browser!.close();
    if (envName != "local") {
      await AzSqlHelper.deleteResourceGroup(this.rgName);
    }
    await this.cleanResource(hasAadPlugin, hasBotPlugin);
  }

  public async getTeamsAppId(env: "local" | "dev" = "local"): Promise<string> {
    if (isV3Enabled()) {
      const userDataFile = path.join(
        TestFilePath.configurationFolder,
        `.env.${env}`
      );
      const configFilePath = path.resolve(this.projectPath, userDataFile);
      const context = dotenvUtil.deserialize(
        await fs.readFile(configFilePath, { encoding: "utf8" })
      );
      const result = context.obj.TEAMS_APP_ID as string;
      console.log(`TEAMS APP ID: ${result}`);
      return result;
    } else {
      const userDataFile = path.join(".fx", "states", `state.${env}.json`);
      const configFilePath = path.resolve(
        this.testRootFolder,
        this.appName,
        userDataFile
      );
      const context = await fs.readJSON(configFilePath);
      const result = context["fx-resource-appstudio"]["teamsAppId"] as string;
      console.log(`fx-resource-appstudio.teamsAppId: ${result}`);
      return result;
    }
  }

  public async getAadObjectId(): Promise<string> {
    const userDataFile = path.join(
      TestFilePath.configurationFolder,
      `.env.local`
    );
    const configFilePath = path.resolve(
      this.testRootFolder,
      this.appName,
      userDataFile
    );
    const context = dotenvUtil.deserialize(
      await fs.readFile(configFilePath, { encoding: "utf8" })
    );
    const result = context.obj.AAD_APP_OBJECT_ID as string;
    console.log(`TEAMS APP OBJECT ID: ${result}`);
    return result;
  }

  public async addFeatureV2(feature: string): Promise<void> {
    await CliHelper.addFeature(feature, this.projectPath);
  }

  public async getBotAppId(): Promise<string> {
    const userDataFile = path.join(
      TestFilePath.configurationFolder,
      `.env.local`
    );
    const configFilePath = path.resolve(
      this.testRootFolder,
      this.appName,
      userDataFile
    );
    const context = dotenvUtil.deserialize(
      await fs.readFile(configFilePath, { encoding: "utf8" })
    );
    const result = context.obj.BOT_ID as string;
    console.log(`TEAMS BOT ID: ${result}`);
    return result;
  }

  public async provisionWithCLI(
    env: "local" | "dev",
    v3: boolean,
    environment?: NodeJS.ProcessEnv
  ): Promise<void> {
    if (v3) {
      process.env["AZURE_RESOURCE_GROUP_NAME"] = this.rgName;
      await AzSqlHelper.login();
      const azhelper = new AzSqlHelper(this.rgName, []);
      await azhelper.createResourceGroup();
    }
    await CliHelper.provisionProject(this.projectPath, env, v3, environment);
  }

  public async deployWithCLI(env: "local" | "dev"): Promise<void> {
    await CliHelper.deploy(this.projectPath, env);
  }

  public async publish(env: "local" | "dev"): Promise<void> {
    await CliHelper.publishProject(this.projectPath, env);
  }

  public async debugWithCLI(env: "local" | "dev"): Promise<void> {
    await CliHelper.debugProject(this.projectPath, env);
  }

  public async cleanResource(
    hasAadPlugin = true,
    hasBotPlugin = false
  ): Promise<void> {
    try {
      const cleanService = await GraphApiCleanHelper.create(
        Env.cleanTenantId,
        Env.cleanClientId,
        Env.username,
        Env.password
      );
      if (hasAadPlugin) {
        const aadObjectId = await this.getAadObjectId();
        console.log(`delete AAD ${aadObjectId}`);
        await cleanService.deleteAad(aadObjectId);
      }

      if (hasBotPlugin) {
        const botAppId = await this.getBotAppId();
        const botObjectId = await cleanService.getAadObjectId(botAppId);
        if (botObjectId) {
          console.log(`delete Bot AAD ${botObjectId}`);
          await cleanService.deleteAad(botObjectId);
        }
      }
    } catch (e: any) {
      console.log(`Failed to clean resource, error message: ${e.message}`);
    }
    await cleanTeamsApp(this.appName);
    await cleanAppStudio(this.appName);
  }
}
