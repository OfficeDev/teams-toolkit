// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import { openExistingProject } from "../../utils/vscodeOperation";
import * as fs from "fs-extra";
import { execCommand } from "../../utils/execCommand";
import { stopDebugging } from "../../utils/vscodeOperation";
import { TestContext } from "../testContext";
import { dotenvUtil } from "../../utils/envUtil";
import { TestFilePath } from "../../utils/constants";

export type LocalDebugTestName =
  | "tab"
  | "tabnsso"
  | "function"
  | "bot"
  | "msg"
  | "msgsa"
  | "funcNoti" // functions notification bot
  | "restNoti" // restify notification bot
  | "crbot" // command an response bot
  | "tabbot"
  | "spfx"
  | "botfunc"
  | "template"
  | "m365lp"
  | "workflow"
  | "dashboard"
  | "timeNoti" // timer functions notification bot
  | "ftNoti" // http and timer trigger notification bot
  | "linkunfurl"
  | "aichat"
  | "aiassist"
  | "msgnewapi";

export class LocalDebugTestContext extends TestContext {
  public testName: LocalDebugTestName;
  public lang: "javascript" | "typescript" = "javascript";
  needMigrate: boolean | undefined;

  constructor(
    testName: LocalDebugTestName,
    lang: "javascript" | "typescript" = "javascript",
    needMigrate?: boolean
  ) {
    super(testName);
    this.testName = testName;
    this.lang = lang;
    this.needMigrate = needMigrate;
  }

  public async before() {
    await super.before();
    await this.createProject();
    await this.disableDebugConsole();
    const testFolder = path.resolve(this.testRootFolder, this.appName);
    await openExistingProject(testFolder);
  }

  public async after(hasAadPlugin = true, hasBotPlugin = false) {
    await stopDebugging();
    await this.context!.close();
    await this.browser!.close();
    await this.cleanResource(hasAadPlugin, hasBotPlugin);
  }

  public async getTeamsAppId(): Promise<string> {
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
    const result = context.obj.TEAMS_APP_ID as string;
    console.log(`TEAMS APP ID: ${result}`);
    return result;
  }

