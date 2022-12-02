import {
  err,
  FxError,
  Inputs,
  InputsWithProjectPath,
  LogProvider,
  ok,
  Platform,
  Result,
  SingleSelectConfig,
  Stage,
  SystemError,
  UserCancelError,
  UserError,
} from "@microsoft/teamsfx-api";
import "mocha";
import * as sinon from "sinon";
import { Generator } from "../../src/component/generator/generator";
import { settingsUtil } from "../../src/component/utils/settingsUtil";
import { setTools } from "../../src/core/globalVars";
import { CoreQuestionNames, ScratchOptionNo, ScratchOptionYes } from "../../src/core/question";
import {
  MockAzureAccountProvider,
  MockM365TokenProvider,
  MockTools,
  randomAppName,
} from "../core/utils";
import { assert } from "chai";
import {
  M365SsoLaunchPageOptionItem,
  SolutionError,
  TabOptionItem,
} from "../../src/component/constants";
import { FxCore } from "../../src/core/FxCore";
import mockedEnv, { RestoreFn } from "mocked-env";
import { YamlParser } from "../../src/component/configManager/parser";
import {
  DriverInstance,
  ExecutionError,
  ExecutionOutput,
  ExecutionResult,
  ProjectModel,
} from "../../src/component/configManager/interface";
import { DriverContext } from "../../src/component/driver/interface/commonArgs";
import { envUtil } from "../../src/component/utils/envUtil";
import { provisionUtils } from "../../src/component/provisionUtils";
import { coordinator, TemplateNames } from "../../src/component/coordinator";
import { resourceGroupHelper } from "../../src/component/utils/ResourceGroupHelper";
import fs from "fs-extra";
import { AppDefinition } from "../../src/component/resource/appManifest/interfaces/appDefinition";
import { developerPortalScaffoldUtils } from "../../src/component/developerPortalScaffoldUtils";
import { createContextV3 } from "../../src/component/utils";
import * as appStudio from "../../src/component/resource/appManifest/appStudio";

function mockedResolveDriverInstances(log: LogProvider): Result<DriverInstance[], FxError> {
  return ok([
    {
      uses: "arm/deploy",
      with: undefined,
      instance: {
        run: async (
          args: unknown,
          context: DriverContext
        ): Promise<Result<Map<string, string>, FxError>> => {
          return ok(new Map());
        },
      },
    },
  ]);
}

