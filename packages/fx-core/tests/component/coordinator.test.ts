import {
  err,
  Inputs,
  InputsWithProjectPath,
  ok,
  Platform,
  Result,
  UserError,
} from "@microsoft/teamsfx-api";
import "mocha";
import * as sinon from "sinon";
import { Generator } from "../../src/component/generator/generator";
import { settingsUtil } from "../../src/component/utils/settingsUtil";
import { setTools } from "../../src/core/globalVars";
import { CoreQuestionNames, ScratchOptionNo, ScratchOptionYes } from "../../src/core/question";
import { MockTools, randomAppName } from "../core/utils";
import { assert } from "chai";
import { TabOptionItem } from "../../src/component/constants";
import { FxCore } from "../../src/core/FxCore";
import mockedEnv, { RestoreFn } from "mocked-env";
import { YamlParser } from "../../src/component/configManager/parser";
import {
  ExecutionError,
  ExecutionOutput,
  ProjectModel,
} from "../../src/component/configManager/interface";
import { DriverContext } from "../../src/component/driver/interface/commonArgs";
import { envUtil } from "../../src/component/utils/envUtil";
import { provisionUtils } from "../../src/component/provisionUtils";
import { coordinator } from "../../src/component/coordinator";
import { resourceGroupHelper } from "../../src/component/utils/ResourceGroupHelper";

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
    const res2 = await fxCore.createProject(inputs);
    assert.isTrue(res2.isOk());
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
        execute: async (ctx: DriverContext): Promise<Result<ExecutionOutput, ExecutionError>> => {
          return ok(new Map());
        },
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
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription").resolves({
      subscriptionId: "mockSubId",
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
        execute: async (ctx: DriverContext): Promise<Result<ExecutionOutput, ExecutionError>> => {
          return ok(new Map());
        },
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
        execute: async (ctx: DriverContext): Promise<Result<ExecutionOutput, ExecutionError>> => {
          return ok(new Map());
        },
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
        execute: async (ctx: DriverContext): Promise<Result<ExecutionOutput, ExecutionError>> => {
          return ok(new Map());
        },
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
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription").resolves({
      subscriptionId: "mockSubId",
      tenantId: "mockTenantId",
      subscriptionName: "mockSubName",
    });
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
        execute: async (ctx: DriverContext): Promise<Result<ExecutionOutput, ExecutionError>> => {
          return ok(new Map());
        },
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
    sandbox.stub(tools.tokenProvider.azureAccountProvider, "getSelectedSubscription").resolves({
      subscriptionId: "mockSubId",
      tenantId: "mockTenantId",
      subscriptionName: "mockSubName",
    });
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
        execute: async (ctx: DriverContext): Promise<Result<ExecutionOutput, ExecutionError>> => {
          return ok(new Map());
        },
      },
    };
    sandbox.stub(YamlParser.prototype, "parse").resolves(ok(mockProjectModel));
    sandbox
      .stub(resourceGroupHelper, "createNewResourceGroup")
      .resolves(err(new UserError({ source: "test", name: "OtherError" })));
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "prod"]));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
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
    assert.isTrue(res.isErr());
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
        execute: async (ctx: DriverContext): Promise<Result<ExecutionOutput, ExecutionError>> => {
          return ok(new Map());
        },
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
        execute: async (ctx: DriverContext): Promise<Result<ExecutionOutput, ExecutionError>> => {
          return ok(new Map());
        },
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
        execute: async (ctx: DriverContext): Promise<Result<ExecutionOutput, ExecutionError>> => {
          return ok(new Map());
        },
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
        execute: async (ctx: DriverContext): Promise<Result<ExecutionOutput, ExecutionError>> => {
          return ok(new Map());
        },
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

  it("init infra", async () => {
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox.stub(settingsUtil, "readSettings").resolves(ok({ trackingId: "mockId", version: "1" }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.initInfra(inputs);
    assert.isTrue(res.isOk());
  });

  it("init infra without projectPath", async () => {
    const inputs: Inputs = {
      platform: Platform.VSCode,
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.initInfra(inputs);
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
});