  public async createProject(): Promise<void> {
    if (this.needMigrate) {
      await execCommand(this.testRootFolder, `set TEAMSFX_V3=false`);
    }
    switch (this.testName) {
      case "tab":
        await execCommand(
          this.testRootFolder,
          `teamsapp new --app-name ${this.appName} --interactive false --capability sso-launch-page --programming-language ${this.lang}`
        );
        break;
      case "tabnsso":
        await execCommand(
          this.testRootFolder,
          `teamsapp new --app-name ${this.appName} --interactive false --capability tab-non-sso --programming-language ${this.lang}`
        );
        break;
      case "funcNoti":
        await execCommand(
          this.testRootFolder,
          `teamsapp new --app-name ${this.appName} --interactive false --capability notification --bot-host-type-trigger http-functions --programming-language ${this.lang}`
        );
        break;
      case "restNoti":
        await execCommand(
          this.testRootFolder,
          `teamsapp new --app-name ${this.appName} --interactive false --capability notification --bot-host-type-trigger http-restify --programming-language ${this.lang}`
        );
        break;
      case "crbot":
        await execCommand(
          this.testRootFolder,
          `teamsapp new --app-name ${this.appName} --interactive false --capability command-bot --programming-language ${this.lang}`
        );
        break;
      case "function":
        await execCommand(
          this.testRootFolder,
          `teamsapp new --app-name ${this.appName} --interactive false --capability tab --programming-language ${this.lang}`
        );
        await execCommand(
          path.resolve(this.testRootFolder, this.appName),
          `teamsapp add azure-function`
        );
        break;
      case "bot":
        await execCommand(
          this.testRootFolder,
          `teamsapp new --app-name ${this.appName} --interactive false --capability bot --programming-language ${this.lang}`
        );
        break;
      case "msg":
        await execCommand(
          this.testRootFolder,
          `teamsapp new --app-name ${this.appName} --interactive false --capability collect-form-message-extension --programming-language ${this.lang}`
        );
        break;
      case "msgsa":
        await execCommand(
          this.testRootFolder,
          `teamsapp new --app-name ${this.appName} --interactive false --capability search-app --me-architecture bot --programming-language ${this.lang}`
        );
        break;
      case "tabbot":
        await execCommand(
          this.testRootFolder,
          `teamsapp new --app-name ${this.appName} --interactive false --capability tab --programming-language ${this.lang}`
        );
        await execCommand(
          path.resolve(this.testRootFolder, this.appName),
          `teamsapp add bot`
        );
        break;
      case "spfx":
        await execCommand(
          this.testRootFolder,
          `teamsapp new --app-name ${this.appName} --interactive false --capability tab-spfx --spfx-framework-type none --spfx-webpart-name ${this.appName}`
        );
        break;
      case "botfunc":
        await execCommand(
          this.testRootFolder,
          `teamsapp new --app-name ${this.appName} --interactive false --capability tab --programming-language ${this.lang}`
        );
        await execCommand(
          path.resolve(this.testRootFolder, this.appName),
          `teamsapp add azure-function`
        );
        await execCommand(
          path.resolve(this.testRootFolder, this.appName),
          `teamsapp add bot`
        );
        break;
      case "m365lp":
        await execCommand(
          this.testRootFolder,
          `teamsapp new --app-name ${this.appName} --interactive false --capability sso-launch-page --programming-language ${this.lang}`
        );
        break;
      case "workflow":
        await execCommand(
          this.testRootFolder,
          `teamsapp new --app-name ${this.appName} --interactive false --capability workflow-bot --programming-language ${this.lang}`
        );
        break;
      case "dashboard":
        await execCommand(
          this.testRootFolder,
          `teamsapp new --app-name ${this.appName} --interactive false --capability dashboard-tab --programming-language ${this.lang}`
        );
        break;
      case "timeNoti":
        await execCommand(
          this.testRootFolder,
          `teamsapp new --app-name ${this.appName} --interactive false --capability notification --bot-host-type-trigger timer-functions --programming-language ${this.lang}`
        );
        break;
      case "ftNoti":
        await execCommand(
          this.testRootFolder,
          `teamsapp new --app-name ${this.appName} --interactive false --capability notification --bot-host-type-trigger http-and-timer-functions --programming-language ${this.lang}`
        );
        break;
      case "linkunfurl":
        await execCommand(
          this.testRootFolder,
          `teamsapp new --app-name ${this.appName} --interactive false --capability link-unfurling  --programming-language ${this.lang}`
        );
        break;
      case "aichat":
        await execCommand(
          this.testRootFolder,
          `teamsapp new --app-name ${this.appName} --interactive false --capability custom-copilot-basic --programming-language ${this.lang}`
        );
        break;
      case "aiassist":
        await execCommand(
          this.testRootFolder,
          `teamsapp new --app-name ${this.appName} --interactive false --capability custom-copilot-assistant --programming-language ${this.lang}`
        );
        break;
      case "msgnewapi":
        await execCommand(
          this.testRootFolder,
          `teamsapp new --app-name ${this.appName} --interactive false --capability search-app  --me-architecture new-api --programming-language ${this.lang}`
        );
        break;
    }
    if (this.needMigrate) {
      await execCommand(this.testRootFolder, `set TEAMSFX_V3=true`);
    }
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

  // related bug https://msazure.visualstudio.com/Microsoft%20Teams%20Extensibility/_workitems/edit/12850424
  public async validateLocalStateForTab(): Promise<any> {
    console.log(`validating localSettings for tab`);
    const localStateFile = path.join(
      TestFilePath.configurationFolder,
      ".env.local.user"
    );
    const localStatePath = path.resolve(
      this.testRootFolder,
      this.appName,
      localStateFile
    );

    const localState = dotenvUtil.deserialize(
      await fs.readFile(localStatePath, { encoding: "utf8" })
    );

    const aadPassword = localState.obj.SECRET_AAD_APP_CLIENT_SECRET as string;

    if (!aadPassword.startsWith("crypto_")) {
      throw new Error(`Secret fields are not encrypted for sso aad project`);
    }
  }

  // releated bug https://msazure.visualstudio.com/Microsoft%20Teams%20Extensibility/_workitems/edit/12856828
  public async validateLocalStateForBot(): Promise<any> {
    console.log(`validating localSettings for bot`);
    const localStateFile = path.join(
      TestFilePath.configurationFolder,
      ".env.local.user"
    );
    const localStatePath = path.resolve(
      this.testRootFolder,
      this.appName,
      localStateFile
    );

    const localState = dotenvUtil.deserialize(
      await fs.readFile(localStatePath, { encoding: "utf8" })
    );

    const botPassword = localState.obj.SECRET_BOT_PASSWORD as string;

    if (!botPassword.startsWith("crypto_")) {
      throw new Error(`Secret fields are not encrypted for bot project`);
    }
  }
}

export class LocalDebugSampleTestContext extends LocalDebugTestContext {
  public sampleName?: string;
  constructor(sampleName: string) {
    super("template");
    this.testName = "template";
    this.sampleName = sampleName;
  }
}

export class LocalDebugSpfxTestContext extends LocalDebugTestContext {
  public framework: "react" | "minimal" | "none";
  constructor(framework: "react" | "minimal" | "none" = "react") {
    super("spfx");
    this.testName = "spfx";
    this.framework = framework;
  }

  public async createProject(): Promise<void> {
    await execCommand(
      this.testRootFolder,
      `teamsapp new --app-name ${this.appName} --interactive false --capability tab-spfx --spfx-framework-type ${this.framework} --spfx-webpart-name ${this.appName}`
    );
  }
}