describe("component coordinator test", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  setTools(tools);
  let mockedEnvRestore: RestoreFn | undefined;

  afterEach(() => {
    sandbox.restore();
    if (mockedEnvRestore) {
      mockedEnvRestore();
    }
  });

  beforeEach(() => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "true",
    });
  });

  it("create project from sample", async () => {
    sandbox.stub(Generator, "generateSample").resolves(ok(undefined));
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionNo.id,
      [CoreQuestionNames.Samples]: "hello-world-tab",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.createProject(inputs);
    assert.isTrue(res.isOk());
  });
  it("create project from sample rename folder", async () => {
    sandbox.stub(Generator, "generateSample").resolves(ok(undefined));
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    sandbox.stub(fs, "pathExists").onFirstCall().resolves(true).onSecondCall().resolves(false);
    sandbox
      .stub(fs, "readdir")
      .onFirstCall()
      .resolves(["abc"] as any)
      .onSecondCall()
      .resolves([]);
    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionNo.id,
      [CoreQuestionNames.Samples]: "hello-world-tab",
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
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [CoreQuestionNames.AppName]: randomAppName(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYes.id,
      [CoreQuestionNames.Capabilities]: [TabOptionItem.id],
      [CoreQuestionNames.ProgrammingLanguage]: "javascript",
    };
    const fxCore = new FxCore(tools);
    const res2 = await fxCore.createProject(inputs);
    assert.isTrue(res2.isOk());
  });

  it("create m365 project from scratch", async () => {
    sandbox.stub(Generator, "generateSample").resolves(ok(undefined));
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [CoreQuestionNames.AppName]: randomAppName(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYes.id,
      [CoreQuestionNames.Capabilities]: M365SsoLaunchPageOptionItem.id,
      [CoreQuestionNames.ProgrammingLanguage]: "typescript",
    };
    const fxCore = new FxCore(tools);
    const res2 = await fxCore.createProject(inputs);
    assert.isTrue(res2.isOk());
    assert.isTrue(inputs.isM365);
  });

  it("create project for app with tab features from Developer Portal", async () => {
    sandbox.stub(fs, "ensureDir").resolves();
    const generator = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
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
      [CoreQuestionNames.AppName]: randomAppName(),
      [CoreQuestionNames.ProgrammingLanguage]: "javascript",
      teamsAppFromTdp: appDefinition,
      [CoreQuestionNames.ReplaceWebsiteUrl]: ["tab1"],
      [CoreQuestionNames.ReplaceContentUrl]: [],
    };
    const fxCore = new FxCore(tools);
    const res2 = await fxCore.createProject(inputs);

    assert.isTrue(res2.isOk());
    assert.equal(generator.args[0][2], TemplateNames.Tab);
  });

  it("create project for app with bot feature from Developer Portal with updating files failed", async () => {
    sandbox.stub(fs, "ensureDir").resolves();
    const generator = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
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
      [CoreQuestionNames.AppName]: randomAppName(),
      [CoreQuestionNames.ProgrammingLanguage]: "javascript",
      [CoreQuestionNames.ReplaceBotIds]: ["bot"],
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
    sandbox.stub(fs, "ensureDir").resolves();
    const generator = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
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
      [CoreQuestionNames.AppName]: randomAppName(),
      [CoreQuestionNames.ProgrammingLanguage]: "javascript",
      teamsAppFromTdp: appDefinition,
      [CoreQuestionNames.ReplaceWebsiteUrl]: ["tab1"],
      [CoreQuestionNames.ReplaceContentUrl]: [],
      [CoreQuestionNames.ReplaceBotIds]: ["bot"],
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
    sandbox.stub(fs, "ensureDir").resolves();
    const generator = sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
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
      [CoreQuestionNames.AppName]: randomAppName(),
      [CoreQuestionNames.ProgrammingLanguage]: "javascript",
      teamsAppFromTdp: appDefinition,
      [CoreQuestionNames.ReplaceWebsiteUrl]: ["tab1"],
      [CoreQuestionNames.ReplaceContentUrl]: [],
      [CoreQuestionNames.ReplaceBotIds]: ["bot"],
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

  it("provision happy path from zero", async () => {
    const mockProjectModel: ProjectModel = {
      registerApp: {
        name: "configureApp",
        driverDefs: [
          {
            uses: "arm/deploy",
            with: undefined,
          },
          {
            uses: "teamsApp/create",
            with: undefined,
          },
        ],
        run: async (ctx: DriverContext) => {
          return ok({
            env: new Map(),
            unresolvedPlaceHolders: ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"],
          });
        },
        resolvePlaceholders: () => {
          return ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"];
        },
        execute: async (ctx: DriverContext): Promise<ExecutionResult> => {
          return { result: ok(new Map()), summaries: [] };
        },
        resolveDriverInstances: mockedResolveDriverInstances,
      },
    };
    sandbox.stub(YamlParser.prototype, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "prod"]));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "ensureSubscription").resolves(
      ok({
        subscriptionId: "mockSubId",
        tenantId: "mockTenantId",
        subscriptionName: "mockSubName",
      })
    );
    sandbox.stub(provisionUtils, "ensureResourceGroup").resolves(
      ok({
        createNewResourceGroup: true,
        name: "test-rg",
        location: "East US",
      })
    );
    sandbox.stub(provisionUtils, "getM365TenantId").resolves(
      ok({
        tenantIdInToken: "mockM365Tenant",
        tenantUserName: "mockM365UserName",
      })
    );
    sandbox.stub(provisionUtils, "askForProvisionConsentV3").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "ensureM365TenantMatchesV3").resolves(ok(undefined));
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription").resolves({
      subscriptionId: "mockSubId",
      tenantId: "mockTenantId",
      subscriptionName: "mockSubName",
    });
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "setSubscription").resolves();
    sandbox.stub(tools.ui, "selectOption").callsFake(async (config) => {
      if (config.name === "env") {
        return ok({ type: "success", result: "dev" });
      } else {
        return ok({ type: "success", result: "" });
      }
    });
    sandbox.stub(resourceGroupHelper, "createNewResourceGroup").resolves(ok("test-rg"));

    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.provisionResources(inputs);
    assert.isTrue(res.isOk());
  });
  it("provision happy path from zero case 2", async () => {
    const mockProjectModel: ProjectModel = {
      registerApp: {
        name: "configureApp",
        driverDefs: [
          {
            uses: "arm/deploy",
            with: undefined,
          },
          {
            uses: "teamsApp/create",
            with: undefined,
          },
        ],
        run: async (ctx: DriverContext) => {
          return ok({
            env: new Map(),
            unresolvedPlaceHolders: ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"],
          });
        },
        resolvePlaceholders: () => {
          return ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"];
        },
        execute: async (ctx: DriverContext): Promise<ExecutionResult> => {
          return { result: ok(new Map()), summaries: [] };
        },
        resolveDriverInstances: mockedResolveDriverInstances,
      },
    };
    sandbox.stub(YamlParser.prototype, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "prod"]));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "ensureM365TenantMatchesV3").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "ensureSubscription").resolves(
      ok({
        subscriptionId: "mockSubId",
        tenantId: "mockTenantId",
        subscriptionName: "mockSubName",
      })
    );
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "setSubscription").resolves();
    sandbox.stub(provisionUtils, "ensureResourceGroup").resolves(
      ok({
        createNewResourceGroup: true,
        name: "test-rg",
        location: "East US",
      })
    );
    sandbox.stub(provisionUtils, "getM365TenantId").resolves(
      ok({
        tenantIdInToken: "mockM365Tenant",
        tenantUserName: "mockM365UserName",
      })
    );
    sandbox.stub(provisionUtils, "askForProvisionConsentV3").resolves(ok(undefined));
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription").resolves({
      subscriptionId: "",
      tenantId: "mockTenantId",
      subscriptionName: "mockSubName",
    });
    sandbox.stub(tools.ui, "selectOption").callsFake(async (config) => {
      if (config.name === "env") {
        return ok({ type: "success", result: "dev" });
      } else {
        return ok({ type: "success", result: "" });
      }
    });
    sandbox.stub(resourceGroupHelper, "createNewResourceGroup").resolves(ok("test-rg"));

    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.provisionResources(inputs);
    assert.isTrue(res.isOk());
  });
  it("provision happy path with existing resource groups in VS Code", async () => {
    const mockProjectModel: ProjectModel = {
      registerApp: {
        name: "configureApp",
        driverDefs: [
          {
            uses: "arm/deploy",
            with: undefined,
          },
          {
            uses: "teamsApp/create",
            with: undefined,
          },
        ],
        run: async (ctx: DriverContext) => {
          return ok({
            env: new Map(),
            unresolvedPlaceHolders: ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"],
          });
        },
        resolvePlaceholders: () => {
          return ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"];
        },
        execute: async (ctx: DriverContext): Promise<ExecutionResult> => {
          return { result: ok(new Map()), summaries: [] };
        },
        resolveDriverInstances: mockedResolveDriverInstances,
      },
    };
    sandbox.stub(YamlParser.prototype, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "prod"]));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "ensureM365TenantMatchesV3").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "ensureSubscription").resolves(
      ok({
        subscriptionId: "mockSubId",
        tenantId: "mockTenantId",
        subscriptionName: "mockSubName",
      })
    );
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "setSubscription").resolves();
    sandbox.stub(provisionUtils, "ensureResourceGroup").resolves(
      ok({
        createNewResourceGroup: false,
        name: "test-rg",
        location: "East US",
      })
    );
    sandbox.stub(provisionUtils, "getM365TenantId").resolves(
      ok({
        tenantIdInToken: "mockM365Tenant",
        tenantUserName: "mockM365UserName",
      })
    );
    sandbox.stub(provisionUtils, "askForProvisionConsentV3").resolves(ok(undefined));
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription").resolves({
      subscriptionId: "",
      tenantId: "mockTenantId",
      subscriptionName: "mockSubName",
    });
    sandbox.stub(tools.ui, "selectOption").callsFake(async (config) => {
      if (config.name === "env") {
        return ok({ type: "success", result: "dev" });
      } else {
        return ok({ type: "success", result: "" });
      }
    });

    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.provisionResources(inputs);
    assert.isTrue(res.isOk());
  });
  it("provision failed with getM365TenantId Error", async () => {
    const mockProjectModel: ProjectModel = {
      registerApp: {
        name: "configureApp",
        driverDefs: [
          {
            uses: "arm/deploy",
            with: undefined,
          },
          {
            uses: "teamsApp/create",
            with: undefined,
          },
        ],
        run: async (ctx: DriverContext) => {
          return ok({
            env: new Map(),
            unresolvedPlaceHolders: ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"],
          });
        },
        resolvePlaceholders: () => {
          return ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"];
        },
        execute: async (ctx: DriverContext): Promise<ExecutionResult> => {
          return { result: ok(new Map()), summaries: [] };
        },
        resolveDriverInstances: mockedResolveDriverInstances,
      },
    };
    sandbox.stub(YamlParser.prototype, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "prod"]));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "ensureSubscription").resolves(
      ok({
        subscriptionId: "mockSubId",
        tenantId: "mockTenantId",
        subscriptionName: "mockSubName",
      })
    );
    sandbox.stub(provisionUtils, "ensureResourceGroup").resolves(
      ok({
        createNewResourceGroup: true,
        name: "test-rg",
        location: "East US",
      })
    );
    sandbox
      .stub(provisionUtils, "getM365TenantId")
      .resolves(err(new UserError({ source: "Tst", name: "TestError" })));
    sandbox.stub(provisionUtils, "askForProvisionConsentV3").resolves(ok(undefined));
    sandbox.stub(tools.ui, "selectOption").callsFake(async (config) => {
      if (config.name === "env") {
        return ok({ type: "success", result: "dev" });
      } else {
        return ok({ type: "success", result: "" });
      }
    });
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.provisionResources(inputs);
    assert.isTrue(res.isErr());
  });
  it("provision failed with getSelectedSubscription Error", async () => {
    const mockProjectModel: ProjectModel = {
      registerApp: {
        name: "configureApp",
        driverDefs: [
          {
            uses: "arm/deploy",
            with: undefined,
          },
          {
            uses: "teamsApp/create",
            with: undefined,
          },
        ],
        run: async (ctx: DriverContext) => {
          return ok({
            env: new Map(),
            unresolvedPlaceHolders: ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"],
          });
        },
        resolvePlaceholders: () => {
          return ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"];
        },
        execute: async (ctx: DriverContext): Promise<ExecutionResult> => {
          return { result: ok(new Map()), summaries: [] };
        },
        resolveDriverInstances: mockedResolveDriverInstances,
      },
    };
    sandbox.stub(YamlParser.prototype, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "prod"]));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "ensureSubscription").resolves(
      ok({
        subscriptionId: "mockSubId",
        tenantId: "mockTenantId",
        subscriptionName: "mockSubName",
      })
    );
    sandbox.stub(provisionUtils, "ensureResourceGroup").resolves(
      ok({
        createNewResourceGroup: true,
        name: "test-rg",
        location: "East US",
      })
    );
    sandbox.stub(provisionUtils, "getM365TenantId").resolves(
      ok({
        tenantIdInToken: "mockM365Tenant",
        tenantUserName: "mockM365UserName",
      })
    );
    sandbox.stub(provisionUtils, "ensureM365TenantMatchesV3").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "askForProvisionConsentV3").resolves(ok(undefined));
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription")
      .resolves(undefined);
    sandbox.stub(tools.ui, "selectOption").callsFake(async (config) => {
      if (config.name === "env") {
        return ok({ type: "success", result: "dev" });
      } else {
        return ok({ type: "success", result: "" });
      }
    });
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.provisionResources(inputs);
    assert.isTrue(res.isErr());
  });
  it("provision happy path with CLI inputs", async () => {
    const mockProjectModel: ProjectModel = {
      registerApp: {
        name: "configureApp",
        driverDefs: [
          {
            uses: "arm/deploy",
            with: undefined,
          },
          {
            uses: "teamsApp/create",
            with: undefined,
          },
        ],
        run: async (ctx: DriverContext) => {
          return ok({
            env: new Map(),
            unresolvedPlaceHolders: ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"],
          });
        },
        resolvePlaceholders: () => {
          return ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"];
        },
        execute: async (ctx: DriverContext): Promise<ExecutionResult> => {
          return { result: ok(new Map()), summaries: [] };
        },
        resolveDriverInstances: mockedResolveDriverInstances,
      },
    };
    sandbox.stub(YamlParser.prototype, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "prod"]));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
    sandbox.stub(resourceGroupHelper, "createNewResourceGroup").resolves(ok("test-rg"));
    sandbox.stub(provisionUtils, "getM365TenantId").resolves(
      ok({
        tenantIdInToken: "mockM365Tenant",
        tenantUserName: "mockM365UserName",
      })
    );
    sandbox.stub(provisionUtils, "askForProvisionConsentV3").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "ensureM365TenantMatchesV3").resolves(ok(undefined));
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription").resolves({
      subscriptionId: "mockSubId",
      tenantId: "mockTenantId",
      subscriptionName: "mockSubName",
    });
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "setSubscription").resolves();
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: ".",
      env: "dev",
      targetSubscriptionId: "mockSubId",
      targetResourceGroupName: "test-rg",
      targetResourceLocationName: "Ease US",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.provisionResources(inputs);
    assert.isTrue(res.isOk());
  });
  it("provision happy path with CLI inputs for existing resource group", async () => {
    const mockProjectModel: ProjectModel = {
      registerApp: {
        name: "configureApp",
        driverDefs: [
          {
            uses: "arm/deploy",
            with: undefined,
          },
          {
            uses: "teamsApp/create",
            with: undefined,
          },
        ],
        run: async (ctx: DriverContext) => {
          return ok({
            env: new Map(),
            unresolvedPlaceHolders: ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"],
          });
        },
        resolvePlaceholders: () => {
          return ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"];
        },
        execute: async (ctx: DriverContext): Promise<ExecutionResult> => {
          return { result: ok(new Map()), summaries: [] };
        },
        resolveDriverInstances: mockedResolveDriverInstances,
      },
    };
    sandbox.stub(YamlParser.prototype, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "prod"]));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
    sandbox
      .stub(resourceGroupHelper, "createNewResourceGroup")
      .resolves(err(new UserError({ source: "test", name: "ResourceGroupExists" })));
    sandbox.stub(provisionUtils, "getM365TenantId").resolves(
      ok({
        tenantIdInToken: "mockM365Tenant",
        tenantUserName: "mockM365UserName",
      })
    );
    sandbox.stub(provisionUtils, "askForProvisionConsentV3").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "ensureM365TenantMatchesV3").resolves(ok(undefined));
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription").resolves({
      subscriptionId: "mockSubId",
      tenantId: "mockTenantId",
      subscriptionName: "mockSubName",
    });
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "setSubscription").resolves();
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      env: "dev",
      targetSubscriptionId: "mockSubId",
      targetResourceGroupName: "test-rg",
      targetResourceLocationName: "Ease US",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.provisionResources(inputs);
    assert.isTrue(res.isOk());
  });
  it("provision failed with CLI inputs: create resource group failed", async () => {
    const mockProjectModel: ProjectModel = {
      registerApp: {
        name: "configureApp",
        driverDefs: [
          {
            uses: "arm/deploy",
            with: undefined,
          },
          {
            uses: "teamsApp/create",
            with: undefined,
          },
        ],
        run: async (ctx: DriverContext) => {
          return ok({
            env: new Map(),
            unresolvedPlaceHolders: ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"],
          });
        },
        resolvePlaceholders: () => {
          return ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"];
        },
        execute: async (ctx: DriverContext): Promise<ExecutionResult> => {
          return { result: ok(new Map()), summaries: [] };
        },
        resolveDriverInstances: mockedResolveDriverInstances,
      },
    };
    sandbox.stub(provisionUtils, "getM365TenantId").resolves(
      ok({
        tenantIdInToken: "mockM365Tenant",
        tenantUserName: "mockM365UserName",
      })
    );
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "setSubscription").resolves();
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription").resolves({
      subscriptionId: "mockSubId",
      tenantId: "mockTenantId",
      subscriptionName: "mockSubName",
    });
    sandbox.stub(YamlParser.prototype, "parse").resolves(ok(mockProjectModel));
    sandbox
      .stub(resourceGroupHelper, "createNewResourceGroup")
      .resolves(err(new UserError({ source: "test", name: "OtherError" })));
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "prod"]));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "askForProvisionConsentV3").resolves(ok(undefined));
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: ".",
      env: "dev",
      targetSubscriptionId: "mockSubId",
      targetResourceGroupName: "test-rg",
      targetResourceLocationName: "Ease US",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.provisionResources(inputs);
    assert.isTrue(res.isErr());
  });
  it("provision failed when getting azure credentials", async () => {
    const mockProjectModel: ProjectModel = {
      registerApp: {
        name: "configureApp",
        driverDefs: [
          {
            uses: "arm/deploy",
            with: undefined,
          },
          {
            uses: "teamsApp/create",
            with: undefined,
          },
        ],
        run: async (ctx: DriverContext) => {
          return ok({
            env: new Map(),
            unresolvedPlaceHolders: ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"],
          });
        },
        resolvePlaceholders: () => {
          return ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"];
        },
        execute: async (ctx: DriverContext): Promise<ExecutionResult> => {
          return { result: ok(new Map()), summaries: [] };
        },
        resolveDriverInstances: mockedResolveDriverInstances,
      },
    };
    sandbox.stub(YamlParser.prototype, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "prod"]));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "ensureSubscription").resolves(
      ok({
        subscriptionId: "mockSubId",
        tenantId: "mockTenantId",
        subscriptionName: "mockSubName",
      })
    );
    sandbox.stub(provisionUtils, "ensureResourceGroup").resolves(
      ok({
        createNewResourceGroup: true,
        name: "test-rg",
        location: "East US",
      })
    );
    sandbox.stub(provisionUtils, "getM365TenantId").resolves(
      ok({
        tenantIdInToken: "mockM365Tenant",
        tenantUserName: "mockM365UserName",
      })
    );
    sandbox.stub(provisionUtils, "askForProvisionConsentV3").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "ensureM365TenantMatchesV3").resolves(ok(undefined));
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription").resolves({
      subscriptionId: "mockSubId",
      tenantId: "mockTenantId",
      subscriptionName: "mockSubName",
    });
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "setSubscription").resolves();
    sandbox.stub(tools.ui, "selectOption").callsFake(async (config) => {
      if (config.name === "env") {
        return ok({ type: "success", result: "dev" });
      } else {
        return ok({ type: "success", result: "" });
      }
    });
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(undefined);

    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.provisionResources(inputs);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.equal(res.error.name, SolutionError.FailedToGetAzureCredential);
    }
  });
  it("provision failed when checking resource group existence", async () => {
    const mockProjectModel: ProjectModel = {
      registerApp: {
        name: "configureApp",
        driverDefs: [
          {
            uses: "arm/deploy",
            with: undefined,
          },
          {
            uses: "teamsApp/create",
            with: undefined,
          },
        ],
        run: async (ctx: DriverContext) => {
          return ok({
            env: new Map(),
            unresolvedPlaceHolders: ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"],
          });
        },
        resolvePlaceholders: () => {
          return ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"];
        },
        execute: async (ctx: DriverContext): Promise<ExecutionResult> => {
          return { result: ok(new Map()), summaries: [] };
        },
        resolveDriverInstances: mockedResolveDriverInstances,
      },
    };
    sandbox.stub(YamlParser.prototype, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "prod"]));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "ensureSubscription").resolves(
      ok({
        subscriptionId: "mockSubId",
        tenantId: "mockTenantId",
        subscriptionName: "mockSubName",
      })
    );
    sandbox.stub(provisionUtils, "ensureResourceGroup").resolves(
      ok({
        createNewResourceGroup: true,
        name: "test-rg",
        location: "East US",
      })
    );
    sandbox.stub(provisionUtils, "getM365TenantId").resolves(
      ok({
        tenantIdInToken: "mockM365Tenant",
        tenantUserName: "mockM365UserName",
      })
    );
    sandbox.stub(provisionUtils, "askForProvisionConsentV3").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "ensureM365TenantMatchesV3").resolves(ok(undefined));
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription").resolves({
      subscriptionId: "mockSubId",
      tenantId: "mockTenantId",
      subscriptionName: "mockSubName",
    });
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "setSubscription").resolves();
    sandbox.stub(tools.ui, "selectOption").callsFake(async (config) => {
      if (config.name === "env") {
        return ok({ type: "success", result: "dev" });
      } else {
        return ok({ type: "success", result: "" });
      }
    });
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "getIdentityCredentialAsync").resolves({
      getToken: (scopes: string) => {
        return Promise.resolve({ token: "token", expiresOnTimestamp: 1 });
      },
    });
    sandbox
      .stub(resourceGroupHelper, "checkResourceGroupExistence")
      .resolves(err(new SystemError("test", "test", "", "")));

    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.provisionResources(inputs);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.equal(res.error.name, "test");
    }
  });
  it("provision happy path (debug)", async () => {
    const mockProjectModel: ProjectModel = {
      registerApp: {
        name: "configureApp",
        driverDefs: [],
        run: async (ctx: DriverContext) => {
          return ok({
            env: new Map(),
            unresolvedPlaceHolders: [],
          });
        },
        resolvePlaceholders: () => {
          return [];
        },
        execute: async (ctx: DriverContext): Promise<ExecutionResult> => {
          return { result: ok(new Map()), summaries: [] };
        },
        resolveDriverInstances: mockedResolveDriverInstances,
      },
    };
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
    sandbox.stub(YamlParser.prototype, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      workflowFilePath: "./app.local.yml",
      env: "local",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.provisionResources(inputs);
    if (res.isErr()) {
      console.log(res?.error);
    }
    assert.isTrue(res.isOk());
  });

  it("provsision failed with check whether m365 tenant matched fail", async () => {
    const mockProjectModel: ProjectModel = {
      registerApp: {
        name: "configureApp",
        driverDefs: [
          {
            uses: "arm/deploy",
            with: undefined,
          },
          {
            uses: "teamsApp/create",
            with: undefined,
          },
        ],
        run: async (ctx: DriverContext) => {
          return ok({
            env: new Map(),
            unresolvedPlaceHolders: ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"],
          });
        },
        resolvePlaceholders: () => {
          return ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"];
        },
        execute: async (ctx: DriverContext): Promise<ExecutionResult> => {
          return { result: ok(new Map()), summaries: [] };
        },
        resolveDriverInstances: mockedResolveDriverInstances,
      },
    };
    sandbox.stub(YamlParser.prototype, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "prod"]));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "ensureSubscription").resolves(
      ok({
        subscriptionId: "mockSubId",
        tenantId: "mockTenantId",
        subscriptionName: "mockSubName",
      })
    );
    sandbox.stub(provisionUtils, "ensureResourceGroup").resolves(
      ok({
        createNewResourceGroup: true,
        name: "test-rg",
        location: "East US",
      })
    );
    sandbox.stub(provisionUtils, "getM365TenantId").resolves(
      ok({
        tenantIdInToken: "mockM365Tenant",
        tenantUserName: "mockM365UserName",
      })
    );
    sandbox.stub(provisionUtils, "askForProvisionConsentV3").resolves(ok(undefined));
    sandbox
      .stub(provisionUtils, "ensureM365TenantMatchesV3")
      .resolves(err(new UserError("coordinator", "checkM365TenantError", "msg", "msg")));
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription").resolves({
      subscriptionId: "mockSubId",
      tenantId: "mockTenantId",
      subscriptionName: "mockSubName",
    });
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "setSubscription").resolves();
    sandbox.stub(tools.ui, "selectOption").callsFake(async (config) => {
      if (config.name === "env") {
        return ok({ type: "success", result: "dev" });
      } else {
        return ok({ type: "success", result: "" });
      }
    });
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.provisionResources(inputs);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.equal(res.error.name, "checkM365TenantError");
    }
  });
  it("provision failed with no subscription permission", async () => {
    const mockProjectModel: ProjectModel = {
      registerApp: {
        name: "configureApp",
        driverDefs: [
          {
            uses: "arm/deploy",
            with: undefined,
          },
          {
            uses: "teamsApp/create",
            with: undefined,
          },
        ],
        run: async (ctx: DriverContext) => {
          return ok({
            env: new Map(),
            unresolvedPlaceHolders: [],
          });
        },
        resolvePlaceholders: () => {
          return [];
        },
        execute: async (ctx: DriverContext): Promise<ExecutionResult> => {
          return { result: ok(new Map()), summaries: [] };
        },
        resolveDriverInstances: mockedResolveDriverInstances,
      },
    };
    sandbox.stub(YamlParser.prototype, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "prod"]));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "getM365TenantId").resolves(
      ok({
        tenantIdInToken: "mockM365Tenant",
        tenantUserName: "mockM365UserName",
      })
    );
    sandbox.stub(provisionUtils, "askForProvisionConsentV3").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "ensureM365TenantMatchesV3").resolves(ok(undefined));
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription").resolves({
      subscriptionId: "mockSubId",
      tenantId: "mockTenantId",
      subscriptionName: "mockSubName",
    });
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "setSubscription")
      .rejects(new UserError({ source: "Test", name: "NoPermission" }));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      env: "dev",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.provisionResources(inputs);
    assert.isTrue(res.isErr());
  });
  it("deploy happy path", async () => {
    const mockProjectModel: ProjectModel = {
      deploy: {
        name: "deploy",
        run: async (ctx: DriverContext) => {
          return ok({
            env: new Map(),
            unresolvedPlaceHolders: [],
          });
        },
        driverDefs: [],
        resolvePlaceholders: () => {
          return [];
        },
        execute: async (ctx: DriverContext): Promise<ExecutionResult> => {
          return { result: ok(new Map()), summaries: [] };
        },
        resolveDriverInstances: mockedResolveDriverInstances,
      },
    };
    sandbox.stub(YamlParser.prototype, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "prod"]));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
    sandbox.stub(tools.ui, "selectOption").callsFake(async (config) => {
      if (config.name === "env") {
        return ok({ type: "success", result: "dev" });
      } else {
        return ok({ type: "success", result: "" });
      }
    });
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.deployArtifacts(inputs);
    assert.isTrue(res.isOk());
  });

  it("deploy happy path (debug)", async () => {
    const mockProjectModel: ProjectModel = {
      registerApp: {
        name: "configureApp",
        driverDefs: [],
        run: async (ctx: DriverContext) => {
          return ok({
            env: new Map(),
            unresolvedPlaceHolders: [],
          });
        },
        resolvePlaceholders: () => {
          return [];
        },
        execute: async (ctx: DriverContext): Promise<ExecutionResult> => {
          return { result: ok(new Map()), summaries: [] };
        },
        resolveDriverInstances: mockedResolveDriverInstances,
      },
    };
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
    sandbox.stub(YamlParser.prototype, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      workflowFilePath: "./app.local.yml",
      env: "local",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.deployArtifacts(inputs);
    if (res.isErr()) {
      console.log(res?.error);
    }
    assert.isTrue(res.isOk());
  });

  it("publish happy path", async () => {
    const mockProjectModel: ProjectModel = {
      publish: {
        name: "publish",
        run: async (ctx: DriverContext) => {
          return ok({
            env: new Map(),
            unresolvedPlaceHolders: [],
          });
        },
        driverDefs: [],
        resolvePlaceholders: () => {
          return [];
        },
        execute: async (ctx: DriverContext): Promise<ExecutionResult> => {
          return { result: ok(new Map()), summaries: [] };
        },
        resolveDriverInstances: mockedResolveDriverInstances,
      },
    };
    sandbox.stub(YamlParser.prototype, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "prod"]));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
    sandbox.stub(tools.ui, "selectOption").callsFake(async (config) => {
      if (config.name === "env") {
        return ok({ type: "success", result: "dev" });
      } else {
        return ok({ type: "success", result: "" });
      }
    });
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.publishApplication(inputs);
    assert.isTrue(res.isOk());
  });

  it("convertExecuteResult ok", async () => {
    const value = new Map([["key", "value"]]);
    const res: Result<ExecutionOutput, ExecutionError> = ok(value);
    const convertRes = coordinator.convertExecuteResult(res);
    assert.deepEqual(convertRes[0], { key: "value" });
    assert.isUndefined(convertRes[1]);
  });

  it("convertExecuteResult Failure", async () => {
    const error = new UserError({ source: "test", name: "TestError", message: "test message" });
    const res: Result<ExecutionOutput, ExecutionError> = err({ kind: "Failure", error: error });
    const convertRes = coordinator.convertExecuteResult(res);
    assert.deepEqual(convertRes[0], {});
    assert.equal(convertRes[1], error);
  });

  it("convertExecuteResult PartialSuccess - DriverError", async () => {
    const value = new Map([["key", "value"]]);
    const error = new UserError({ source: "test", name: "TestError", message: "test message" });
    const res: Result<ExecutionOutput, ExecutionError> = err({
      kind: "PartialSuccess",
      env: value,
      reason: {
        kind: "DriverError",
        error: error,
        failedDriver: { name: "TestDriver", uses: "testUse", with: "testWith" },
      },
    });
    const convertRes = coordinator.convertExecuteResult(res);
    assert.deepEqual(convertRes[0], { key: "value" });
    assert.equal(convertRes[1], error);
  });

  it("convertExecuteResult PartialSuccess - UnresolvedPlaceholders", async () => {
    const value = new Map([["key", "value"]]);
    const res: Result<ExecutionOutput, ExecutionError> = err({
      kind: "PartialSuccess",
      env: value,
      reason: {
        kind: "UnresolvedPlaceholders",
        unresolvedPlaceHolders: ["TEST_PL"],
        failedDriver: { name: "TestDriver", uses: "testUse", with: "testWith" },
      },
    });
    const convertRes = coordinator.convertExecuteResult(res);
    assert.deepEqual(convertRes[0], { key: "value" });
    assert.equal(convertRes[1]!.name, "UnresolvedPlaceholders");
  });

  it("init infra happy path vsc", async () => {
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      editor: "vsc",
      capability: "tab",
      spfx: "true",
      proceed: "true",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.initInfra(inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });
  it("init infra happy path vs", async () => {
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    sandbox.stub(coordinator, "ensureTeamsFxInCsproj").resolves(ok(undefined));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      editor: "vs",
      capability: "tab",
      proceed: "true",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.initInfra(inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });
  it("init infra cancel", async () => {
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      editor: "vsc",
      capability: "tab",
      spfx: "true",
      proceed: "false",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.initInfra(inputs);
    assert.isTrue(res.isErr());
  });
  it("init infra template not found", async () => {
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      editor: "aaa",
      capability: "tab",
      spfx: "true",
      proceed: "true",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.initInfra(inputs);
    assert.isTrue(res.isErr());
  });
  it("init infra happy path with question model", async () => {
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    sandbox.stub(tools.ui, "selectOption").callsFake(async (config: SingleSelectConfig) => {
      if (config.name === "editor") {
        return ok({ type: "success", result: "vsc" });
      } else if (config.name === "capability") {
        return ok({ type: "success", result: "tab" });
      } else if (config.name === "spfx") {
        return ok({ type: "success", result: "true" });
      } else if (config.name === "proceed") {
        return ok({ type: "success", result: "true" });
      }
      return ok({ type: "success", result: "" });
    });
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.initInfra(inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });
  it("init infra happy path with question model 2", async () => {
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    sandbox.stub(tools.ui, "selectOption").callsFake(async (config: SingleSelectConfig) => {
      if (config.name === "editor") {
        return ok({ type: "success", result: "vsc" });
      } else if (config.name === "capability") {
        return ok({ type: "success", result: "bot" });
      } else if (config.name === "proceed") {
        return ok({ type: "success", result: "true" });
      }
      return ok({ type: "success", result: "" });
    });
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.initInfra(inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });
  it("init infra happy path with question model 3", async () => {
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    sandbox.stub(tools.ui, "selectOption").callsFake(async (config: SingleSelectConfig) => {
      if (config.name === "editor") {
        return ok({ type: "success", result: "vs" });
      } else if (config.name === "capability") {
        return ok({ type: "success", result: "bot" });
      } else if (config.name === "proceed") {
        return ok({ type: "success", result: "true" });
      }
      return ok({ type: "success", result: "" });
    });
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.initInfra(inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });
  it("init debug happy path with question model", async () => {
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    sandbox.stub(tools.ui, "selectOption").callsFake(async (config: SingleSelectConfig) => {
      if (config.name === "editor") {
        return ok({ type: "success", result: "vs" });
      } else if (config.name === "capability") {
        return ok({ type: "success", result: "bot" });
      } else if (config.name === "proceed") {
        return ok({ type: "success", result: "true" });
      }
      return ok({ type: "success", result: "" });
    });
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.initDebug(inputs);
    if (res.isErr()) {
      console.log(res.error);
    }
    assert.isTrue(res.isOk());
  });
  it("init infra fail without projectPath", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.initInfra(inputs);
    assert.isTrue(res.isErr());
  });
  it("init infra fail without editor", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.initInfra(inputs);
    assert.isTrue(res.isErr());
  });
  it("init infra fail without capability", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      editor: "vsc",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.initInfra(inputs);
    assert.isTrue(res.isErr());
  });
  it("init debug happy path vsc", async () => {
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    sandbox.stub(fs, "pathExists").resolves(true);
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      editor: "vsc",
      capability: "tab",
      spfx: "true",
      proceed: "true",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.initDebug(inputs);
    assert.isTrue(res.isOk());
  });
  it("init debug happy path vs", async () => {
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(coordinator, "ensureTeamsFxInCsproj").resolves(ok(undefined));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      editor: "vs",
      capability: "tab",
      proceed: "true",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.initDebug(inputs);
    assert.isTrue(res.isOk());
  });
  it("init debug cancel", async () => {
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    sandbox.stub(fs, "pathExists").resolves(true);
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      editor: "vsc",
      capability: "tab",
      spfx: "true",
      proceed: "false",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.initDebug(inputs);
    assert.isTrue(res.isErr());
  });
  it("init debug template not found", async () => {
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      editor: "aaa",
      capability: "tab",
      spfx: "true",
      proceed: "true",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.initDebug(inputs);
    assert.isTrue(res.isErr());
  });
  it("init debug fail without projectPath", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.initDebug(inputs);
    assert.isTrue(res.isErr());
  });
  it("init debug fail without editor", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.initDebug(inputs);
    assert.isTrue(res.isErr());
  });

  it("init debug fail without capability", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      editor: "vsc",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.initDebug(inputs);
    assert.isTrue(res.isErr());
  });

  it("getSettings", async () => {
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
    const inputs: InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.getSettings(inputs);
    assert.isTrue(res.isOk());
  });
  it("preProvisionForVS", async () => {
    const mockProjectModel: ProjectModel = {
      registerApp: {
        name: "configureApp",
        driverDefs: [
          {
            uses: "arm/deploy",
            with: {
              subscriptionId: "mockSubId",
              resourceGroupName: "mockRG",
            },
          },
          {
            uses: "teamsApp/create",
            with: undefined,
          },
        ],
        run: async (ctx: DriverContext) => {
          return ok({
            env: new Map(),
            unresolvedPlaceHolders: [],
          });
        },
        resolvePlaceholders: () => {
          return [];
        },
        execute: async (ctx: DriverContext): Promise<ExecutionResult> => {
          return { result: ok(new Map()), summaries: [] };
        },
        resolveDriverInstances: mockedResolveDriverInstances,
      },
    };
    sandbox.stub(YamlParser.prototype, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "prod"]));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      env: "dev",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.preProvisionForVS(inputs);
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      const value = res.value;
      assert.isTrue(value.needAzureLogin);
      assert.isTrue(value.needM365Login);
      assert.equal(value.resolvedAzureSubscriptionId, "mockSubId");
      assert.equal(value.resolvedAzureResourceGroupName, "mockRG");
    }
  });
  it("provision select subscription cancel", async () => {
    const mockProjectModel: ProjectModel = {
      registerApp: {
        name: "configureApp",
        driverDefs: [
          {
            uses: "arm/deploy",
            with: undefined,
          },
          {
            uses: "teamsApp/create",
            with: undefined,
          },
        ],
        run: async (ctx: DriverContext) => {
          return ok({
            env: new Map(),
            unresolvedPlaceHolders: ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"],
          });
        },
        resolvePlaceholders: () => {
          return ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"];
        },
        execute: async (ctx: DriverContext): Promise<ExecutionResult> => {
          return { result: ok(new Map()), summaries: [] };
        },
        resolveDriverInstances: mockedResolveDriverInstances,
      },
    };
    sandbox.stub(YamlParser.prototype, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "prod"]));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "ensureM365TenantMatchesV3").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "getM365TenantId").resolves(
      ok({
        tenantIdInToken: "mockM365Tenant",
        tenantUserName: "mockM365UserName",
      })
    );
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "getIdentityCredentialAsync").resolves();
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription")
      .rejects(UserCancelError);
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      env: "dev",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.provisionResources(inputs);
    assert.isTrue(res.isErr());
  });

  it("getQuestionsForInit", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
    };
    const fxCore = new FxCore(tools);
    const res1 = await fxCore.getQuestions(Stage.initDebug, inputs);
    assert.isTrue(res1.isOk());
    const res2 = await fxCore.getQuestions(Stage.initInfra, inputs);
    assert.isTrue(res2.isOk());
  });
  describe("publishInDeveloperPortal", () => {
    afterEach(() => {
      sandbox.restore();
      if (mockedEnvRestore) {
        mockedEnvRestore();
      }
    });
    it("missing token provider", async () => {
      const context = createContextV3();
      context.tokenProvider = undefined;
      const inputs: InputsWithProjectPath = {
        platform: Platform.VSCode,
        projectPath: "project-path",
        [CoreQuestionNames.ManifestPath]: "manifest-path",
      };
      const res = await coordinator.publishInDeveloperPortal(context, inputs);
      assert.isTrue(res.isErr());
    });

    it("success", async () => {
      const context = createContextV3();
      context.tokenProvider = {
        m365TokenProvider: new MockM365TokenProvider(),
        azureAccountProvider: new MockAzureAccountProvider(),
      };
      sandbox
        .stub(context.tokenProvider.m365TokenProvider, "getJsonObject")
        .resolves(ok({ unique_name: "test" }));
      sandbox.stub(appStudio, "updateManifestV3ForPublish").resolves(ok("appId"));
      const openUrl = sandbox.stub(context.userInteraction, "openUrl").resolves(ok(true));
      const inputs: InputsWithProjectPath = {
        platform: Platform.VSCode,
        projectPath: "project-path",
        [CoreQuestionNames.ManifestPath]: "manifest-path",
      };

      const res = await coordinator.publishInDeveloperPortal(context, inputs);
      assert.isTrue(res.isOk());
      assert.isTrue(openUrl.calledOnce);
    });

    it("update manifest error", async () => {
      const context = createContextV3();
      context.tokenProvider = {
        m365TokenProvider: new MockM365TokenProvider(),
        azureAccountProvider: new MockAzureAccountProvider(),
      };
      sandbox
        .stub(appStudio, "updateManifestV3ForPublish")
        .resolves(err(new UserError("source", "error", "", "")));
      const inputs: InputsWithProjectPath = {
        platform: Platform.VSCode,
        projectPath: "project-path",
        [CoreQuestionNames.ManifestPath]: "manifest-path",
      };

      const res = await coordinator.publishInDeveloperPortal(context, inputs);
      assert.isTrue(res.isErr());
      if (res.isErr()) {
        assert.equal(res.error.name, "error");
      }
    });

    it("ensureTeamsFxInCsproj  no .csproj found", async () => {
      sandbox.stub(fs, "readdir").resolves([] as any);
      const res = await coordinator.ensureTeamsFxInCsproj(".");
      assert.isTrue(res.isOk());
    });

    it("ensureTeamsFxInCsproj success: do nothing for existing ItemGroup", async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Project Sdk="Microsoft.NET.Sdk">
        <ItemGroup>
          <ProjectCapability Include="TeamsFx"/>
        </ItemGroup>
      </Project>`;
      sandbox.stub(fs, "readdir").resolves(["test.csproj"] as any);
      sandbox.stub(fs, "readFile").resolves(xml as any);
      const res = await coordinator.ensureTeamsFxInCsproj(".");
      assert.isTrue(res.isOk());
    });

    it("ensureTeamsFxInCsproj success: insert one", async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Project Sdk="Microsoft.NET.Sdk">
      </Project>`;
      sandbox.stub(fs, "readdir").resolves(["test.csproj"] as any);
      sandbox.stub(fs, "readFile").resolves(xml as any);
      sandbox.stub(fs, "writeFile").resolves();
      const res = await coordinator.ensureTeamsFxInCsproj(".");
      assert.isTrue(res.isOk());
    });
  });
});
