// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { assert } from "chai";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import sinon from "sinon";
import {
  CapabilityOptions,
  NotificationTriggerOptions,
  ProjectTypeOptions,
  QuestionNames,
  SPFxVersionOptionIds,
  ScratchOptions,
  createProjectQuestion,
  getLanguageOptions,
  getTemplate,
} from "../../src/question/create";
import {
  Inputs,
  LocalFunc,
  MultiSelectQuestion,
  OptionItem,
  Platform,
  Question,
  SingleSelectQuestion,
  UserInteraction,
  ok,
} from "@microsoft/teamsfx-api";
import { QuestionTreeVisitor, traverse } from "../../src/ui/visitor";
import { MockUserInteraction } from "../core/utils";
import os from "os";
import { Runtime, TabNonSsoAndDefaultBotItem } from "../../src/component/constants";
import { AppDefinition } from "../../src/component/driver/teamsApp/interfaces/appdefinitions/appDefinition";

async function callFuncs(question: Question, inputs: Inputs) {
  if (question.default && typeof question.default === "object") {
    await (question.default as LocalFunc<string | undefined>)(inputs);
  }

  if (
    (question.type === "singleSelect" || question.type === "multiSelect") &&
    typeof question.default === "object" &&
    question.dynamicOptions
  ) {
    await question.dynamicOptions(inputs);
  }
  if ((question as any).validation?.validFunc) {
    await (question as any).validation.validFunc(inputs);
  }

  if ((question as any).placeholder && typeof (question as any).placeholder === "object") {
    await (question as any).placeholder(inputs);
  }
}

