import "mocha";

import { err, Inputs, ok, Platform, SystemError, UserError } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import { glob } from "glob";
import * as sinon from "sinon";
import { createContext, setTools } from "../../../src/common/globalVars";
import { MetadataV3 } from "../../../src/common/versionMetadata";
import { coordinator } from "../../../src/component/coordinator";
import { developerPortalScaffoldUtils } from "../../../src/component/developerPortalScaffoldUtils";
import { AppDefinition } from "../../../src/component/driver/teamsApp/interfaces/appdefinitions/appDefinition";
import { CopilotPluginGenerator as oldCopilotGenerator } from "../../../src/component/generator/oldCopilotGenerator";
import { Generator } from "../../../src/component/generator/generator";
import {
  OfficeAddinGenerator,
  OfficeAddinGeneratorNew,
} from "../../../src/component/generator/officeAddin/generator";
import { SPFxGenerator } from "../../../src/component/generator/spfx/spfxGenerator";
import { DefaultTemplateGenerator } from "../../../src/component/generator/templates/templateGenerator";
import { CopilotPluginGenerator } from "../../../src/component/generator/copilotPlugin/generator";
import { TemplateNames } from "../../../src/component/generator/templates/templateNames";
import { settingsUtil } from "../../../src/component/utils/settingsUtil";
import { FxCore } from "../../../src/core/FxCore";
import { InputValidationError, MissingRequiredInputError } from "../../../src/error/common";
import { CreateSampleProjectInputs } from "../../../src/question";
import {
  ApiAuthOptions,
  CapabilityOptions,
  CustomCopilotAssistantOptions,
  CustomCopilotRagOptions,
  MeArchitectureOptions,
  ProjectTypeOptions,
  QuestionNames,
  ScratchOptions,
} from "../../../src/question/constants";
import { validationUtils } from "../../../src/ui/validationUtils";
import { MockTools, randomAppName } from "../../core/utils";
import { MockedUserInteraction } from "../../plugins/solution/util";
import mockedEnv, { RestoreFn } from "mocked-env";

const V3Version = MetadataV3.projectVersion;

