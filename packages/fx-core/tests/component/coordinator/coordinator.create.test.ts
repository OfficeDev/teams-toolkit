import "mocha";

import { err, Inputs, ok, Platform, SystemError, UserError } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import fs from "fs-extra";
import * as sinon from "sinon";
import { MetadataV3 } from "../../../src/common/versionMetadata";
import { coordinator, TemplateNames } from "../../../src/component/coordinator";
import { developerPortalScaffoldUtils } from "../../../src/component/developerPortalScaffoldUtils";
import { AppDefinition } from "../../../src/component/driver/teamsApp/interfaces/appdefinitions/appDefinition";
import { Generator } from "../../../src/component/generator/generator";
import { SPFxGenerator } from "../../../src/component/generator/spfx/spfxGenerator";
import { createContextV3 } from "../../../src/component/utils";
import { settingsUtil } from "../../../src/component/utils/settingsUtil";
import { FxCore } from "../../../src/core/FxCore";
import { setTools } from "../../../src/core/globalVars";
import { InputValidationError, MissingRequiredInputError } from "../../../src/error/common";
import { QuestionNames } from "../../../src/question/questionNames";
import {
  CapabilityOptions,
  ProjectTypeOptions,
  ScratchOptions,
} from "../../../src/question/create";
import { MockTools, randomAppName } from "../../core/utils";
import { MockedUserInteraction } from "../../plugins/solution/util";
import { OfficeAddinGenerator } from "../../../src/component/generator/officeAddin/generator";

