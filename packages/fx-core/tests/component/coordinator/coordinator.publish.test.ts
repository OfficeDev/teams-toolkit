import "mocha";

import { assert } from "chai";
import { DotenvParseOutput } from "dotenv";
import fs from "fs-extra";
import * as sinon from "sinon";

import {
  err,
  Inputs,
  InputsWithProjectPath,
  IProgressHandler,
  ok,
  Platform,
} from "@microsoft/teamsfx-api";

import { MetadataV3, VersionInfo, VersionSource } from "../../../src/common/versionMetadata";
import {
  ExecutionError,
  ExecutionResult,
  ProjectModel,
} from "../../../src/component/configManager/interface";
import { coordinator } from "../../../src/component/coordinator";
import { DriverContext } from "../../../src/component/driver/interface/commonArgs";
import { createDriverContext } from "../../../src/component/driver/util/utils";
import { envUtil } from "../../../src/component/utils/envUtil";
import { metadataUtil } from "../../../src/component/utils/metadataUtil";
import { pathUtils } from "../../../src/component/utils/pathUtils";
import { FxCore } from "../../../src/core/FxCore";
import { setTools } from "../../../src/common/globalVars";
import * as v3MigrationUtils from "../../../src/core/middleware/utils/v3MigrationUtils";
import { MockTools } from "../../core/utils";
import { mockedResolveDriverInstances } from "./coordinator.test";