[false].forEach((newGeneratorFlag) => {
  describe(`coordinator create with new generator enabled = ${newGeneratorFlag}`, () => {
    let mockedEnvRestore: RestoreFn = () => {};
    const sandbox = sinon.createSandbox();
    const tools = new MockTools();
    let generator: sinon.SinonStub;
    setTools(tools);
    beforeEach(() => {
      sandbox.stub(fs, "ensureDir").resolves();
      mockedEnvRestore = mockedEnv({ TEAMSFX_NEW_GENERATOR: `${newGeneratorFlag}` });
      generator = newGeneratorFlag
        ? sandbox
            .stub(DefaultTemplateGenerator.prototype, <any>"scaffolding")
            .resolves(ok(undefined))
        : sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    });
    afterEach(() => {
      sandbox.restore();
      mockedEnvRestore();
    });

    it("create project from sample", async () => {
      sandbox.stub(Generator, "generateSample").resolves(ok(undefined));
      sandbox
        .stub(settingsUtil, "readSettings")
        .resolves(ok({ trackingId: "mockId", version: V3Version }));
      sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
      const inputs: CreateSampleProjectInputs = {
        platform: Platform.CLI,
        folder: ".",
        samples: "hello-world-tab-with-backend",
      };
      const fxCore = new FxCore(tools);
      const res = await fxCore.createSampleProject(inputs);
      assert.isTrue(res.isOk());
    });

    it("create project from sample: todo-list-SPFx", async () => {
      sandbox.stub(Generator, "generateSample").resolves(ok(undefined));
      sandbox
        .stub(settingsUtil, "readSettings")
        .resolves(ok({ trackingId: "mockId", version: V3Version }));
      sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
      sandbox.stub(glob, "glob").resolves();
      sandbox.stub(fs, "readFile").resolves("test" as any);
      sandbox.stub(fs, "writeFile").resolves("");
      const inputs: CreateSampleProjectInputs = {
        platform: Platform.CLI,
        folder: ".",
        samples: "todo-list-SPFx",
      };
      const fxCore = new FxCore(tools);
      const res = await fxCore.createSampleProject(inputs);
      assert.isTrue(res.isOk());
    });

    it("fail to create project from sample", async () => {
      sandbox.stub(Generator, "generateSample").resolves(err(new UserError({})));
      sandbox
        .stub(settingsUtil, "readSettings")
        .resolves(ok({ trackingId: "mockId", version: V3Version }));
      sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
      const inputs: CreateSampleProjectInputs = {
        platform: Platform.CLI,
        folder: ".",
        samples: "hello-world-tab-with-backend",
      };
      const fxCore = new FxCore(tools);
      const res = await fxCore.createSampleProject(inputs);
      assert.isTrue(res.isErr());
    });
    it("create project from sample rename folder", async () => {
      sandbox.stub(Generator, "generateSample").resolves(ok(undefined));
      sandbox
        .stub(settingsUtil, "readSettings")
        .resolves(ok({ trackingId: "mockId", version: V3Version }));
      sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
      sandbox.stub(fs, "pathExists").onFirstCall().resolves(true).onSecondCall().resolves(false);
      sandbox
        .stub(fs, "readdir")
        .onFirstCall()
        .resolves(["abc"] as any)
        .onSecondCall()
        .resolves([]);
      const inputs: CreateSampleProjectInputs = {
        platform: Platform.CLI,
        folder: ".",
        samples: "hello-world-tab-with-backend",
      };
      const fxCore = new FxCore(tools);
      const res = await fxCore.createSampleProject(inputs);
      assert.isTrue(res.isOk());
      if (res.isOk()) {
        assert.isTrue(res.value.projectPath.endsWith("_1"));
      }
    });
    it("create project from scratch", async () => {
      sandbox.stub(Generator, "generateSample").resolves(ok(undefined));
      sandbox
        .stub(settingsUtil, "readSettings")
        .resolves(ok({ trackingId: "mockId", version: V3Version }));
      sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
      const inputs: Inputs = {
        platform: Platform.VSCode,
        folder: ".",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.Capabilities]: CapabilityOptions.basicBot().id,
        [QuestionNames.ProgrammingLanguage]: "javascript",
      };
      const fxCore = new FxCore(tools);
      const res2 = await fxCore.createProject(inputs);
      assert.isTrue(res2.isOk());
    });
    it("create project from scratch MissingRequiredInputError missing folder", async () => {
      const inputs: Inputs = {
        platform: Platform.VSCode,
        ignoreLockByUT: true,
      };
      const context = createContext();
      const res = await coordinator.create(context, inputs);
      assert.isTrue(res.isErr());
      if (res.isErr()) {
        assert.isTrue(res.error instanceof MissingRequiredInputError);
      }
    });
    it("create project from scratch MissingRequiredInputError missing App name", async () => {
      const inputs: Inputs = {
        platform: Platform.VSCode,
        ignoreLockByUT: true,
        folder: ".",
      };
      const context = createContext();
      const res = await coordinator.create(context, inputs);
      assert.isTrue(res.isErr());
      if (res.isErr()) {
        assert.isTrue(res.error instanceof MissingRequiredInputError);
      }
    });
    it("create project from scratch MissingRequiredInputError invalid App name", async () => {
      const inputs: Inputs = {
        platform: Platform.VSCode,
        ignoreLockByUT: true,
        folder: ".",
        "app-name": "__#$%___",
      };
      const context = createContext();
      const res = await coordinator.create(context, inputs);
      assert.isTrue(res.isErr());
      if (res.isErr()) {
        assert.isTrue(res.error instanceof InputValidationError);
      }
    });
    it("create project for new office Addin MissingRequiredInputError missing App name", async () => {
      const inputs: Inputs = {
        platform: Platform.VSCode,
        ignoreLockByUT: true,
        folder: ".",
        [QuestionNames.Scratch]: ScratchOptions.yes().id,
        [QuestionNames.ProjectType]: ProjectTypeOptions.outlookAddin().id,
      };
      const context = createContext();
      const res = await coordinator.create(context, inputs);
      assert.isTrue(res.isErr());
      if (res.isErr()) {
        assert.isTrue(res.error instanceof MissingRequiredInputError);
      }
    });
    it("create project for new office Addin MissingRequiredInputError invalid App name", async () => {
      const inputs: Inputs = {
        platform: Platform.VSCode,
        ignoreLockByUT: true,
        folder: ".",
        [QuestionNames.Scratch]: ScratchOptions.yes().id,
        [QuestionNames.ProjectType]: ProjectTypeOptions.outlookAddin().id,
        "app-name": "__#$%___",
      };
      const context = createContext();
      const res = await coordinator.create(context, inputs);
      assert.isTrue(res.isErr());
      if (res.isErr()) {
        assert.isTrue(res.error instanceof InputValidationError);
      }
    });
    it("create project for new office JSON Addin MissingRequiredInputError missing App name", async () => {
      const inputs: Inputs = {
        platform: Platform.VSCode,
        ignoreLockByUT: true,
        folder: ".",
        [QuestionNames.Scratch]: ScratchOptions.yes().id,
        [QuestionNames.ProjectType]: ProjectTypeOptions.officeAddin().id,
      };
      const context = createContext();
      const res = await coordinator.create(context, inputs);
      assert.isTrue(res.isErr());
      if (res.isErr()) {
        assert.isTrue(res.error instanceof MissingRequiredInputError);
      }
    });
    it("create project for new office JSON Addin MissingRequiredInputError invalid App name", async () => {
      const inputs: Inputs = {
        platform: Platform.VSCode,
        ignoreLockByUT: true,
        folder: ".",
        [QuestionNames.Scratch]: ScratchOptions.yes().id,
        [QuestionNames.ProjectType]: ProjectTypeOptions.officeAddin().id,
        "app-name": "__#$%___",
      };
      const context = createContext();
      const res = await coordinator.create(context, inputs);
      assert.isTrue(res.isErr());
      if (res.isErr()) {
        assert.isTrue(res.error instanceof InputValidationError);
      }
    });
    it("create project from sample MissingRequiredInputError missing sample id", async () => {
      const inputs: Inputs = {
        platform: Platform.CLI,
        ignoreLockByUT: true,
        folder: ".",
        [QuestionNames.Scratch]: ScratchOptions.no().id,
      };
      const context = createContext();
      const res = await coordinator.create(context, inputs);
      assert.isTrue(res.isErr());
      if (res.isErr()) {
        assert.isTrue(res.error instanceof MissingRequiredInputError);
      }
    });
    it("fail to create SPFx project", async () => {
      sandbox.stub(SPFxGenerator, "generate").resolves(err(new UserError({})));
      sandbox
        .stub(settingsUtil, "readSettings")
        .resolves(ok({ trackingId: "mockId", version: V3Version }));
      sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
      const inputs: Inputs = {
        platform: Platform.VSCode,
        folder: ".",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.Capabilities]: CapabilityOptions.SPFxTab().id,
        [QuestionNames.ProgrammingLanguage]: "javascript",
        [QuestionNames.SPFxSolution]: "new",
        [QuestionNames.SPFxFramework]: "none",
        [QuestionNames.SPFxWebpartName]: "test",
      };
      const fxCore = new FxCore(tools);
      const res2 = await fxCore.createProject(inputs);
      assert.isTrue(res2.isErr());
    });

    it("create SPFx project", async () => {
      sandbox.stub(SPFxGenerator, "generate").resolves(ok(undefined));
      sandbox
        .stub(settingsUtil, "readSettings")
        .resolves(ok({ trackingId: "mockId", version: V3Version }));
      sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
      const inputs: Inputs = {
        platform: Platform.VSCode,
        folder: ".",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.Capabilities]: CapabilityOptions.SPFxTab().id,
        [QuestionNames.ProgrammingLanguage]: "typescript",
        [QuestionNames.SPFxSolution]: "new",
        [QuestionNames.SPFxFramework]: "none",
        [QuestionNames.SPFxWebpartName]: "test",
      };
      const fxCore = new FxCore(tools);
      const res2 = await fxCore.createProject(inputs);
      assert.isTrue(res2.isOk());
    });

    it("create project from VS", async () => {
      sandbox.stub(Generator, "generateSample").resolves(ok(undefined));
      sandbox
        .stub(settingsUtil, "readSettings")
        .resolves(ok({ trackingId: "mockId", version: V3Version }));
      sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
      const inputs: Inputs = {
        platform: Platform.VS,
        folder: ".",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.Capabilities]: CapabilityOptions.tab().id,
        [QuestionNames.ProgrammingLanguage]: "csharp",
        [QuestionNames.SafeProjectName]: "safeprojectname",
      };
      const fxCore = new FxCore(tools);
      const res2 = await fxCore.createProject(inputs);
      assert.isTrue(res2.isOk());
    });

    it("create notification bot project from VS", async () => {
      sandbox.stub(Generator, "generateSample").resolves(ok(undefined));
      sandbox
        .stub(settingsUtil, "readSettings")
        .resolves(ok({ trackingId: "mockId", version: V3Version }));
      sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
      const inputs: Inputs = {
        platform: Platform.VS,
        folder: ".",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.Capabilities]: CapabilityOptions.notificationBot().id,
        [QuestionNames.BotTrigger]: "http-functions",
        [QuestionNames.ProgrammingLanguage]: "csharp",
        [QuestionNames.SafeProjectName]: "safeprojectname",
        isIsolated: true,
      };
      const fxCore = new FxCore(tools);
      const res2 = await fxCore.createProject(inputs);
      assert.isTrue(res2.isOk());
    });

    it("create m365 project from scratch", async () => {
      sandbox.stub(Generator, "generateSample").resolves(ok(undefined));
      sandbox
        .stub(settingsUtil, "readSettings")
        .resolves(ok({ trackingId: "mockId", version: V3Version }));
      sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
      const inputs: Inputs = {
        platform: Platform.VSCode,
        folder: ".",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.Capabilities]: CapabilityOptions.m365SsoLaunchPage().id,
        [QuestionNames.ProgrammingLanguage]: "typescript",
      };
      const fxCore = new FxCore(tools);
      const res2 = await fxCore.createProject(inputs);
      assert.isTrue(res2.isOk());
      assert.isTrue(inputs.isM365);
    });

    it("create project for app with tab features from Developer Portal", async () => {
      sandbox
        .stub(settingsUtil, "readSettings")
        .resolves(ok({ trackingId: "mockId", version: V3Version }));
      sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
      sandbox.stub(developerPortalScaffoldUtils, "updateFilesForTdp").resolves(ok(undefined));
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
      };

      const inputs: Inputs = {
        platform: Platform.VSCode,
        folder: ".",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.ProgrammingLanguage]: "javascript",
        teamsAppFromTdp: appDefinition,
        [QuestionNames.ProjectType]: "tab-type",
        [QuestionNames.Capabilities]: CapabilityOptions.nonSsoTab().id,
        [QuestionNames.ReplaceWebsiteUrl]: ["tab1"],
        [QuestionNames.ReplaceContentUrl]: [],
      };
      const fxCore = new FxCore(tools);
      const res2 = await fxCore.createProject(inputs);

      assert.isTrue(res2.isOk());
      newGeneratorFlag
        ? assert.equal(generator.args[0][1].templateName, TemplateNames.Tab)
        : assert.equal(generator.args[0][2], TemplateNames.Tab);
    });

    it("create project for app with bot feature from Developer Portal with updating files failed", async () => {
      sandbox
        .stub(settingsUtil, "readSettings")
        .resolves(ok({ trackingId: "mockId", version: V3Version }));
      sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
      sandbox
        .stub(developerPortalScaffoldUtils, "updateFilesForTdp")
        .resolves(err(new UserError("coordinator", "error", "msg", "msg")));
      const appDefinition: AppDefinition = {
        teamsAppId: "mock-id",
        appId: "mock-id",
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
        folder: ".",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.ProgrammingLanguage]: "javascript",
        [QuestionNames.ProjectType]: ProjectTypeOptions.bot().id,
        [QuestionNames.Capabilities]: CapabilityOptions.basicBot().id,
        [QuestionNames.ReplaceBotIds]: ["bot"],
        teamsAppFromTdp: appDefinition,
      };
      const fxCore = new FxCore(tools);
      const res = await fxCore.createProject(inputs);

      assert.isTrue(res.isErr());
      if (res.isErr()) {
        assert.equal(res.error.name, "error");
      }
      newGeneratorFlag
        ? assert.equal(generator.args[0][1].templateName, TemplateNames.DefaultBot)
        : assert.equal(generator.args[0][2], TemplateNames.DefaultBot);
    });

    it("create project for app with tab and bot features from Developer Portal", async () => {
      sandbox
        .stub(settingsUtil, "readSettings")
        .resolves(ok({ trackingId: "mockId", version: V3Version }));
      sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
      sandbox.stub(developerPortalScaffoldUtils, "updateFilesForTdp").resolves(ok(undefined));
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
        folder: ".",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.ProgrammingLanguage]: "javascript",
        teamsAppFromTdp: appDefinition,
        [QuestionNames.ProjectType]: "tab-bot-type",
        [QuestionNames.Capabilities]: "TabNonSsoAndBot",
        [QuestionNames.ReplaceWebsiteUrl]: ["tab1"],
        [QuestionNames.ReplaceContentUrl]: [],
        [QuestionNames.ReplaceBotIds]: ["bot"],
      };
      const fxCore = new FxCore(tools);
      const res2 = await fxCore.createProject(inputs);

      if (res2.isErr()) {
        console.log(res2.error);
      }
      assert.isTrue(res2.isOk());
      assert.isTrue(generator.calledOnce);
      newGeneratorFlag
        ? assert.equal(generator.args[0][1].templateName, TemplateNames.TabAndDefaultBot)
        : assert.equal(generator.args[0][2], TemplateNames.TabAndDefaultBot);
    });

    it("create project for app with tab and message extension features from Developer Portal", async () => {
      sandbox
        .stub(settingsUtil, "readSettings")
        .resolves(ok({ trackingId: "mockId", version: V3Version }));
      sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
      sandbox.stub(developerPortalScaffoldUtils, "updateFilesForTdp").resolves(ok(undefined));
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
        messagingExtensions: [
          {
            botId: "mock-bot-id",
            canUpdateConfiguration: false,
            commands: [],
            messageHandlers: [],
          },
        ],
      };

      const inputs: Inputs = {
        platform: Platform.VSCode,
        folder: ".",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.ProgrammingLanguage]: "javascript",
        teamsAppFromTdp: appDefinition,
        [QuestionNames.ProjectType]: "tab-bot-type",
        [QuestionNames.Capabilities]: "TabNonSsoAndBot",
        [QuestionNames.ReplaceWebsiteUrl]: ["tab1"],
        [QuestionNames.ReplaceContentUrl]: [],
        [QuestionNames.ReplaceBotIds]: ["messageExtension"],
      };
      const fxCore = new FxCore(tools);
      const res2 = await fxCore.createProject(inputs);

      if (res2.isErr()) {
        console.log(res2.error);
      }
      assert.isTrue(res2.isOk());
      assert.isTrue(generator.calledOnce);
      newGeneratorFlag
        ? assert.equal(generator.args[0][1].templateName, TemplateNames.TabAndDefaultBot)
        : assert.equal(generator.args[0][2], TemplateNames.TabAndDefaultBot);
    });

    it("create project for app with no features from Developer Portal - failed expecting inputs", async () => {
      sandbox
        .stub(settingsUtil, "readSettings")
        .resolves(ok({ trackingId: "mockId", version: V3Version }));
      sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
      sandbox.stub(developerPortalScaffoldUtils, "updateFilesForTdp").resolves(ok(undefined));
      const appDefinition: AppDefinition = {
        teamsAppId: "mock-id",
        appId: "mock-id",
        staticTabs: [],
      };

      const inputs: Inputs = {
        platform: Platform.VSCode,
        folder: ".",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.ProgrammingLanguage]: "javascript",
        teamsAppFromTdp: appDefinition,
      };
      const fxCore = new FxCore(tools);
      const res2 = await fxCore.createProject(inputs);
      assert.isTrue(res2.isErr());
    });

    it("create project for app from Developer Portal - not overwrite already set project type and capability", async () => {
      sandbox
        .stub(settingsUtil, "readSettings")
        .resolves(ok({ trackingId: "mockId", version: V3Version }));
      sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
      sandbox.stub(developerPortalScaffoldUtils, "updateFilesForTdp").resolves(ok(undefined));
      const appDefinition: AppDefinition = {
        teamsAppId: "mock-id",
        appId: "mock-id",
      };

      const inputs: Inputs = {
        platform: Platform.VSCode,
        folder: ".",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.ProgrammingLanguage]: "javascript",
        teamsAppFromTdp: appDefinition,
        [QuestionNames.ReplaceWebsiteUrl]: ["tab1"],
        [QuestionNames.ReplaceContentUrl]: [],
        [QuestionNames.ProjectType]: ProjectTypeOptions.tab().id,
        [QuestionNames.Capabilities]: CapabilityOptions.nonSsoTab().id,
      };
      const fxCore = new FxCore(tools);
      const res2 = await fxCore.createProject(inputs);

      assert.isTrue(res2.isOk());
      newGeneratorFlag
        ? assert.equal(generator.args[0][1].templateName, TemplateNames.Tab)
        : assert.equal(generator.args[0][2], TemplateNames.Tab);
    });

    it("create API ME (no auth) from new api sucessfully", async () => {
      const v3ctx = createContext();
      v3ctx.userInteraction = new MockedUserInteraction();

      const inputs: Inputs = {
        platform: Platform.VSCode,
        folder: ".",
        [QuestionNames.ProjectType]: ProjectTypeOptions.me().id,
        [QuestionNames.Capabilities]: CapabilityOptions.m365SearchMe().id,
        [QuestionNames.MeArchitectureType]: MeArchitectureOptions.newApi().id,
        [QuestionNames.ApiAuth]: ApiAuthOptions.none().id,
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.Scratch]: ScratchOptions.yes().id,
      };
      const res = await coordinator.create(v3ctx, inputs);
      assert.isTrue(res.isOk());
      newGeneratorFlag
        ? assert.equal(generator.args[0][1].templateName, TemplateNames.CopilotPluginFromScratch)
        : assert.equal(generator.args[0][2], TemplateNames.CopilotPluginFromScratch);
    });

    it("create API ME (key auth) from new api sucessfully", async () => {
      const v3ctx = createContext();
      v3ctx.userInteraction = new MockedUserInteraction();

      const inputs: Inputs = {
        platform: Platform.VSCode,
        folder: ".",
        [QuestionNames.ProjectType]: ProjectTypeOptions.me().id,
        [QuestionNames.Capabilities]: CapabilityOptions.m365SearchMe().id,
        [QuestionNames.MeArchitectureType]: MeArchitectureOptions.newApi().id,
        [QuestionNames.ApiAuth]: ApiAuthOptions.apiKey().id,
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.Scratch]: ScratchOptions.yes().id,
      };
      const res = await coordinator.create(v3ctx, inputs);
      assert.isTrue(res.isOk());
      newGeneratorFlag
        ? assert.equal(
            generator.args[0][1].templateName,
            TemplateNames.CopilotPluginFromScratchApiKey
          )
        : assert.equal(generator.args[0][2], TemplateNames.CopilotPluginFromScratchApiKey);
    });

    it("create API ME from existing api sucessfully", async () => {
      const v3ctx = createContext();
      v3ctx.userInteraction = new MockedUserInteraction();

      sandbox
        .stub(oldCopilotGenerator, "generateMeFromApiSpec")
        .resolves(ok({ warnings: [{ type: "", content: "", data: {} } as any] }));

      const inputs: Inputs = {
        platform: Platform.VSCode,
        folder: ".",
        [QuestionNames.ProjectType]: ProjectTypeOptions.me().id,
        [QuestionNames.Capabilities]: CapabilityOptions.m365SearchMe().id,
        [QuestionNames.MeArchitectureType]: MeArchitectureOptions.apiSpec().id,
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.Scratch]: ScratchOptions.yes().id,
      };
      const res = await coordinator.create(v3ctx, inputs);
      assert.isTrue(res.isOk());
    });

    it("create non-sso tab earlier than .Net8", async () => {
      const inputs: Inputs = {
        platform: Platform.VS,
        folder: ".",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.ProgrammingLanguage]: "csharp",
        [QuestionNames.SafeProjectName]: "safeprojectname",
        ["targetFramework"]: "net6.0",
        [QuestionNames.ProjectType]: ProjectTypeOptions.tab().id,
        [QuestionNames.Capabilities]: CapabilityOptions.nonSsoTab().id,
      };
      const fxCore = new FxCore(tools);
      const res = await fxCore.createProject(inputs);

      assert.isTrue(res.isOk());
      newGeneratorFlag
        ? assert.equal(generator.args[0][1].templateName, TemplateNames.Tab)
        : assert.equal(generator.args[0][2], TemplateNames.Tab);
    });

    it("create sso tab earlier than .Net8", async () => {
      const inputs: Inputs = {
        platform: Platform.VS,
        folder: ".",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.ProgrammingLanguage]: "csharp",
        [QuestionNames.SafeProjectName]: "safeprojectname",
        ["targetFramework"]: "net6.0",
        [QuestionNames.ProjectType]: ProjectTypeOptions.tab().id,
        [QuestionNames.Capabilities]: CapabilityOptions.tab().id,
      };
      const fxCore = new FxCore(tools);
      const res = await fxCore.createProject(inputs);

      assert.isTrue(res.isOk());
      newGeneratorFlag
        ? assert.equal(generator.args[0][1].templateName, TemplateNames.SsoTab)
        : assert.equal(generator.args[0][2], TemplateNames.SsoTab);
    });

    it("create non-sso tab from .NET 8", async () => {
      const inputs: Inputs = {
        platform: Platform.VS,
        folder: ".",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.ProgrammingLanguage]: "csharp",
        [QuestionNames.SafeProjectName]: "safeprojectname",
        ["targetFramework"]: "net8.0",
        [QuestionNames.ProjectType]: ProjectTypeOptions.tab().id,
        [QuestionNames.Capabilities]: CapabilityOptions.nonSsoTab().id,
      };
      const fxCore = new FxCore(tools);
      const res = await fxCore.createProject(inputs);

      assert.isTrue(res.isOk());
      newGeneratorFlag
        ? assert.equal(generator.args[0][1].templateName, TemplateNames.TabSSR)
        : assert.equal(generator.args[0][2], TemplateNames.TabSSR);
    });

    it("create sso tab from .NET 8", async () => {
      const inputs: Inputs = {
        platform: Platform.VS,
        folder: ".",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.ProgrammingLanguage]: "csharp",
        [QuestionNames.SafeProjectName]: "safeprojectname",
        ["targetFramework"]: "net8.0",
        [QuestionNames.ProjectType]: ProjectTypeOptions.tab().id,
        [QuestionNames.Capabilities]: CapabilityOptions.tab().id,
      };
      const fxCore = new FxCore(tools);
      const res = await fxCore.createProject(inputs);

      assert.isTrue(res.isOk());
      newGeneratorFlag
        ? assert.equal(generator.args[0][1].templateName, TemplateNames.SsoTabSSR)
        : assert.equal(generator.args[0][2], TemplateNames.SsoTabSSR);
    });

    it("create custom copilot rag custom api success", async () => {
      const inputs: Inputs = {
        platform: Platform.VSCode,
        folder: ".",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.ProgrammingLanguage]: "typescript",
        [QuestionNames.SafeProjectName]: "safeprojectname",
        [QuestionNames.ProjectType]: ProjectTypeOptions.customCopilot().id,
        [QuestionNames.Capabilities]: CapabilityOptions.customCopilotRag().id,
        [QuestionNames.CustomCopilotRag]: CustomCopilotRagOptions.customApi().id,
        [QuestionNames.ApiSpecLocation]: "spec",
        [QuestionNames.ApiOperation]: "test",
        [QuestionNames.LLMService]: "llm-service-openAI",
        [QuestionNames.OpenAIKey]: "mockedopenaikey",
      };
      sandbox.stub(oldCopilotGenerator, "generateForCustomCopilotRagCustomApi").resolves(ok({}));
      sandbox.stub(validationUtils, "validateInputs").resolves(undefined);

      const fxCore = new FxCore(tools);
      const res = await fxCore.createProject(inputs);

      assert.isTrue(res.isOk());
      newGeneratorFlag
        ? assert.equal(generator.args[0][1].templateName, TemplateNames.CustomCopilotRagCustomApi)
        : assert.equal(generator.args[0][2], TemplateNames.CustomCopilotRagCustomApi);
    });

    it("create custom copilot rag custom api with azure open ai success", async () => {
      const inputs: Inputs = {
        platform: Platform.VSCode,
        folder: ".",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.ProgrammingLanguage]: "typescript",
        [QuestionNames.SafeProjectName]: "safeprojectname",
        [QuestionNames.ProjectType]: ProjectTypeOptions.customCopilot().id,
        [QuestionNames.Capabilities]: CapabilityOptions.customCopilotRag().id,
        [QuestionNames.CustomCopilotRag]: CustomCopilotRagOptions.customApi().id,
        [QuestionNames.ApiSpecLocation]: "spec",
        [QuestionNames.ApiOperation]: "test",
        [QuestionNames.LLMService]: "llm-service-azure-openai",
        [QuestionNames.AzureOpenAIKey]: "mockedAzureOpenAIKey",
        [QuestionNames.AzureOpenAIEndpoint]: "mockedAzureOpenAIEndpoint",
        [QuestionNames.AzureOpenAIDeploymentName]: "mockedAzureOpenAIDeploymentName",
      };
      sandbox.stub(oldCopilotGenerator, "generateForCustomCopilotRagCustomApi").resolves(ok({}));
      sandbox.stub(validationUtils, "validateInputs").resolves(undefined);

      const fxCore = new FxCore(tools);
      const res = await fxCore.createProject(inputs);

      assert.isTrue(res.isOk());
      newGeneratorFlag
        ? assert.equal(generator.args[0][1].templateName, TemplateNames.CustomCopilotRagCustomApi)
        : assert.equal(generator.args[0][2], TemplateNames.CustomCopilotRagCustomApi);
    });

    it("create custom agent api with azure open ai success", async () => {
      const inputs: Inputs = {
        platform: Platform.VSCode,
        folder: ".",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.ProgrammingLanguage]: "typescript",
        [QuestionNames.SafeProjectName]: "safeprojectname",
        [QuestionNames.ProjectType]: ProjectTypeOptions.customCopilot().id,
        [QuestionNames.Capabilities]: CapabilityOptions.customCopilotAssistant().id,
        [QuestionNames.CustomCopilotAssistant]: CustomCopilotAssistantOptions.new().id,
        [QuestionNames.ApiSpecLocation]: "spec",
        [QuestionNames.ApiOperation]: "test",
        [QuestionNames.AzureOpenAIKey]: "mockedAzureOpenAIKey",
        [QuestionNames.AzureOpenAIEndpoint]: "mockedAzureOpenAIEndpoint",
        [QuestionNames.AzureOpenAIDeploymentName]: "mockedAzureOpenAIDeploymentName",
      };
      sandbox.stub(oldCopilotGenerator, "generateForCustomCopilotRagCustomApi").resolves(ok({}));
      sandbox.stub(validationUtils, "validateInputs").resolves(undefined);

      const fxCore = new FxCore(tools);
      const res = await fxCore.createProject(inputs);

      assert.isTrue(res.isOk());
      newGeneratorFlag
        ? assert.equal(generator.args[0][1].templateName, TemplateNames.CustomCopilotAssistantNew)
        : assert.equal(generator.args[0][2], TemplateNames.CustomCopilotAssistantNew);
    });

    it("create custom copilot rag custom api failed", async () => {
      const inputs: Inputs = {
        platform: Platform.VSCode,
        folder: ".",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.ProgrammingLanguage]: "typescript",
        [QuestionNames.SafeProjectName]: "safeprojectname",
        [QuestionNames.ProjectType]: ProjectTypeOptions.customCopilot().id,
        [QuestionNames.Capabilities]: CapabilityOptions.customCopilotRag().id,
        [QuestionNames.CustomCopilotRag]: CustomCopilotRagOptions.customApi().id,
        [QuestionNames.ApiSpecLocation]: "spec",
        [QuestionNames.ApiOperation]: "test",
        [QuestionNames.LLMService]: "llm-service-openAI",
        [QuestionNames.OpenAIKey]: "mockedopenaikey",
      };
      sandbox
        .stub(oldCopilotGenerator, "generateForCustomCopilotRagCustomApi")
        .resolves(err(new SystemError("test", "test", "test")));
      sandbox.stub(validationUtils, "validateInputs").resolves(undefined);

      const fxCore = new FxCore(tools);
      const res = await fxCore.createProject(inputs);

      assert.isTrue(res.isErr() && res.error.name === "test");
    });

    it("create API Plugin with none auth (feature flag enabled)", async () => {
      const v3ctx = createContext();
      v3ctx.userInteraction = new MockedUserInteraction();

      const inputs: Inputs = {
        platform: Platform.VSCode,
        folder: ".",
        [QuestionNames.ProjectType]: ProjectTypeOptions.copilotPlugin().id,
        [QuestionNames.Capabilities]: CapabilityOptions.copilotPluginNewApi().id,
        [QuestionNames.ApiAuth]: ApiAuthOptions.none().id,
        [QuestionNames.ProgrammingLanguage]: "javascript",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.Scratch]: ScratchOptions.yes().id,
      };
      const res = await coordinator.create(v3ctx, inputs);
      assert.isTrue(res.isOk());
    });

    it("create API Plugin with api-key auth (feature flag enabled)", async () => {
      const v3ctx = createContext();
      v3ctx.userInteraction = new MockedUserInteraction();

      const inputs: Inputs = {
        platform: Platform.VSCode,
        folder: ".",
        [QuestionNames.ProjectType]: ProjectTypeOptions.copilotPlugin().id,
        [QuestionNames.Capabilities]: CapabilityOptions.copilotPluginNewApi().id,
        [QuestionNames.ApiAuth]: ApiAuthOptions.apiKey().id,
        [QuestionNames.ProgrammingLanguage]: "javascript",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.Scratch]: ScratchOptions.yes().id,
      };
      const res = await coordinator.create(v3ctx, inputs);
      assert.isTrue(res.isOk());
    });

    it("create API Plugin with OAuth (feature flag enabled)", async () => {
      const v3ctx = createContext();
      v3ctx.userInteraction = new MockedUserInteraction();

      const inputs: Inputs = {
        platform: Platform.VSCode,
        folder: ".",
        [QuestionNames.ProjectType]: ProjectTypeOptions.copilotPlugin().id,
        [QuestionNames.Capabilities]: CapabilityOptions.copilotPluginNewApi().id,
        [QuestionNames.ApiAuth]: ApiAuthOptions.oauth().id,
        [QuestionNames.ProgrammingLanguage]: "javascript",
        [QuestionNames.AppName]: randomAppName(),
        [QuestionNames.Scratch]: ScratchOptions.yes().id,
      };
      const res = await coordinator.create(v3ctx, inputs);
      assert.isTrue(res.isOk());
    });
  });
});

