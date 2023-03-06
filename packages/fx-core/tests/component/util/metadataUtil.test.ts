import { err, FxError, LogProvider, ok, Result, SystemError } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import sinon from "sinon";
import { TelemetryEvent, TelemetryProperty } from "../../../src/common/telemetry";
import {
  DriverInstance,
  ExecutionResult,
  ProjectModel,
} from "../../../src/component/configManager/interface";
import { yamlParser } from "../../../src/component/configManager/parser";
import { DriverContext } from "../../../src/component/driver/interface/commonArgs";
import { MetadataUtil } from "../../../src/component/utils/metadataUtil";
import { setTools } from "../../../src/core/globalVars";
import { MockTools } from "../../core/utils";

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

describe("metadata util", () => {
  const sandbox = sinon.createSandbox();
  const mockedError = new SystemError("mockedSource", "mockedError", "mockedMessage");
  const mockProjectModel: ProjectModel = {
    registerApp: {
      name: "registerApp",
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
    environmentFolderPath: "./envs",
  };
  let tools: MockTools;

  beforeEach(() => {
    tools = new MockTools();
    setTools(tools);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should return YamlParsingError", async () => {
    sandbox.stub(yamlParser, "parse").resolves(err(mockedError));
    const util = new MetadataUtil();
    const result = await util.parse(".", "dev");
    assert(result.isErr() && result.error.name === "mockedError");
  });

  it("local config file", async () => {
    sandbox.stub(yamlParser, "parse").resolves(ok(mockProjectModel));
    const spy = sandbox.spy(tools.telemetryReporter, "sendTelemetryEvent");
    const util = new MetadataUtil();
    const result = await util.parse(".", "local");
    assert.isTrue(
      spy.calledOnceWith(TelemetryEvent.MetaData, {
        "configureApp.actions": "",
        "deploy.actions": "",
        "provision.actions": "",
        "publish.actions": "",
        "registerApp.actions": "armdeploy,teamsAppcreate",
        [TelemetryProperty.YmlName]: "teamsapplocalyml",
      })
    );
    assert(result.isOk());
  });

  it("dev config file", async () => {
    sandbox.stub(yamlParser, "parse").resolves(ok(mockProjectModel));
    const spy = sandbox.spy(tools.telemetryReporter, "sendTelemetryEvent");
    const util = new MetadataUtil();
    const result = await util.parse(".", "dev");
    assert.isTrue(
      spy.calledOnceWith(TelemetryEvent.MetaData, {
        "configureApp.actions": "",
        "deploy.actions": "",
        "provision.actions": "",
        "publish.actions": "",
        "registerApp.actions": "armdeploy,teamsAppcreate",
        [TelemetryProperty.YmlName]: "teamsappyml",
      })
    );
    assert(result.isOk());
  });
});
