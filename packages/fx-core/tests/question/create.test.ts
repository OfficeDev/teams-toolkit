// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  FuncValidation,
  FxError,
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
import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import mockedEnv, { RestoreFn } from "mocked-env";
import sinon from "sinon";
import { getLocalizedString } from "../../src/common/localizeUtils";
import { AppDefinition } from "../../src/component/driver/teamsApp/interfaces/appdefinitions/appDefinition";
import {
  CapabilityOptions,
  NotificationTriggerOptions,
  ProjectTypeOptions,
  RuntimeOptions,
  SPFxVersionOptionIds,
  ScratchOptions,
  apiOperationQuestion,
  apiSpecLocationQuestion,
  appNameQuestion,
  createProjectQuestionNode,
  createSampleProjectQuestionNode,
  folderQuestion,
  getLanguageOptions,
  getTemplate,
  openAIPluginManifestLocationQuestion,
  programmingLanguageQuestion,
} from "../../src/question/create";
import { QuestionNames } from "../../src/question/questionNames";
import { QuestionTreeVisitor, traverse } from "../../src/ui/visitor";
import { MockTools, MockUserInteraction, randomAppName } from "../core/utils";
import * as path from "path";
import { FeatureFlagName } from "../../src/common/constants";
import { SpecParser } from "../../src/common/spec-parser/specParser";
import { ErrorType, ValidationStatus, WarningType } from "../../src/common/spec-parser/interfaces";
import { setTools } from "../../src/core/globalVars";
import axios from "axios";
import { manifestUtils } from "../../src/component/driver/teamsApp/utils/ManifestUtils";

export async function callFuncs(question: Question, inputs: Inputs, answer?: string) {
  if (question.default && typeof question.default !== "string") {
    await (question.default as LocalFunc<string | undefined>)(inputs);
  }

  if (
    (question.type === "singleSelect" || question.type === "multiSelect") &&
    typeof question.dynamicOptions !== "object" &&
    question.dynamicOptions
  ) {
    await question.dynamicOptions(inputs);
  }
  if (answer && (question as any).validation?.validFunc) {
    await (question as any).validation.validFunc(answer, inputs);
  }

  if ((question as any).placeholder && typeof (question as any).placeholder !== "string") {
    await (question as any).placeholder(inputs);
  }
}