describe("Office Addin", async () => {
  let mockedEnvRestore: RestoreFn = () => {};
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  tools.ui = new MockedUserInteraction();
  setTools(tools);

  beforeEach(() => {
    sandbox.stub(fs, "ensureDir").resolves();
    mockedEnvRestore = mockedEnv({ TEAMSFX_NEW_GENERATOR: "false" });
  });

  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });

  it("should scaffold taskpane successfully", async () => {
    const v3ctx = createContext();
    v3ctx.userInteraction = new MockedUserInteraction();

    sandbox.stub(OfficeAddinGenerator, "generate").resolves(ok(undefined));
    sandbox
      .stub(settingsUtil, "readSettings")
      .resolves(ok({ trackingId: "mockId", version: V3Version }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));

    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [QuestionNames.ProjectType]: ProjectTypeOptions.outlookAddin().id,
      [QuestionNames.AppName]: randomAppName(),
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
    };
    const res = await coordinator.create(v3ctx, inputs);
    assert.isTrue(res.isOk());
  });

  it("should return error if app name is invalid", async () => {
    const v3ctx = createContext();
    v3ctx.userInteraction = new MockedUserInteraction();
    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [QuestionNames.AppName]: "__invalid__",
      [QuestionNames.ProjectType]: ProjectTypeOptions.outlookAddin().id,
    };

    const res = await coordinator.create(v3ctx, inputs);
    assert.isTrue(res.isErr() && res.error instanceof InputValidationError);
  });

  it("should return error if app name is undefined", async () => {
    const v3ctx = createContext();
    v3ctx.userInteraction = new MockedUserInteraction();
    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [QuestionNames.AppName]: undefined,
      [QuestionNames.ProjectType]: ProjectTypeOptions.outlookAddin().id,
    };

    const res = await coordinator.create(v3ctx, inputs);
    assert.isTrue(res.isErr() && res.error instanceof MissingRequiredInputError);
  });

  it("should return error if OfficeAddinGenerator returns error", async () => {
    const v3ctx = createContext();
    v3ctx.userInteraction = new MockedUserInteraction();

    const mockedError = new SystemError("mockedSource", "mockedError", "mockedMessage");
    sandbox.stub(OfficeAddinGenerator, "generate").resolves(err(mockedError));
    sandbox
      .stub(settingsUtil, "readSettings")
      .resolves(ok({ trackingId: "mockId", version: V3Version }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));

    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
      [QuestionNames.AppName]: randomAppName(),
      [QuestionNames.ProjectType]: ProjectTypeOptions.outlookAddin().id,
    };
    const res = await coordinator.create(v3ctx, inputs);
    assert.isTrue(res.isErr() && res.error.name === "mockedError");
  });
});