const V3Version = MetadataV3.projectVersion;
describe("coordinator create", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  setTools(tools);
  beforeEach(() => {
    sandbox.stub(fs, "ensureDir").resolves();
  });
  afterEach(() => {
    sandbox.restore();
  });

  it("create project from sample", async () => {
    sandbox.stub(Generator, "generateSample").resolves(ok(undefined));
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox
      .stub(settingsUtil, "readSettings")
      .resolves(ok({ trackingId: "mockId", version: V3Version }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    const inputs: Inputs = {
      platform: Platform.CLI,
      folder: ".",
      [QuestionNames.Scratch]: ScratchOptions.no().id,
      [QuestionNames.Samples]: "hello-world-tab",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.createProject(inputs);
    assert.isTrue(res.isOk());
  });
  it("fail to create project from sample", async () => {
    sandbox.stub(Generator, "generateSample").resolves(err(new UserError({})));
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox
      .stub(settingsUtil, "readSettings")
      .resolves(ok({ trackingId: "mockId", version: V3Version }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    const inputs: Inputs = {
      platform: Platform.CLI,
      folder: ".",
      [QuestionNames.Scratch]: ScratchOptions.no().id,
      [QuestionNames.Samples]: "hello-world-tab",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.createProject(inputs);
    assert.isTrue(res.isErr());
  });
  it("create project from sample rename folder", async () => {
    sandbox.stub(Generator, "generateSample").resolves(ok(undefined));
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
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
    const inputs: Inputs = {
      platform: Platform.CLI,
      folder: ".",
      [QuestionNames.Scratch]: ScratchOptions.no().id,
      [QuestionNames.Samples]: "hello-world-tab",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.createProject(inputs);
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      assert.isTrue(res.value.endsWith("_1"));
    }
  });
  it("create project from scratch", async () => {
    sandbox.stub(Generator, "generateSample").resolves(ok(undefined));
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox
      .stub(settingsUtil, "readSettings")
      .resolves(ok({ trackingId: "mockId", version: V3Version }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [QuestionNames.AppName]: randomAppName(),
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
      [QuestionNames.Capabilities]: CapabilityOptions.tab(),
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
    const context = createContextV3();
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
    const context = createContextV3();
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
    const context = createContextV3();
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
    const context = createContextV3();
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
    const context = createContextV3();
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
    const context = createContextV3();
    const res = await coordinator.create(context, inputs);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.isTrue(res.error instanceof MissingRequiredInputError);
    }
  });
  it("create SPFx project", async () => {
    sandbox.stub(SPFxGenerator, "generate").resolves(err(new UserError({})));
    sandbox
      .stub(settingsUtil, "readSettings")
      .resolves(ok({ trackingId: "mockId", version: V3Version }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [QuestionNames.AppName]: randomAppName(),
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
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

  it("fail to create SPFx project", async () => {
    sandbox.stub(SPFxGenerator, "generate").resolves(ok(undefined));
    sandbox
      .stub(settingsUtil, "readSettings")
      .resolves(ok({ trackingId: "mockId", version: V3Version }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [QuestionNames.AppName]: randomAppName(),
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
      [QuestionNames.Capabilities]: CapabilityOptions.SPFxTab().id,
      [QuestionNames.ProgrammingLanguage]: "javascript",
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
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox
      .stub(settingsUtil, "readSettings")
      .resolves(ok({ trackingId: "mockId", version: V3Version }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    const inputs: Inputs = {
      platform: Platform.VS,
      folder: ".",
      [QuestionNames.AppName]: randomAppName(),
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
      [QuestionNames.Capabilities]: CapabilityOptions.tab().id,
      [QuestionNames.ProgrammingLanguage]: "csharp",
      [QuestionNames.SafeProjectName]: "safeprojectname",
    };
    const fxCore = new FxCore(tools);
    const res2 = await fxCore.createProject(inputs);
    assert.isTrue(res2.isOk());
  });

  it("create m365 project from scratch", async () => {
    sandbox.stub(Generator, "generateSample").resolves(ok(undefined));
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox
      .stub(settingsUtil, "readSettings")
      .resolves(ok({ trackingId: "mockId", version: V3Version }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [QuestionNames.AppName]: randomAppName(),
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
      [QuestionNames.Capabilities]: CapabilityOptions.m365SsoLaunchPage().id,
      [QuestionNames.ProgrammingLanguage]: "typescript",
    };
    const fxCore = new FxCore(tools);
    const res2 = await fxCore.createProject(inputs);
    assert.isTrue(res2.isOk());
    assert.isTrue(inputs.isM365);
  });

  it("create project for app with tab features from Developer Portal", async () => {
    const generator = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
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
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
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
    assert.equal(generator.args[0][2], TemplateNames.Tab);
  });

  it("create project for app with bot feature from Developer Portal with updating files failed", async () => {
    const generator = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
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
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
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
    assert.equal(generator.args[0][2], TemplateNames.DefaultBot);
  });

  it("create project for app with tab and bot features from Developer Portal", async () => {
    const generator = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
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
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
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
    assert.equal(generator.args[0][2], TemplateNames.TabAndDefaultBot);
  });

  it("create project for app with tab and message extension features from Developer Portal", async () => {
    const generator = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
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
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
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
    assert.equal(generator.args[0][2], TemplateNames.TabAndDefaultBot);
  });

  it("create project for app with no features from Developer Portal - failed expecting inputs", async () => {
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
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
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
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
    const generator = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
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
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
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
    assert.equal(generator.args[0][2], TemplateNames.Tab);
  });
});

describe("Office Addin", async () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  tools.ui = new MockedUserInteraction();
  setTools(tools);

  beforeEach(() => {
    sandbox.stub(fs, "ensureDir").resolves();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should scaffold taskpane successfully", async () => {
    const v3ctx = createContextV3();
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
    const v3ctx = createContextV3();
    v3ctx.userInteraction = new MockedUserInteraction();
    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [QuestionNames.AppName]: "__invalid__",
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
      [QuestionNames.ProjectType]: ProjectTypeOptions.outlookAddin().id,
    };

    const res = await coordinator.create(v3ctx, inputs);
    assert.isTrue(res.isErr() && res.error instanceof InputValidationError);
  });

  it("should return error if app name is undefined", async () => {
    const v3ctx = createContextV3();
    v3ctx.userInteraction = new MockedUserInteraction();
    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [QuestionNames.AppName]: undefined,
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
      [QuestionNames.ProjectType]: ProjectTypeOptions.outlookAddin().id,
    };

    const res = await coordinator.create(v3ctx, inputs);
    assert.isTrue(res.isErr() && res.error instanceof MissingRequiredInputError);
  });

  it("should return error if OfficeAddinGenerator returns error", async () => {
    const v3ctx = createContextV3();
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
      [QuestionNames.AppName]: randomAppName(),
      [QuestionNames.Scratch]: ScratchOptions.yes().id,
      [QuestionNames.ProjectType]: ProjectTypeOptions.outlookAddin().id,
    };
    const res = await coordinator.create(v3ctx, inputs);
    assert.isTrue(res.isErr() && res.error.name === "mockedError");
  });
});