describe("scaffold question", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe("createProjectQuestionNode", () => {
    const ui = new MockUserInteraction();
    let mockedEnvRestore: RestoreFn = () => {};

    beforeEach(() => {
      mockedEnvRestore = mockedEnv({
        [FeatureFlagName.CopilotPlugin]: "false",
      });
    });
    afterEach(() => {
      mockedEnvRestore();
    });

    it("create sample", async () => {
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

        if (question.name === QuestionNames.Samples) {
          return ok({ type: "success", result: "abc" });
        } else if (question.name === QuestionNames.Folder) {
          return ok({ type: "success", result: "./" });
        }
        return ok({ type: "success", result: undefined });
      };
      await traverse(createSampleProjectQuestionNode(), inputs, ui, undefined, visitor);
      assert.deepEqual(questions, [QuestionNames.Samples, QuestionNames.Folder]);
    });

    it("traverse in vscode notification bot", async () => {
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

        if (question.name === QuestionNames.ProjectType) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 4);
          return ok({ type: "success", result: ProjectTypeOptions.bot().id });
        } else if (question.name === QuestionNames.Capabilities) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 5);
          const title =
            typeof question.title === "function" ? await question.title(inputs) : question.title;
          assert.equal(
            title,
            getLocalizedString("core.createProjectQuestion.projectType.bot.title")
          );
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
      await traverse(createProjectQuestionNode(), inputs, ui, undefined, visitor);
      assert.deepEqual(questions, [
        QuestionNames.ProjectType,
        QuestionNames.Capabilities,
        QuestionNames.BotTrigger,
        QuestionNames.ProgrammingLanguage,
        QuestionNames.Folder,
        QuestionNames.AppName,
      ]);
    });

    it("traverse in vscode me", async () => {
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

        if (question.name === QuestionNames.ProjectType) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 4);
          return ok({ type: "success", result: ProjectTypeOptions.me().id });
        } else if (question.name === QuestionNames.Capabilities) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 3);
          const title =
            typeof question.title === "function" ? await question.title(inputs) : question.title;
          assert.equal(
            title,
            getLocalizedString("core.createProjectQuestion.projectType.messageExtension.title")
          );
          return ok({ type: "success", result: CapabilityOptions.m365SearchMe().id });
        } else if (question.name === QuestionNames.ProgrammingLanguage) {
          return ok({ type: "success", result: "javascript" });
        } else if (question.name === QuestionNames.AppName) {
          return ok({ type: "success", result: "test001" });
        } else if (question.name === QuestionNames.Folder) {
          return ok({ type: "success", result: "./" });
        }
        return ok({ type: "success", result: undefined });
      };
      await traverse(createProjectQuestionNode(), inputs, ui, undefined, visitor);
      assert.deepEqual(questions, [
        QuestionNames.ProjectType,
        QuestionNames.Capabilities,
        QuestionNames.ProgrammingLanguage,
        QuestionNames.Folder,
        QuestionNames.AppName,
      ]);
    });
    it("traverse in vscode Office addin", async () => {
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

        if (question.name === QuestionNames.ProjectType) {
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
          const title =
            typeof question.title === "function" ? await question.title(inputs) : question.title;
          assert.equal(
            title,
            getLocalizedString("core.createProjectQuestion.projectType.outlookAddin.title")
          );
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
      await traverse(createProjectQuestionNode(), inputs, ui, undefined, visitor);
      assert.deepEqual(questions, [
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
        if (question.name === QuestionNames.ProjectType) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 4);
          return ok({ type: "success", result: ProjectTypeOptions.tab().id });
        } else if (question.name === QuestionNames.Capabilities) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 4);
          const title =
            typeof question.title === "function" ? await question.title(inputs) : question.title;
          assert.equal(
            title,
            getLocalizedString("core.createProjectQuestion.projectType.tab.title")
          );
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
      await traverse(createProjectQuestionNode(), inputs, ui, undefined, visitor);
      assert.deepEqual(questions, [
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
        if (question.name === QuestionNames.ProjectType) {
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
      await traverse(createProjectQuestionNode(), inputs, ui, undefined, visitor);
      assert.deepEqual(questions, [
        QuestionNames.ProjectType,
        QuestionNames.Capabilities,
        QuestionNames.SPFxSolution,
        QuestionNames.SPFxFolder,
        QuestionNames.ProgrammingLanguage,
        QuestionNames.Folder,
        QuestionNames.AppName,
      ]);
    });
    it("traverse in vscode TDP with tab and bot", async () => {
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
        if (question.name === QuestionNames.ProjectType) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 1);
          return ok({ type: "success", result: "tab-bot-type" });
        } else if (question.name === QuestionNames.Capabilities) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 1);
          return ok({ type: "success", result: CapabilityOptions.nonSsoTabAndBot().id });
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
          const options = (await select.dynamicOptions!(inputs)) as OptionItem[];
          const defaults = await (select as any).default!(inputs);
          assert.isTrue(options.length === 1);
          assert.isTrue(defaults.length === 1);
          assert.deepEqual(
            options.map((o) => o.id),
            defaults
          );
          return ok({ type: "success", result: [] });
        } else if (question.name === QuestionNames.ReplaceContentUrl) {
          const select = question as MultiSelectQuestion;
          const options = (await select.dynamicOptions!(inputs)) as OptionItem[];
          const defaults = await (select as any).default!(inputs);
          assert.isTrue(options.length === 1);
          assert.isTrue(defaults.length === 1);
          assert.deepEqual(
            options.map((o) => o.id),
            defaults
          );
          return ok({ type: "success", result: [] });
        } else if (question.name === QuestionNames.ReplaceBotIds) {
          const select = question as MultiSelectQuestion;
          const options = (await select.dynamicOptions!(inputs)) as OptionItem[];
          const defaults = await (select as any).default!(inputs);
          assert.isTrue(options.length === 1);
          assert.isTrue(defaults.length === 1);
          assert.deepEqual(
            options.map((o: OptionItem) => o.id),
            defaults
          );
          return ok({ type: "success", result: [] });
        }
        return ok({ type: "success", result: undefined });
      };
      const tres = await traverse(createProjectQuestionNode(), inputs, ui, undefined, visitor);
      assert.isTrue(tres.isOk());
      assert.deepEqual(questions, [
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
    it("traverse in vscode TDP with empty website url", async () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "mock-id",
        appId: "mock-id",
        staticTabs: [
          {
            name: "tab1",
            entityId: "tab1",
            contentUrl: "https://test.com",
            websiteUrl: "",
            context: [],
            scopes: [],
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
        if (question.name === QuestionNames.ProjectType) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 1);
          return ok({ type: "success", result: "tab-bot-type" });
        } else if (question.name === QuestionNames.Capabilities) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 1);
          return ok({ type: "success", result: CapabilityOptions.nonSsoTabAndBot().id });
        } else if (question.name === QuestionNames.ProgrammingLanguage) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 2);
          return ok({ type: "success", result: "typescript" });
        } else if (question.name === QuestionNames.Folder) {
          return ok({ type: "success", result: "./" });
        } else if (question.name === QuestionNames.AppName) {
          return ok({ type: "success", result: "test001" });
        } else if (question.name === QuestionNames.ReplaceContentUrl) {
          const select = question as MultiSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 1);
          return ok({ type: "success", result: [] });
        }
        return ok({ type: "success", result: undefined });
      };
      await traverse(createProjectQuestionNode(), inputs, ui, undefined, visitor);
      assert.deepEqual(questions, [
        QuestionNames.ProjectType,
        QuestionNames.Capabilities,
        QuestionNames.ProgrammingLanguage,
        QuestionNames.Folder,
        QuestionNames.AppName,
        QuestionNames.ReplaceContentUrl,
      ]);
    });
    it("traverse in cli", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_CLI_DOTNET: "false" });
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
        if (question.name === QuestionNames.Capabilities) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 12);
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
      await traverse(createProjectQuestionNode(), inputs, ui, undefined, visitor);
      assert.deepEqual(questions, [
        QuestionNames.Capabilities,
        QuestionNames.BotTrigger,
        QuestionNames.ProgrammingLanguage,
        QuestionNames.Folder,
        QuestionNames.AppName,
      ]);
    });

    it("traverse in cli TEAMSFX_CLI_DOTNET=true", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_CLI_DOTNET: "true" });
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
        if (question.name === QuestionNames.Runtime) {
          return ok({ type: "success", result: RuntimeOptions.DotNet().id });
        } else if (question.name === QuestionNames.Capabilities) {
          const select = question as SingleSelectQuestion;
          const options = await select.dynamicOptions!(inputs);
          assert.isTrue(options.length === 12);
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
      await traverse(createProjectQuestionNode(), inputs, ui, undefined, visitor);
      assert.deepEqual(questions, [
        QuestionNames.Runtime,
        QuestionNames.Capabilities,
        QuestionNames.BotTrigger,
        QuestionNames.ProgrammingLanguage,
        QuestionNames.Folder,
        QuestionNames.AppName,
      ]);
    });

    describe("copilot plugin enabled", () => {
      let mockedEnvRestore: RestoreFn;
      const tools = new MockTools();
      setTools(tools);
      beforeEach(() => {
        mockedEnvRestore = mockedEnv({
          [FeatureFlagName.CopilotPlugin]: "true",
        });
      });

      afterEach(() => {
        if (mockedEnvRestore) {
          mockedEnvRestore();
        }
      });
      it("traverse in vscode Copilot Plugin from new API", async () => {
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
          if (question.name === QuestionNames.ProjectType) {
            const select = question as SingleSelectQuestion;
            const options = await select.dynamicOptions!(inputs);
            assert.isTrue(options.length === 5);
            return ok({ type: "success", result: "copilot-plugin-type" });
          } else if (question.name === QuestionNames.Capabilities) {
            const select = question as SingleSelectQuestion;
            const options = await select.dynamicOptions!(inputs);
            assert.isTrue(options.length === 3);
            return ok({ type: "success", result: CapabilityOptions.copilotPluginNewApi().id });
          } else if (question.name === QuestionNames.ProgrammingLanguage) {
            const select = question as SingleSelectQuestion;
            const options = await select.dynamicOptions!(inputs);
            assert.isTrue(options.length === 2);
            return ok({ type: "success", result: "typescript" });
          } else if (question.name === QuestionNames.Folder) {
            return ok({ type: "success", result: "./" });
          } else if (question.name === QuestionNames.AppName) {
            return ok({ type: "success", result: "test001" });
          }
          return ok({ type: "success", result: undefined });
        };
        await traverse(createProjectQuestionNode(), inputs, ui, undefined, visitor);
        assert.deepEqual(questions, [
          QuestionNames.ProjectType,
          QuestionNames.Capabilities,
          QuestionNames.ProgrammingLanguage,
          QuestionNames.Folder,
          QuestionNames.AppName,
        ]);
      });

      it("traverse in vscode Copilot Plugin from API Spec", async () => {
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
          if (question.name !== QuestionNames.ApiOperation) {
            await callFuncs(question, inputs);
          }
          if (question.name === QuestionNames.ProjectType) {
            const select = question as SingleSelectQuestion;
            const options = await select.dynamicOptions!(inputs);
            assert.isTrue(options.length === 5);
            return ok({ type: "success", result: "copilot-plugin-type" });
          } else if (question.name === QuestionNames.Capabilities) {
            const select = question as SingleSelectQuestion;
            const options = await select.dynamicOptions!(inputs);
            assert.equal(
              (question.title as any)!(inputs),
              getLocalizedString("core.createProjectQuestion.projectType.copilotPlugin.title")
            );
            assert.isTrue(options.length === 3);
            return ok({ type: "success", result: CapabilityOptions.copilotPluginApiSpec().id });
          } else if (question.name === QuestionNames.ApiSpecLocation) {
            const validRes = await (question as any).inputBoxConfig.validation!.validFunc(
              "https://test.com"
            );
            assert.isUndefined(validRes);
            return ok({ type: "success", result: "https://test.com" });
          } else if (question.name === QuestionNames.ApiOperation) {
            return ok({ type: "success", result: ["testOperation1"] });
          } else if (question.name === QuestionNames.ProgrammingLanguage) {
            const select = question as SingleSelectQuestion;
            const options = await select.dynamicOptions!(inputs);
            assert.isTrue(options.length === 2);
            return ok({ type: "success", result: "typescript" });
          } else if (question.name === QuestionNames.Folder) {
            return ok({ type: "success", result: "./" });
          } else if (question.name === QuestionNames.AppName) {
            return ok({ type: "success", result: "test001" });
          }
          return ok({ type: "success", result: undefined });
        };
        await traverse(createProjectQuestionNode(), inputs, ui, undefined, visitor);
        assert.deepEqual(questions, [
          QuestionNames.ProjectType,
          QuestionNames.Capabilities,
          QuestionNames.ApiSpecLocation,
          QuestionNames.ApiOperation,
          QuestionNames.Folder,
          QuestionNames.AppName,
        ]);
      });

      it("traverse in vscode Copilot Plugin from OpenAI Plugin", async () => {
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
          if (question.name !== QuestionNames.ApiOperation) {
            await callFuncs(question, inputs);
          }
          if (question.name === QuestionNames.ProjectType) {
            const select = question as SingleSelectQuestion;
            const options = await select.dynamicOptions!(inputs);
            assert.isTrue(options.length === 5);
            return ok({ type: "success", result: "copilot-plugin-type" });
          } else if (question.name === QuestionNames.Capabilities) {
            const select = question as SingleSelectQuestion;
            const options = await select.dynamicOptions!(inputs);
            assert.isTrue(options.length === 3);
            return ok({
              type: "success",
              result: CapabilityOptions.copilotPluginOpenAIPlugin().id,
            });
          } else if (question.name === QuestionNames.OpenAIPluginManifestLocation) {
            return ok({ type: "success", result: "https://test.com" });
          } else if (question.name === QuestionNames.ApiOperation) {
            return ok({ type: "success", result: ["testOperation1"] });
          } else if (question.name === QuestionNames.ProgrammingLanguage) {
            const select = question as SingleSelectQuestion;
            const options = await select.dynamicOptions!(inputs);
            assert.isTrue(options.length === 2);
            return ok({ type: "success", result: "typescript" });
          } else if (question.name === QuestionNames.Folder) {
            return ok({ type: "success", result: "./" });
          } else if (question.name === QuestionNames.AppName) {
            return ok({ type: "success", result: "test001" });
          }
          return ok({ type: "success", result: undefined });
        };
        await traverse(createProjectQuestionNode(), inputs, ui, undefined, visitor);
        assert.deepEqual(questions, [
          QuestionNames.ProjectType,
          QuestionNames.Capabilities,
          QuestionNames.OpenAIPluginManifestLocation,
          QuestionNames.ApiOperation,
          QuestionNames.Folder,
          QuestionNames.AppName,
        ]);
      });

      it("traverse in cli", async () => {
        mockedEnvRestore = mockedEnv({ TEAMSFX_CLI_DOTNET: "false" });
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
          if (question.name === QuestionNames.Capabilities) {
            const select = question as SingleSelectQuestion;
            const options = await select.dynamicOptions!(inputs);
            assert.isTrue(options.length === 13);
            return ok({ type: "success", result: CapabilityOptions.copilotPluginCli().id });
          } else if (question.name === QuestionNames.CopilotPluginDevelopment) {
            return ok({ type: "success", result: CapabilityOptions.copilotPluginNewApi().id });
          } else if (question.name === QuestionNames.CopilotPluginDevelopment) {
            return ok({ type: "success", result: "javascript" });
          } else if (question.name === QuestionNames.ProgrammingLanguage) {
            return ok({ type: "success", result: "javascript" });
          } else if (question.name === QuestionNames.AppName) {
            return ok({ type: "success", result: "test001" });
          } else if (question.name === QuestionNames.Folder) {
            return ok({ type: "success", result: "./" });
          }
          return ok({ type: "success", result: undefined });
        };
        await traverse(createProjectQuestionNode(), inputs, ui, undefined, visitor);
        assert.deepEqual(questions, [
          QuestionNames.Capabilities,
          QuestionNames.CopilotPluginDevelopment,
          QuestionNames.ProgrammingLanguage,
          QuestionNames.Folder,
          QuestionNames.AppName,
        ]);
      });

      describe("list operations", async () => {
        it(" list operations successfully", async () => {
          const question = apiOperationQuestion();
          const inputs: Inputs = {
            platform: Platform.VSCode,
            [QuestionNames.ApiSpecLocation]: "apispec",
            supportedApisFromApiSpec: [
              { id: "operation1", label: "operation1", groupName: "1" },
              { id: "operation2", label: "operation2", groupName: "2" },
            ],
          };

          const options = (await question.dynamicOptions!(inputs)) as OptionItem[];

          assert.isTrue(options.length === 2);
          assert.isTrue(options[0].id === "operation1");
          assert.isTrue(options[1].id === "operation2");
        });

        it(" list operations error", async () => {
          const question = apiOperationQuestion();
          const inputs: Inputs = {
            platform: Platform.VSCode,
            [QuestionNames.ApiSpecLocation]: "apispec",
          };

          let fxError: FxError | undefined = undefined;
          try {
            await question.dynamicOptions!(inputs);
          } catch (e) {
            fxError = e;
          }

          assert.isTrue(fxError !== undefined);
        });
      });

      describe("apiSpecLocationQuestion", async () => {
        it("valid API spec selecting from local file", async () => {
          const question = apiSpecLocationQuestion();
          const inputs: Inputs = {
            platform: Platform.VSCode,
          };

          sandbox
            .stub(SpecParser.prototype, "validate")
            .resolves({ status: ValidationStatus.Valid, errors: [], warnings: [] });
          sandbox.stub(SpecParser.prototype, "list").resolves(["get operation1", "get operation2"]);

          const validationSchema = question.validation as FuncValidation<string>;
          const res = await validationSchema.validFunc!("file", inputs);
          assert.deepEqual(inputs.supportedApisFromApiSpec, [
            { id: "get operation1", label: "get operation1", groupName: "GET" },
            { id: "get operation2", label: "get operation2", groupName: "GET" },
          ]);
          assert.isUndefined(res);
        });

        it("skip validating on selectFile result if user selects to input URL", async () => {
          const question = apiSpecLocationQuestion();
          const inputs: Inputs = {
            platform: Platform.VSCode,
          };

          sandbox
            .stub(SpecParser.prototype, "validate")
            .resolves({ status: ValidationStatus.Valid, errors: [], warnings: [] });
          sandbox.stub(SpecParser.prototype, "list").resolves(["operation1", "operation2"]);

          const validationSchema = question.validation as FuncValidation<string>;
          const res = await validationSchema.validFunc!("input", inputs);
          assert.isUndefined(res);
        });

        it("invalid api spec", async () => {
          const question = apiSpecLocationQuestion();
          const inputs: Inputs = {
            platform: Platform.VSCode,
            [QuestionNames.ApiSpecLocation]: "apispec",
          };
          sandbox.stub(SpecParser.prototype, "validate").resolves({
            status: ValidationStatus.Error,
            errors: [
              {
                type: ErrorType.SpecNotValid,
                content: "error",
              },
            ],
            warnings: [],
          });

          const validationSchema = question.validation as FuncValidation<string>;
          const res = await validationSchema.validFunc!("file", inputs);

          assert.equal(res, "error");
        });

        it("invalid api spec - multiple errors", async () => {
          const question = apiSpecLocationQuestion();
          const inputs: Inputs = {
            platform: Platform.VSCode,
            [QuestionNames.ApiSpecLocation]: "apispec",
          };
          sandbox.stub(SpecParser.prototype, "validate").resolves({
            status: ValidationStatus.Error,
            errors: [
              {
                type: ErrorType.SpecNotValid,
                content: "error",
              },
              {
                type: ErrorType.MultipleServerInformation,
                content: "error2",
              },
            ],
            warnings: [],
          });

          const validationSchema = question.validation as FuncValidation<string>;
          const res = await validationSchema.validFunc!("file", inputs);

          assert.equal(
            res,
            getLocalizedString(
              "core.createProjectQuestion.apiSpec.multipleValidationErrors.vscode.message"
            )
          );
        });

        it("invalid api spec - multiple errors CLI", async () => {
          const question = apiSpecLocationQuestion();
          const inputs: Inputs = {
            platform: Platform.CLI,
            [QuestionNames.ApiSpecLocation]: "apispec",
          };
          sandbox.stub(SpecParser.prototype, "validate").resolves({
            status: ValidationStatus.Error,
            errors: [
              {
                type: ErrorType.SpecNotValid,
                content: "error",
              },
              {
                type: ErrorType.MultipleServerInformation,
                content: "error2",
              },
            ],
            warnings: [],
          });

          const validationSchema = question.validation as FuncValidation<string>;
          const res = await validationSchema.validFunc!("file", inputs);

          assert.equal(res, "error\nerror2");
        });

        it("valid API spec from remote URL", async () => {
          const question = apiSpecLocationQuestion();
          const inputs: Inputs = {
            platform: Platform.VSCode,
          };

          sandbox
            .stub(SpecParser.prototype, "validate")
            .resolves({ status: ValidationStatus.Valid, errors: [], warnings: [] });
          sandbox.stub(SpecParser.prototype, "list").resolves(["get operation1", "get operation2"]);

          const validate = (
            question.inputBoxConfig.additionalValidationOnAccept! as FuncValidation<string>
          ).validFunc;
          const res = await validate("url1", inputs);
          assert.deepEqual(inputs.supportedApisFromApiSpec, [
            { id: "get operation1", label: "get operation1", groupName: "GET" },
            { id: "get operation2", label: "get operation2", groupName: "GET" },
          ]);
          assert.isUndefined(res);
        });

        it("valid api spec and list operations error", async () => {
          const question = apiSpecLocationQuestion();
          const inputs: Inputs = {
            platform: Platform.VSCode,
            [QuestionNames.ApiSpecLocation]: "apispec",
          };
          sandbox.stub(SpecParser.prototype, "validate").resolves({
            status: ValidationStatus.Valid,
            errors: [],
            warnings: [{ type: WarningType.AuthNotSupported, content: "" }],
          });
          sandbox.stub(SpecParser.prototype, "list").throws(new Error("error1"));

          const validate = (
            question.inputBoxConfig.additionalValidationOnAccept! as FuncValidation<string>
          ).validFunc;

          let fxError: FxError;
          try {
            await validate("url1", inputs);
          } catch (e) {
            fxError = e;
          }

          assert.isTrue(fxError!.message.includes("error1"));
        });

        it("list operations without existing APIs", async () => {
          const question = apiSpecLocationQuestion(false);
          const inputs: Inputs = {
            platform: Platform.VSCode,
            "manifest-path": "fakePath",
          };

          sandbox
            .stub(SpecParser.prototype, "validate")
            .resolves({ status: ValidationStatus.Valid, errors: [], warnings: [] });
          sandbox.stub(SpecParser.prototype, "list").resolves(["get operation1", "get operation2"]);
          sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok({} as any));
          sandbox.stub(manifestUtils, "getOperationIds").returns(["get operation1"]);

          const validationSchema = question.validation as FuncValidation<string>;
          const res = await validationSchema.validFunc!("file", inputs);
          assert.deepEqual(inputs.supportedApisFromApiSpec, [
            { id: "get operation2", label: "get operation2", groupName: "GET" },
          ]);
          assert.isUndefined(res);
        });
      });

      describe("openAIPluginManifestLocationQuestion", async () => {
        it("valid openAI plugin manifest spec and list operations successfully", async () => {
          const question = openAIPluginManifestLocationQuestion();
          const inputs: Inputs = {
            platform: Platform.VSCode,
          };
          const manifest = {
            schema_version: "1.0.0",
            api: {
              type: "openapi",
              url: "test",
            },
            auth: { type: "none" },
          };
          const getStub = sandbox.stub(axios, "get").resolves({ status: 200, data: manifest });
          sandbox
            .stub(SpecParser.prototype, "validate")
            .resolves({ status: ValidationStatus.Valid, errors: [], warnings: [] });
          sandbox.stub(SpecParser.prototype, "list").resolves(["operation1", "operation2"]);

          const validationRes = await (question.validation as any).validFunc!("test.com", inputs);
          const additionalValidationRes = await (
            question.additionalValidationOnAccept as any
          ).validFunc("test.com", inputs);

          assert.isUndefined(validationRes);
          assert.isUndefined(additionalValidationRes);
          assert.equal(getStub.firstCall.args[0], "https://test.com/.well-known/ai-plugin.json");
        });

        it("remove ending slash before generating manifest URL and cannot load openAI plugin manifest", async () => {
          const question = openAIPluginManifestLocationQuestion();
          const inputs: Inputs = {
            platform: Platform.VSCode,
            [QuestionNames.OpenAIPluginManifestLocation]: "openAIPluginManifest",
          };
          const manifest = {
            schema_version: "1.0.0",
            api: {
              type: "openapi",
            },
            auth: "oauth",
          };
          const getStub = sandbox.stub(axios, "get").throws(new Error("error1"));
          sandbox
            .stub(SpecParser.prototype, "validate")
            .resolves({ status: ValidationStatus.Valid, errors: [], warnings: [] });
          sandbox.stub(SpecParser.prototype, "list").resolves(["operation1", "operation2"]);

          const res = await (question.additionalValidationOnAccept as any).validFunc(
            "https://test.com/",
            inputs
          );

          assert.isFalse(res === undefined);
          assert.equal(getStub.firstCall.args[0], "https://test.com/.well-known/ai-plugin.json");
        });

        it("invalid openAI plugin manifest spec: missing property", async () => {
          const question = openAIPluginManifestLocationQuestion();
          const inputs: Inputs = {
            platform: Platform.VSCode,
            [QuestionNames.OpenAIPluginManifestLocation]: "openAIPluginManifest",
          };
          const manifest = {
            schema_version: "1.0.0",
          };
          sandbox.stub(axios, "get").resolves({ status: 200, data: manifest });

          const res = await (question.additionalValidationOnAccept as any).validFunc("url", inputs);

          assert.isFalse(res === undefined);
        });

        it("invalid openAI plugin manifest spec -single error", async () => {
          const question = openAIPluginManifestLocationQuestion();
          const inputs: Inputs = {
            platform: Platform.VSCode,
            [QuestionNames.OpenAIPluginManifestLocation]: "openAIPluginManifest",
          };
          const manifest = {
            schema_version: "1.0.0",
            api: {
              type: "openapi",
              url: "test",
            },
            auth: { type: "none" },
          };
          sandbox.stub(axios, "get").resolves({ status: 200, data: manifest });
          sandbox.stub(SpecParser.prototype, "validate").resolves({
            status: ValidationStatus.Error,
            errors: [{ content: "error", type: ErrorType.NoSupportedApi }],
            warnings: [],
          });

          const res = await (question.additionalValidationOnAccept as any).validFunc("url", inputs);

          assert.equal(res, "error");
        });

        it("invalid openAI plugin manifest spec - multiple errors", async () => {
          const question = openAIPluginManifestLocationQuestion();
          const inputs: Inputs = {
            platform: Platform.VSCode,
            [QuestionNames.OpenAIPluginManifestLocation]: "openAIPluginManifest",
          };
          const manifest = {
            schema_version: "1.0.0",
            api: {
              type: "openapi",
              url: "test",
            },
            auth: { type: "none" },
          };
          sandbox.stub(axios, "get").resolves({ status: 200, data: manifest });
          sandbox.stub(SpecParser.prototype, "validate").resolves({
            status: ValidationStatus.Error,
            errors: [
              { content: "error", type: ErrorType.NoSupportedApi },
              { content: "error2", type: ErrorType.MultipleServerInformation },
            ],
            warnings: [],
          });

          const res = await (question.additionalValidationOnAccept as any).validFunc("url", inputs);

          assert.equal(
            res,
            getLocalizedString(
              "core.createProjectQuestion.openAiPluginManifest.multipleValidationErrors.vscode.message"
            )
          );
        });

        it("invalid openAI plugin manifest spec - multiple errors in CLI", async () => {
          const question = openAIPluginManifestLocationQuestion();
          const inputs: Inputs = {
            platform: Platform.CLI,
            [QuestionNames.OpenAIPluginManifestLocation]: "openAIPluginManifest",
          };
          const manifest = {
            schema_version: "1.0.0",
            api: {
              type: "openapi",
              url: "test",
            },
            auth: { type: "none" },
          };
          sandbox.stub(axios, "get").resolves({ status: 200, data: manifest });
          sandbox.stub(SpecParser.prototype, "validate").resolves({
            status: ValidationStatus.Error,
            errors: [
              { content: "error", type: ErrorType.NoSupportedApi },
              { content: "error2", type: ErrorType.MultipleServerInformation },
            ],
            warnings: [],
          });

          const res = await (question.additionalValidationOnAccept as any).validFunc("url", inputs);

          console.log(res);

          assert.equal(res, "error\nerror2");
        });

        describe("validate when changing value", async () => {
          it("valid input - case 1", async () => {
            const question = openAIPluginManifestLocationQuestion();
            const inputs: Inputs = {
              platform: Platform.VSCode,
              [QuestionNames.OpenAIPluginManifestLocation]: "openAIPluginManifest",
            };
            const input = "test.com";
            const validationRes = await (question.validation as any).validFunc!(input, inputs);

            assert.isUndefined(validationRes);
          });

          it("valid input - case 2", async () => {
            const input = "HTTPS://test.com";
            const question = openAIPluginManifestLocationQuestion();
            const inputs: Inputs = {
              platform: Platform.VSCode,
              [QuestionNames.OpenAIPluginManifestLocation]: "openAIPluginManifest",
            };
            const validationRes = await (question.validation as any).validFunc!(input, inputs);

            assert.isUndefined(validationRes);
          });

          it("valid input - case 3", async () => {
            const input = "HTTP://www.test.com";
            const question = openAIPluginManifestLocationQuestion();
            const inputs: Inputs = {
              platform: Platform.VSCode,
              [QuestionNames.OpenAIPluginManifestLocation]: "openAIPluginManifest",
            };
            const validationRes = await (question.validation as any).validFunc!(input, inputs);

            assert.isUndefined(validationRes);
          });

          it("valid input - localhost", async () => {
            const input = "localhost:3000";
            const question = openAIPluginManifestLocationQuestion();
            const inputs: Inputs = {
              platform: Platform.VSCode,
              [QuestionNames.OpenAIPluginManifestLocation]: "openAIPluginManifest",
            };
            const validationRes = await (question.validation as any).validFunc!(input, inputs);

            assert.isUndefined(validationRes);
          });

          it("invalid input", async () => {
            const input = "localhost:";
            const question = openAIPluginManifestLocationQuestion();
            const inputs: Inputs = {
              platform: Platform.VSCode,
              [QuestionNames.OpenAIPluginManifestLocation]: "openAIPluginManifest",
            };
            const validationRes = await (question.validation as any).validFunc!(input, inputs);

            assert.isFalse(validationRes === undefined);
          });

          it("valid input - path", async () => {
            const input = "HTTP://www.test.com/";
            const question = openAIPluginManifestLocationQuestion();
            const inputs: Inputs = {
              platform: Platform.VSCode,
              [QuestionNames.OpenAIPluginManifestLocation]: "openAIPluginManifest",
            };
            const validationRes = await (question.validation as any).validFunc!(input, inputs);

            assert.isUndefined(validationRes);
          });
        });
      });
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
        runtime: RuntimeOptions.DotNet().id,
      });
      assert.isTrue(options.length === 1 && options[0].id === "csharp");
    });

    it("dotnet when TEAMSFX_CLI_DOTNET", async () => {
      mockedEnvRestore = mockedEnv({ TEAMSFX_CLI_DOTNET: "true" });
      const options = getLanguageOptions({
        platform: Platform.CLI,
        runtime: RuntimeOptions.DotNet().id,
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
      assert.equal(template, "taskpane");
    });
  });

  describe("appNameQuestion", () => {
    const question = appNameQuestion();
    const validFunc = (question.validation as FuncValidation<string>).validFunc;
    it("happy path", async () => {
      const inputs: Inputs = { platform: Platform.VSCode, folder: "./" };
      const appName = "1234";
      let validRes = await validFunc(appName, inputs);
      assert.isTrue(validRes === getLocalizedString("core.QuestionAppName.validation.pattern"));
      sandbox.stub<any, any>(fs, "pathExists").resolves(true);
      inputs.appName = randomAppName();
      inputs.folder = "./";
      validRes = await validFunc(inputs.appName, inputs);
      const expected = getLocalizedString(
        "core.QuestionAppName.validation.pathExist",
        path.resolve(inputs.folder, inputs.appName)
      );
      assert.equal(validRes, expected);
      sandbox.restore();
      sandbox.stub<any, any>(fs, "pathExists").resolves(false);
      validRes = await validFunc(inputs.appName, inputs);
      assert.isTrue(validRes === undefined);
    });

    it("app name exceed maxlength of 30", async () => {
      const input = "SurveyMonkeyWebhookNotification";
      const result = await validFunc(input);

      assert.equal(result, getLocalizedString("core.QuestionAppName.validation.maxlength"));
    });

    it("app name with only letters", async () => {
      const input = "app";
      const result = await validFunc(input);

      assert.isUndefined(result);
    });

    it("app name starting with digit", async () => {
      const input = "123app";
      const result = await validFunc(input);

      assert.equal(result, getLocalizedString("core.QuestionAppName.validation.pattern"));
    });

    it("app name count of alphanumerics less than 2", async () => {
      const input = "a..(";
      const result = await validFunc(input);

      assert.equal(result, getLocalizedString("core.QuestionAppName.validation.pattern"));
    });

    it("app name containing dot", async () => {
      const input = "app.123";
      const result = await validFunc(input);

      assert.isUndefined(result);
    });

    it("app name containing hyphen", async () => {
      const input = "app-123";
      const result = await validFunc(input);

      assert.isUndefined(result);
    });

    it("app name containing multiple special characters", async () => {
      const input = "a..(1";
      const result = await validFunc(input);

      assert.isUndefined(result);
    });

    it("app name containing space", async () => {
      const input = "app 123";
      const result = await validFunc(input);

      assert.isUndefined(result);
    });

    it("app name containing dot at the end - wrong pattern", async () => {
      const input = "app.app.";
      const result = await validFunc(input);

      assert.equal(result, getLocalizedString("core.QuestionAppName.validation.pattern"));
    });

    it("app name containing space at the end - wrong pattern", async () => {
      const input = "app123 ";
      const result = await validFunc(input);

      assert.equal(result, getLocalizedString("core.QuestionAppName.validation.pattern"));
    });

    it("app name containing invalid control code", async () => {
      const input = "a\u0001a";
      const result = await validFunc(input);

      assert.equal(result, getLocalizedString("core.QuestionAppName.validation.pattern"));
    });

    it("app name containing invalid character", async () => {
      const input = "app<>123";
      const result = await validFunc(input);

      assert.equal(result, getLocalizedString("core.QuestionAppName.validation.pattern"));
    });

    it("invalid app name containing &", async () => {
      const input = "app&123";
      const result = await validFunc(input);

      assert.equal(result, getLocalizedString("core.QuestionAppName.validation.pattern"));
    });
  });

  describe("CapabilityOptions", () => {
    it("has 3 options in message extension type", () => {
      // Act
      const options = CapabilityOptions.mes();
      // Assert
      assert.equal(options.length, 3);
      assert.deepEqual(options, [
        CapabilityOptions.linkUnfurling(),
        CapabilityOptions.m365SearchMe(),
        CapabilityOptions.collectFormMe(),
      ]);
    });
  });

  describe("programmingLanguageQuestion", () => {
    const question = programmingLanguageQuestion();
    it("office addin: should have typescript as options", async () => {
      const inputs: Inputs = { platform: Platform.CLI };
      inputs[QuestionNames.Capabilities] = ["taskpane"];
      inputs[QuestionNames.ProjectType] = ProjectTypeOptions.outlookAddin().id;
      assert.isDefined(question.dynamicOptions);
      if (question.dynamicOptions) {
        const options = await question.dynamicOptions(inputs);
        assert.deepEqual(options, [{ label: "TypeScript", id: "TypeScript" }]);
      }
    });

    it("office addin: should default to TypeScript for taskpane projects", async () => {
      const inputs: Inputs = { platform: Platform.CLI };
      inputs[QuestionNames.Capabilities] = ["taskpane"];
      inputs[QuestionNames.ProjectType] = ProjectTypeOptions.outlookAddin().id;
      assert.isDefined(question.default);
      const lang = await (question.default as LocalFunc<string | undefined>)(inputs);
      assert.equal(lang, "TypeScript");
    });

    it("SPFxTab", async () => {
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [QuestionNames.Capabilities]: CapabilityOptions.SPFxTab().id,
      };
      if (
        question.dynamicOptions &&
        question.placeholder &&
        typeof question.placeholder === "function"
      ) {
        const options = question.dynamicOptions(inputs);
        assert.deepEqual([{ id: "typescript", label: "TypeScript" }], options);
        const placeholder = question.placeholder(inputs);
        assert.equal("SPFx is currently supporting TypeScript only.", placeholder);
      }

      languageAssert({
        platform: Platform.VSCode,
        [QuestionNames.Capabilities]: CapabilityOptions.tab().id,
      });
      languageAssert({
        platform: Platform.VSCode,
        [QuestionNames.Capabilities]: CapabilityOptions.basicBot().id,
      });
      languageAssert({
        platform: Platform.VSCode,
        [QuestionNames.Capabilities]: CapabilityOptions.me().id,
      });

      function languageAssert(inputs: Inputs) {
        if (
          question.dynamicOptions &&
          question.placeholder &&
          typeof question.placeholder === "function"
        ) {
          const options = question.dynamicOptions(inputs);
          assert.deepEqual(
            [
              { id: "javascript", label: "JavaScript" },
              { id: "typescript", label: "TypeScript" },
            ],
            options
          );
          const placeholder = question.placeholder(inputs);
          assert.equal("Select a programming language.", placeholder);
        }
      }
    });
  });

  describe("getTemplate", () => {
    it("should find taskpane template", () => {
      const inputs: Inputs = {
        platform: Platform.CLI,
      };
      inputs[QuestionNames.Capabilities] = ["taskpane"];
      const template = getTemplate(inputs);
      assert.equal(template, "taskpane");
    });
  });

  describe("folderQuestion", () => {
    it("should find taskpane template", () => {
      const inputs: Inputs = {
        platform: Platform.CLI,
      };
      const question = folderQuestion() as any;
      const title = question.title(inputs);
      const defaultV = question.default(inputs);
      assert.equal(title, "Directory where the project folder will be created in");
      assert.equal(defaultV, "./");
    });
  });
});