describe("Office Addin", async () => {
  let mockedEnvRestore: RestoreFn = () => {};
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  tools.ui = new MockedUserInteraction();
  setTools(tools);

  beforeEach(() => {
    sandbox.stub(fs, "ensureDir").resolves();
    mockedEnvRestore = mockedEnv({ TEAMSFX_NEW_GENERATOR: "false" });
  });

  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });

  it("should scaffold taskpane successfully", async () => {
    const v3ctx = createContext();
    v3ctx.userInteraction = new MockedUserInteraction();

    sandbox.stub(OfficeAddinGenerator, "generate").resolves(ok(undefined));
    sandbox
      .stub(settingsUtil, "readSettings")
      .resolves(ok({ trackingId: "mockId", version: V3Version }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));

    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [QuestionNames.ProjectType]: ProjectTypeOptions.officeAddin().id,
      [QuestionNames.AppName]: randomAppName(),
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
    };
    const res = await coordinator.create(v3ctx, inputs);
    assert.isTrue(res.isOk());
  });

  it("should return error if app name is invalid", async () => {
    const v3ctx = createContext();
    v3ctx.userInteraction = new MockedUserInteraction();
    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [QuestionNames.AppName]: "__invalid__",
      [QuestionNames.ProjectType]: ProjectTypeOptions.officeAddin().id,
    };

    const res = await coordinator.create(v3ctx, inputs);
    assert.isTrue(res.isErr() && res.error instanceof InputValidationError);
  });

  it("should return error if app name is undefined", async () => {
    const v3ctx = createContext();
    v3ctx.userInteraction = new MockedUserInteraction();
    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [QuestionNames.AppName]: undefined,
      [QuestionNames.ProjectType]: ProjectTypeOptions.officeAddin().id,
    };

    const res = await coordinator.create(v3ctx, inputs);
    assert.isTrue(res.isErr() && res.error instanceof MissingRequiredInputError);
  });

  it("should return error if OfficeAddinGenerator returns error", async () => {
    const v3ctx = createContext();
    v3ctx.userInteraction = new MockedUserInteraction();

    const mockedError = new SystemError("mockedSource", "mockedError", "mockedMessage");
    sandbox.stub(OfficeAddinGenerator, "generate").resolves(err(mockedError));
    sandbox
      .stub(settingsUtil, "readSettings")
      .resolves(ok({ trackingId: "mockId", version: V3Version }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));

    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
      [QuestionNames.AppName]: randomAppName(),
      [QuestionNames.ProjectType]: ProjectTypeOptions.officeAddin().id,
    };
    const res = await coordinator.create(v3ctx, inputs);
    assert.isTrue(res.isErr() && res.error.name === "mockedError");
  });
});