const versionInfo: VersionInfo = {
  version: MetadataV3.projectVersion,
  source: VersionSource.teamsapp,
};
describe("component coordinator test", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  setTools(tools);
  afterEach(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    sandbox.stub(v3MigrationUtils, "getProjectVersion").resolves(versionInfo);
  });
  it("publish happy path", async () => {
    const mockProjectModel: ProjectModel = {
      version: "1.0.0",
      publish: {
        name: "publish",
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
    sandbox.stub(metadataUtil, "parse").resolves(ok(mockProjectModel));
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
    const progressStartStub = sandbox.stub();
    const progressEndStub = sandbox.stub();
    sandbox.stub(tools.ui, "createProgressBar").returns({
      start: progressStartStub,
      end: progressEndStub,
    } as any as IProgressHandler);
    const showMessageStub = sandbox
      .stub(tools.ui, "showMessage")
      .callsFake(async (level, msg, modal, ...items) => {
        if (items.length > 0 && items[0].includes("admin portal")) {
          return ok(items[0]);
        }
        return ok("");
      });
    const openUrlStub = sandbox.stub(tools.ui, "openUrl").resolves(ok(true));
    sandbox.stub(pathUtils, "getEnvFilePath").resolves(ok("."));
    sandbox.stub(pathUtils, "getYmlFilePath").resolves(ok("teamsapp.yml"));
    sandbox.stub(fs, "pathExistsSync").onFirstCall().returns(false).onSecondCall().returns(true);
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      ignoreLockByUT: true,
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.publishApplication(inputs);
    assert.isTrue(res.isOk());
    assert.isTrue(showMessageStub.calledOnce);
    assert.isTrue(progressStartStub.calledOnce);
    assert.isTrue(progressEndStub.calledOnceWithExactly(true));
    assert.isTrue(openUrlStub.calledOnce);
  });
  it("publish happy path - CLI", async () => {
    const mockProjectModel: ProjectModel = {
      version: "1.0.0",
      publish: {
        name: "publish",
        driverDefs: [],
        resolvePlaceholders: () => {
          return [];
        },
        execute: async (ctx: DriverContext): Promise<ExecutionResult> => {
          return {
            result: err({
              kind: "Failure",
              error: { source: "test", timestamp: new Date() },
            } as ExecutionError),
            summaries: [],
          };
        },
        resolveDriverInstances: mockedResolveDriverInstances,
      },
    };
    sandbox.stub(metadataUtil, "parse").resolves(ok(mockProjectModel));
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
    const progressStartStub = sandbox.stub();
    const progressEndStub = sandbox.stub();
    sandbox.stub(tools.ui, "createProgressBar").returns({
      start: progressStartStub,
      end: progressEndStub,
    } as any as IProgressHandler);
    sandbox.stub(pathUtils, "getEnvFilePath").resolves(ok("."));
    sandbox.stub(pathUtils, "getYmlFilePath").resolves(ok("teamsapp.yml"));
    sandbox.stub(fs, "pathExistsSync").onFirstCall().returns(false).onSecondCall().returns(true);
    const inputs: Inputs = {
      platform: Platform.CLI,
      projectPath: ".",
      ignoreLockByUT: true,
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.publishApplication(inputs);
    assert.isTrue(res.isErr());
    assert.deepEqual(inputs.envVars, {} as DotenvParseOutput);
    assert.isTrue(progressStartStub.calledOnce);
    assert.isTrue(progressEndStub.calledOnceWithExactly(false));
  });
  it("publish happy path - no ui", async () => {
    const mockProjectModel: ProjectModel = {
      version: "1.0.0",
      publish: {
        name: "publish",
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
    const mockTools = new MockTools();
    mockTools.ui = undefined as any;
    sandbox.stub(metadataUtil, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "prod"]));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
    sandbox.stub(pathUtils, "getEnvFilePath").resolves(ok("."));
    sandbox.stub(pathUtils, "getYmlFilePath").resolves(ok("teamsapp.yml"));
    sandbox.stub(fs, "pathExistsSync").onFirstCall().returns(false).onSecondCall().returns(true);
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      ignoreLockByUT: true,
      env: "dev",
    };
    const fxCore = new FxCore(mockTools);
    const res = await fxCore.publishApplication(inputs);
    assert.isTrue(res.isOk());
  });
  it("publish happy path - VS - no ui", async () => {
    const mockProjectModel: ProjectModel = {
      version: "1.0.0",
      publish: {
        name: "publish",
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
    const mockTools = new MockTools();
    mockTools.ui = undefined as any;
    sandbox.stub(metadataUtil, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "prod"]));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
    sandbox.stub(pathUtils, "getEnvFilePath").resolves(ok("."));
    sandbox.stub(pathUtils, "getYmlFilePath").resolves(ok("teamsapp.yml"));
    sandbox.stub(fs, "pathExistsSync").onFirstCall().returns(false).onSecondCall().returns(true);
    const inputs: Inputs = {
      platform: Platform.VS,
      projectPath: ".",
      ignoreLockByUT: true,
      env: "dev",
    };
    const fxCore = new FxCore(mockTools);
    const res = await fxCore.publishApplication(inputs);
    assert.isTrue(res.isOk());
  });
  it("publish failed", async () => {
    const mockProjectModel: ProjectModel = {
      version: "1.0.0",
      publish: {
        name: "publish",
        driverDefs: [],
        resolvePlaceholders: () => {
          return [];
        },
        execute: async (ctx: DriverContext): Promise<ExecutionResult> => {
          return {
            result: err({
              kind: "Failure",
              error: { source: "test", timestamp: new Date() },
            } as ExecutionError),
            summaries: [],
          };
        },
        resolveDriverInstances: mockedResolveDriverInstances,
      },
    };
    sandbox.stub(metadataUtil, "parse").resolves(ok(mockProjectModel));
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
    const progressStartStub = sandbox.stub();
    const progressEndStub = sandbox.stub();
    sandbox.stub(tools.ui, "createProgressBar").returns({
      start: progressStartStub,
      end: progressEndStub,
    } as any as IProgressHandler);
    sandbox.stub(pathUtils, "getEnvFilePath").resolves(ok("."));
    sandbox.stub(pathUtils, "getYmlFilePath").resolves(ok("teamsapp.yml"));
    sandbox.stub(fs, "pathExistsSync").onFirstCall().returns(false).onSecondCall().returns(true);
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      ignoreLockByUT: true,
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.publishApplication(inputs);
    assert.isTrue(res.isErr());
    assert.deepEqual(inputs.envVars, {} as DotenvParseOutput);
    assert.isTrue(progressStartStub.calledOnce);
    assert.isTrue(progressEndStub.calledOnceWithExactly(false));
  });
  it("publish without progress bar", async () => {
    const mockProjectModel: ProjectModel = {
      version: "1.0.0",
      publish: {
        name: "publish",
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
    sandbox.stub(metadataUtil, "parse").resolves(ok(mockProjectModel));
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
    const progressStartStub = sandbox.stub();
    const progressEndStub = sandbox.stub();
    sandbox.stub(tools.ui, "createProgressBar").returns(undefined as any as IProgressHandler);
    const showMessageStub = sandbox.stub(tools.ui, "showMessage").resolves(ok(""));
    sandbox.stub(pathUtils, "getEnvFilePath").resolves(ok("."));
    sandbox.stub(pathUtils, "getYmlFilePath").resolves(ok("teamsapp.yml"));
    sandbox.stub(fs, "pathExistsSync").onFirstCall().returns(false).onSecondCall().returns(true);
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
      ignoreLockByUT: true,
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.publishApplication(inputs);
    assert.isTrue(res.isOk());
    assert.isTrue(showMessageStub.called);
    assert.isTrue(progressStartStub.notCalled);
    assert.isTrue(progressEndStub.notCalled);
  });
  it("provision lifecycle undefined", async () => {
    const mockProjectModel: ProjectModel = {
      version: "1.0.0",
    };
    sandbox.stub(metadataUtil, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(pathUtils, "getYmlFilePath").resolves(ok("teamsapp.yml"));
    const inputs: InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: ".",
      env: "dev",
      ignoreLockByUT: true,
    };
    const context = createDriverContext(inputs);
    const res = await coordinator.provision(context, inputs);
    assert.isTrue(res.isErr() && res.error.name === "LifeCycleUndefinedError");
  });
  it("deploy lifecycle undefined", async () => {
    const mockProjectModel: ProjectModel = {
      version: "1.0.0",
    };
    sandbox.stub(metadataUtil, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(pathUtils, "getYmlFilePath").resolves(ok("teamsapp.yml"));
    const inputs: InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: ".",
      env: "dev",
      ignoreLockByUT: true,
    };
    const context = createDriverContext(inputs);
    const res = await coordinator.deploy(context, inputs);
    assert.isTrue(res.isErr() && res.error.name === "LifeCycleUndefinedError");
  });
  it("publish lifecycle undefined", async () => {
    const mockProjectModel: ProjectModel = {
      version: "1.0.0",
    };
    sandbox.stub(metadataUtil, "parse").resolves(ok(mockProjectModel));
    sandbox.stub(pathUtils, "getYmlFilePath").resolves(ok("teamsapp.yml"));
    const inputs: InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: ".",
      env: "dev",
      ignoreLockByUT: true,
    };
    const context = createDriverContext(inputs);
    const res = await coordinator.publish(context, inputs);
    assert.isTrue(res.isErr() && res.error.name === "LifeCycleUndefinedError");
  });
});
