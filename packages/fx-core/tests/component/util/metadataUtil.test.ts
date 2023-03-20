import {
  err,
  FxError,
  LogProvider,
  ok,
  Result,
  SystemError,
  TeamsAppManifest,
} from "@microsoft/teamsfx-api";
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
import { createHash } from "crypto";

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

  it("parseManifest with empty manifest", () => {
    const util = new MetadataUtil();
    const spy = sandbox.spy(tools.telemetryReporter, "sendTelemetryEvent");
    util.parseManifest({} as TeamsAppManifest);

    assert.isTrue(
      spy.calledOnceWith(TelemetryEvent.MetaData, {
        "manifest.id": "",
        "manifest.version": "",
        "manifest.manifestVersion": "",
        "manifest.bots": "",
        "manifest.staticTabs.contentUrl": "",
        "manifest.configurableTabs.configurationUrl": "",
        "manifest.webApplicationInfo.id": "",
      })
    );
  });

  it("parseManifest with full manifest", () => {
    const manifest = {
      id: "test-id",
      version: "1.0",
      manifestVersion: "1.0",
      bots: [{ botId: "bot1" }, { botId: "bot2" }],
      staticTabs: [
        { contentUrl: "https://example.com/tab1" },
        { contentUrl: "https://example.com/tab2" },
      ],
      configurableTabs: [{ configurationUrl: "https://example.com/config1" }],
      webApplicationInfo: { id: "web-app-id" },
    };
    const util = new MetadataUtil();
    const spy = sandbox.spy(tools.telemetryReporter, "sendTelemetryEvent");

    util.parseManifest(manifest as TeamsAppManifest);

    assert.isTrue(
      spy.calledOnceWith(TelemetryEvent.MetaData, {
        "manifest.id": "test-id",
        "manifest.version": "1.0",
        "manifest.manifestVersion": "1.0",
        "manifest.bots": "bot1,bot2",
        "manifest.staticTabs.contentUrl": `${[
          createHash("sha256").update(manifest.staticTabs[0].contentUrl).digest("base64"),
          createHash("sha256").update(manifest.staticTabs[1].contentUrl).digest("base64"),
        ].toString()}`,
        "manifest.configurableTabs.configurationUrl": `${createHash("sha256")
          .update(manifest.configurableTabs[0].configurationUrl)
          .digest("base64")}`,
        "manifest.webApplicationInfo.id": "web-app-id",
      })
    );
  });
});