describe("Copilot plugin", async () => {
  let mockedEnvRestore: RestoreFn = () => {};
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  tools.ui = new MockedUserInteraction();
  setTools(tools);

  beforeEach(() => {
    sandbox.stub(fs, "ensureDir").resolves();
    mockedEnvRestore = mockedEnv({ TEAMSFX_NEW_GENERATOR: "false" });
  });

  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });

  it("should scaffold from API spec successfully", async () => {
    const v3ctx = createContext();
    v3ctx.userInteraction = new MockedUserInteraction();

    sandbox
      .stub(oldCopilotGenerator, "generatePluginFromApiSpec")
      .resolves(ok({ warnings: [{ type: "", content: "", data: {} } as any] }));

    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [QuestionNames.ProjectType]: ProjectTypeOptions.copilotPlugin().id,
      [QuestionNames.Capabilities]: CapabilityOptions.copilotPluginApiSpec().id,
      [QuestionNames.AppName]: randomAppName(),
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
    };
    const res = await coordinator.create(v3ctx, inputs);
    assert.isTrue(res.isOk());
  });

  it("scaffold from API spec error", async () => {
    const v3ctx = createContext();
    v3ctx.userInteraction = new MockedUserInteraction();

    sandbox
      .stub(oldCopilotGenerator, "generatePluginFromApiSpec")
      .resolves(err(new SystemError("mockedSource", "mockedError", "mockedMessage", "")));

    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [QuestionNames.ProjectType]: ProjectTypeOptions.copilotPlugin().id,
      [QuestionNames.Capabilities]: CapabilityOptions.copilotPluginApiSpec().id,
      [QuestionNames.AppName]: randomAppName(),
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
    };
    const res = await coordinator.create(v3ctx, inputs);
    assert.isTrue(res.isErr());
  });
});