describe("scaffold question", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe("createProjectQuestion", () => {
    const ui = new MockUserInteraction();
    let mockedEnvRestore: RestoreFn = () => {};

    afterEach(() => {
      mockedEnvRestore();
    });

    it("traverse in vscode sample", async () => {
      const root = createProjectQuestion();
      assert.isDefined(root);
      const inputs: Inputs = {
        platform: Platform.VSCode,
      };
      const questions: string[] = [];
      const visitor: QuestionTreeVisitor = async (
        question: Question,
        ui: UserInteraction,
        inputs: Inputs,
        step?: number,
        totalSteps?: number
      ) => {
        questions.push(question.name);

        await callFuncs(question, inputs);

        if (question.name === QuestionNames.Scratch) {
          return ok({ type: "success", result: ScratchOptions.no().id });
        } else if (question.name === QuestionNames.Samples) {
          return ok({ type: "success", result: "abc" });
        } else if (question.name === QuestionNames.Folder) {
          return ok({ type: "success", result: "./" });
        }
        return ok({ type: "success", result: undefined });
      };
      await traverse(root, inputs, ui, undefined, visitor);
      assert.deepEqual(questions, [
        QuestionNames.Scratch,
        QuestionNames.Samples,
        QuestionNames.Folder,
      ]);
    });

    it("traverse in vscode notification bot", async () => {
      const root = createProjectQuestion();
      assert.isDefined(root);
      const inputs: Inputs = {
        platform: Platform.VSCode,
      };
      const questions: string[] = [];
      const visitor: QuestionTreeVisitor = async (
        question: Question,
        ui: UserInteraction,
        inputs: Inputs,
        step?: number,
        totalSteps?: number
      ) => {
        questions.push(question.name);

        await callFuncs(question, inputs);

        if (question.name === QuestionNames.Scratch) {
          return ok({ type: "success", result: ScratchOptions.yes().id });
        } else if (question.name === QuestionNames.ProjectType) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 4);
          return ok({ type: "success", result: ProjectTypeOptions.bot().id });
        } else if (question.name === QuestionNames.Capabilities) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 4);
          return ok({ type: "success", result: CapabilityOptions.notificationBot().id });
        } else if (question.name === QuestionNames.BotTrigger) {
          return ok({ type: "success", result: NotificationTriggerOptions.appService().id });
        } else if (question.name === QuestionNames.ProgrammingLanguage) {
          return ok({ type: "success", result: "javascript" });
        } else if (question.name === QuestionNames.AppName) {
          return ok({ type: "success", result: "test001" });
        } else if (question.name === QuestionNames.Folder) {
          return ok({ type: "success", result: "./" });
        }
        return ok({ type: "success", result: undefined });
      };
      await traverse(root, inputs, ui, undefined, visitor);
      assert.deepEqual(questions, [
        "scratch",
        "project-type",
        "capabilities",
        "bot-host-type-trigger",
        "programming-language",
        "folder",
        "app-name",
      ]);
    });
    it("traverse in vscode Office addin", async () => {
      const root = createProjectQuestion();
      assert.isDefined(root);
      const inputs: Inputs = {
        platform: Platform.VSCode,
      };
      const questions: string[] = [];
      const visitor: QuestionTreeVisitor = async (
        question: Question,
        ui: UserInteraction,
        inputs: Inputs,
        step?: number,
        totalSteps?: number
      ) => {
        questions.push(question.name);
        await callFuncs(question, inputs);

        if (question.name === QuestionNames.Scratch) {
          return ok({ type: "success", result: ScratchOptions.yes().id });
        } else if (question.name === QuestionNames.ProjectType) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 4);
          return ok({ type: "success", result: ProjectTypeOptions.outlookAddin().id });
        } else if (question.name === QuestionNames.Capabilities) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.deepEqual(options, [
            ...CapabilityOptions.officeAddinItems(),
            CapabilityOptions.officeAddinImport(),
          ]);
          return ok({ type: "success", result: CapabilityOptions.officeAddinImport().id });
        } else if (question.name === QuestionNames.OfficeAddinFolder) {
          return ok({ type: "success", result: "./" });
        } else if (question.name === QuestionNames.OfficeAddinManifest) {
          return ok({ type: "success", result: "./manifest.json" });
        } else if (question.name === QuestionNames.ProgrammingLanguage) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 1);
          return ok({ type: "success", result: "typescript" });
        } else if (question.name === QuestionNames.Folder) {
          return ok({ type: "success", result: "./" });
        } else if (question.name === QuestionNames.AppName) {
          return ok({ type: "success", result: "test001" });
        }
        return ok({ type: "success", result: undefined });
      };
      await traverse(root, inputs, ui, undefined, visitor);
      assert.deepEqual(questions, [
        QuestionNames.Scratch,
        QuestionNames.ProjectType,
        QuestionNames.Capabilities,
        QuestionNames.OfficeAddinFolder,
        QuestionNames.OfficeAddinManifest,
        QuestionNames.ProgrammingLanguage,
        QuestionNames.Folder,
        QuestionNames.AppName,
      ]);
    });
    it("traverse in vscode SPFx new", async () => {
      const root = createProjectQuestion();
      assert.isDefined(root);
      const inputs: Inputs = {
        platform: Platform.VSCode,
      };
      const questions: string[] = [];
      const visitor: QuestionTreeVisitor = async (
        question: Question,
        ui: UserInteraction,
        inputs: Inputs,
        step?: number,
        totalSteps?: number
      ) => {
        questions.push(question.name);
        await callFuncs(question, inputs);
        if (question.name === QuestionNames.Scratch) {
          return ok({ type: "success", result: ScratchOptions.yes().id });
        } else if (question.name === QuestionNames.ProjectType) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 4);
          return ok({ type: "success", result: ProjectTypeOptions.tab().id });
        } else if (question.name === QuestionNames.Capabilities) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 4);
          return ok({ type: "success", result: CapabilityOptions.SPFxTab().id });
        } else if (question.name === QuestionNames.SPFxSolution) {
          return ok({ type: "success", result: "new" });
        } else if (question.name === QuestionNames.SPFxInstallPackage) {
          return ok({ type: "success", result: SPFxVersionOptionIds.installLocally });
        } else if (question.name === QuestionNames.SPFxFramework) {
          return ok({ type: "success", result: "react" });
        } else if (question.name === QuestionNames.SPFxWebpartName) {
          return ok({ type: "success", result: "test" });
        } else if (question.name === QuestionNames.ProgrammingLanguage) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 1);
          return ok({ type: "success", result: "typescript" });
        } else if (question.name === QuestionNames.Folder) {
          return ok({ type: "success", result: "./" });
        } else if (question.name === QuestionNames.AppName) {
          return ok({ type: "success", result: "test001" });
        }
        return ok({ type: "success", result: undefined });
      };
      await traverse(root, inputs, ui, undefined, visitor);
      assert.deepEqual(questions, [
        QuestionNames.Scratch,
        QuestionNames.ProjectType,
        QuestionNames.Capabilities,
        QuestionNames.SPFxSolution,
        QuestionNames.SPFxInstallPackage,
        QuestionNames.SPFxFramework,
        QuestionNames.SPFxWebpartName,
        QuestionNames.ProgrammingLanguage,
        QuestionNames.Folder,
        QuestionNames.AppName,
      ]);
    });
    it("traverse in vscode SPFx import", async () => {
      const root = createProjectQuestion();
      assert.isDefined(root);
      const inputs: Inputs = {
        platform: Platform.VSCode,
      };
      const questions: string[] = [];
      const visitor: QuestionTreeVisitor = async (
        question: Question,
        ui: UserInteraction,
        inputs: Inputs,
        step?: number,
        totalSteps?: number
      ) => {
        questions.push(question.name);
        await callFuncs(question, inputs);
        if (question.name === QuestionNames.Scratch) {
          return ok({ type: "success", result: ScratchOptions.yes().id });
        } else if (question.name === QuestionNames.ProjectType) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 4);
          return ok({ type: "success", result: ProjectTypeOptions.tab().id });
        } else if (question.name === QuestionNames.Capabilities) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 4);
          return ok({ type: "success", result: CapabilityOptions.SPFxTab().id });
        } else if (question.name === QuestionNames.SPFxSolution) {
          return ok({ type: "success", result: "import" });
        } else if (question.name === QuestionNames.SPFxFolder) {
          return ok({ type: "success", result: "" });
        } else if (question.name === QuestionNames.SkipAppName) {
          return ok({ type: "success", result: "" });
        } else if (question.name === QuestionNames.ProgrammingLanguage) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 1);
          return ok({ type: "success", result: "typescript" });
        } else if (question.name === QuestionNames.Folder) {
          return ok({ type: "success", result: "./" });
        } else if (question.name === QuestionNames.AppName) {
          return ok({ type: "success", result: "test001" });
        }
        return ok({ type: "success", result: undefined });
      };
      await traverse(root, inputs, ui, undefined, visitor);
      assert.deepEqual(questions, [
        QuestionNames.Scratch,
        QuestionNames.ProjectType,
        QuestionNames.Capabilities,
        QuestionNames.SPFxSolution,
        QuestionNames.SPFxFolder,
        QuestionNames.SkipAppName,
        QuestionNames.ProgrammingLanguage,
        QuestionNames.Folder,
        QuestionNames.AppName,
      ]);
    });
    it("traverse in vscode TDP with tab and bot", async () => {
      const root = createProjectQuestion();
      const appDefinition: AppDefinition = {
        teamsAppId: "mock-id",
        appId: "mock-id",
        staticTabs: [
          {
            name: "tab1",
            entityId: "tab1",
            contentUrl: "mock-contentUrl",
            websiteUrl: "mock-websiteUrl",
            context: [],
            scopes: [],
          },
        ],
        bots: [
          {
            botId: "mock-bot-id",
            isNotificationOnly: false,
            needsChannelSelector: false,
            supportsCalling: false,
            supportsFiles: false,
            supportsVideo: false,
            scopes: [],
            teamCommands: [],
            groupChatCommands: [],
            personalCommands: [],
          },
        ],
      };
      const inputs: Inputs = {
        platform: Platform.VSCode,
        teamsAppFromTdp: appDefinition,
      };
      const questions: string[] = [];
      const visitor: QuestionTreeVisitor = async (
        question: Question,
        ui: UserInteraction,
        inputs: Inputs,
        step?: number,
        totalSteps?: number
      ) => {
        questions.push(question.name);
        await callFuncs(question, inputs);
        if (question.name === QuestionNames.Scratch) {
          return ok({ type: "success", result: ScratchOptions.yes().id });
        } else if (question.name === QuestionNames.ProjectType) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 1);
          return ok({ type: "success", result: "tab-bot-type" });
        } else if (question.name === QuestionNames.Capabilities) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 1);
          return ok({ type: "success", result: TabNonSsoAndDefaultBotItem().id });
        } else if (question.name === QuestionNames.ProgrammingLanguage) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 2);
          return ok({ type: "success", result: "typescript" });
        } else if (question.name === QuestionNames.Folder) {
          return ok({ type: "success", result: "./" });
        } else if (question.name === QuestionNames.AppName) {
          return ok({ type: "success", result: "test001" });
        } else if (question.name === QuestionNames.ReplaceWebsiteUrl) {
          const select = question as MultiSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 1);
          return ok({ type: "success", result: [] });
        } else if (question.name === QuestionNames.ReplaceContentUrl) {
          const select = question as MultiSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 1);
          return ok({ type: "success", result: [] });
        } else if (question.name === QuestionNames.ReplaceBotIds) {
          const select = question as MultiSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 1);
          return ok({ type: "success", result: [] });
        }
        return ok({ type: "success", result: undefined });
      };
      await traverse(root, inputs, ui, undefined, visitor);
      assert.deepEqual(questions, [
        QuestionNames.Scratch,
        QuestionNames.ProjectType,
        QuestionNames.Capabilities,
        QuestionNames.ProgrammingLanguage,
        QuestionNames.Folder,
        QuestionNames.AppName,
        QuestionNames.ReplaceWebsiteUrl,
        QuestionNames.ReplaceContentUrl,
        QuestionNames.ReplaceBotIds,
      ]);
    });
    it("traverse in cli", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_CLI_DOTNET: "false" });
      const root = createProjectQuestion();
      assert.isDefined(root);
      const inputs: Inputs = {
        platform: Platform.CLI,
      };
      const questions: string[] = [];
      const visitor: QuestionTreeVisitor = async (
        question: Question,
        ui: UserInteraction,
        inputs: Inputs,
        step?: number,
        totalSteps?: number
      ) => {
        questions.push(question.name);
        await callFuncs(question, inputs);
        if (question.name === QuestionNames.Scratch) {
          return ok({ type: "success", result: ScratchOptions.yes().id });
        } else if (question.name === QuestionNames.ProjectType) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 1);
          return ok({ type: "success", result: "" });
        } else if (question.name === QuestionNames.Capabilities) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 10);
          return ok({ type: "success", result: CapabilityOptions.notificationBot().id });
        } else if (question.name === QuestionNames.BotTrigger) {
          return ok({ type: "success", result: NotificationTriggerOptions.appService().id });
        } else if (question.name === QuestionNames.ProgrammingLanguage) {
          return ok({ type: "success", result: "javascript" });
        } else if (question.name === QuestionNames.AppName) {
          return ok({ type: "success", result: "test001" });
        } else if (question.name === QuestionNames.Folder) {
          return ok({ type: "success", result: "./" });
        }
        return ok({ type: "success", result: undefined });
      };
      await traverse(root, inputs, ui, undefined, visitor);
      assert.deepEqual(questions, [
        "scratch",
        "project-type",
        "capabilities",
        "bot-host-type-trigger",
        "programming-language",
        "folder",
        "app-name",
      ]);
    });

    it("traverse in cli TEAMSFX_CLI_DOTNET=true", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_CLI_DOTNET: "true" });
      const root = createProjectQuestion();
      assert.isDefined(root);
      const inputs: Inputs = {
        platform: Platform.CLI,
      };
      const questions: string[] = [];
      const visitor: QuestionTreeVisitor = async (
        question: Question,
        ui: UserInteraction,
        inputs: Inputs,
        step?: number,
        totalSteps?: number
      ) => {
        questions.push(question.name);
        await callFuncs(question, inputs);
        if (question.name === QuestionNames.Scratch) {
          return ok({ type: "success", result: ScratchOptions.yes().id });
        } else if (question.name === QuestionNames.Runtime) {
          return ok({ type: "success", result: Runtime.dotnet });
        } else if (question.name === QuestionNames.ProjectType) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 1);
          return ok({ type: "success", result: "" });
        } else if (question.name === QuestionNames.Capabilities) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 4);
          return ok({ type: "success", result: CapabilityOptions.notificationBot().id });
        } else if (question.name === QuestionNames.BotTrigger) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.deepEqual(options, [
            NotificationTriggerOptions.appServiceForVS(),
            ...NotificationTriggerOptions.functionsTriggers(),
          ]);
          return ok({ type: "success", result: NotificationTriggerOptions.appServiceForVS().id });
        } else if (question.name === QuestionNames.ProgrammingLanguage) {
          return ok({ type: "success", result: "javascript" });
        } else if (question.name === QuestionNames.AppName) {
          return ok({ type: "success", result: "test001" });
        } else if (question.name === QuestionNames.Folder) {
          return ok({ type: "success", result: "./" });
        }
        return ok({ type: "success", result: undefined });
      };
      await traverse(root, inputs, ui, undefined, visitor);
      assert.deepEqual(questions, [
        "scratch",
        "runtime",
        "project-type",
        "capabilities",
        "bot-host-type-trigger",
        "programming-language",
        "folder",
        "app-name",
      ]);
    });
  });

  describe("getLanguageOptions", () => {
    let mockedEnvRestore: RestoreFn = () => {};

    afterEach(() => {
      mockedEnvRestore();
    });

    it("dotnet for VS", async () => {
      const options = getLanguageOptions({
        platform: Platform.VS,
        runtime: Runtime.dotnet,
      });
      assert.isTrue(options.length === 1 && options[0].id === "csharp");
    });

    it("dotnet when TEAMSFX_CLI_DOTNET", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_CLI_DOTNET: "true" });
      const options = getLanguageOptions({
        platform: Platform.CLI,
        runtime: Runtime.dotnet,
      });
      assert.isTrue(options.length === 1 && options[0].id === "csharp");
    });

    it("office addin", async () => {
      const options = getLanguageOptions({
        platform: Platform.VSCode,
        [QuestionNames.ProjectType]: ProjectTypeOptions.outlookAddin().id,
        [QuestionNames.Capabilities]: "taskpane",
      });
      assert.isTrue(options.length === 1 && options[0].id === "TypeScript");
    });
    it("SPFx", async () => {
      const options = getLanguageOptions({
        platform: Platform.VSCode,
        [QuestionNames.ProjectType]: ProjectTypeOptions.tab().id,
        [QuestionNames.Capabilities]: CapabilityOptions.SPFxTab().id,
      });
      assert.isTrue(options.length === 1 && options[0].id === "typescript");
    });
    it("other", async () => {
      const options = getLanguageOptions({
        platform: Platform.VSCode,
        [QuestionNames.ProjectType]: ProjectTypeOptions.tab().id,
        [QuestionNames.Capabilities]: CapabilityOptions.basicBot().id,
      });
      assert.isTrue(options.length === 2);
    });
  });
  describe("getTemplate", () => {
    it("should find taskpane template", () => {
      const inputs: Inputs = {
        platform: Platform.CLI,
      };
      inputs["capabilities"] = ["taskpane"];
      const template = getTemplate(inputs);
      chai.expect(template).to.eq("taskpane");
    });
  });
});