describe(`coordinator create with new generator enabled = true`, () => {
  let mockedEnvRestore: RestoreFn = () => {};
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  setTools(tools);
  beforeEach(() => {
    sandbox.stub(fs, "ensureDir").resolves();
    mockedEnvRestore = mockedEnv({ TEAMSFX_NEW_GENERATOR: "true" });
  });
  afterEach(() => {
    sandbox.restore();
    mockedEnvRestore();
  });

  it("should scaffold by OfficeAddinGeneratorNew successfully", async () => {
    const v3ctx = createContext();
    v3ctx.userInteraction = new MockedUserInteraction();
    sandbox.stub(OfficeAddinGeneratorNew.prototype, "run").resolves(ok({}));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [QuestionNames.ProjectType]: ProjectTypeOptions.outlookAddin().id,
      [QuestionNames.AppName]: randomAppName(),
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
    };
    const res = await coordinator.create(v3ctx, inputs);
    assert.isTrue(res.isOk());
  });

  it("should scaffold by CopilotPluginGeneratorNew successfully", async () => {
    const v3ctx = createContext();
    v3ctx.userInteraction = new MockedUserInteraction();
    sandbox.stub(CopilotPluginGenerator.prototype, "run").resolves(ok({}));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [QuestionNames.Capabilities]: CapabilityOptions.copilotPluginApiSpec().id,
      [QuestionNames.AppName]: randomAppName(),
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
    };
    const res = await coordinator.create(v3ctx, inputs);
    assert.isTrue(res.isOk());
  });
});
