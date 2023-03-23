// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ContextV3, ok, TeamsAppManifest, Tools } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";
import { LocalEnvManager, TaskOverallLabel } from "@microsoft/teamsfx-core/build/common/local";
import { pathUtils, PathUtils } from "@microsoft/teamsfx-core/build/component/utils/pathUtils";
import { TelemetryEvent } from "@microsoft/teamsfx-core/build/common/telemetry";
import { Generator } from "@microsoft/teamsfx-core/build/component/generator/generator";
import { FeatureFlagName } from "@microsoft/teamsfx-core/build/common/constants";
import * as chai from "chai";
import * as path from "path";
import * as sinon from "sinon";
import * as vscode from "vscode";
import {
  getTaskInfo,
  ManifestSources,
  maskArrayValue,
  maskValue,
  sendDebugMetadataEvent,
} from "../../src/debug/localTelemetryReporter";
import * as globalVariables from "../../src/globalVariables";
import { MockLogProvier, MockTelemetryReporter, MockUserInteraction } from "./testUtils";
import * as fs from "fs-extra";
import * as nodeFs from "fs";
import * as chaiAsPromised from "chai-as-promised";
import * as tmp from "tmp";
import { actionName as createAppPackageActionName } from "@microsoft/teamsfx-core/build/component/driver/teamsApp/createAppPackage";
import { actionName as configureAppPackageActionName } from "@microsoft/teamsfx-core/build/component/driver/teamsApp/configure";
import { metadataUtil } from "@microsoft/teamsfx-core/build/component/utils/metadataUtil";
import { TelemetryProperty } from "../../src/telemetry/extTelemetryEvents";
import { yamlParser } from "@microsoft/teamsfx-core/build/component/configManager/parser";
import { PathLike } from "fs";
chai.use(chaiAsPromised);

describe("LocalTelemetryReporter", () => {
  describe("maskValue()", () => {
    it("mask undefined value without known values", () => {
      const res = maskValue(undefined);
      chai.assert.equal(res, "<undefined>");
    });

    it("mask unknown value without known values", () => {
      const res = maskValue("unknown test value");
      chai.assert.equal(res, "<unknown>");
    });

    it("mask undefined value with string known values", () => {
      const res = maskValue(undefined, ["test known value"]);
      chai.assert.equal(res, "<undefined>");
    });

    it("mask unknown value with string known values", () => {
      const res = maskValue("unknown test value", ["test known value"]);
      chai.assert.equal(res, "<unknown>");
    });

    it("mask known value with string known values", () => {
      const res = maskValue("test known value", ["test known value"]);
      chai.assert.equal(res, "test known value");
    });

    it("mask undefined value with mask value", () => {
      const res = maskValue(undefined, [{ value: "test known value", mask: "<default>" }]);
      chai.assert.equal(res, "<undefined>");
    });

    it("mask unknown value with mask values", () => {
      const res = maskValue("unknown test value", [
        { value: "test known value", mask: "<default>" },
      ]);
      chai.assert.equal(res, "<unknown>");
    });

    it("mask known value with mask values", () => {
      const res = maskValue("test known value", [{ value: "test known value", mask: "<default>" }]);
      chai.assert.equal(res, "<default>");
    });
  });

  describe("maskArrayValue()", () => {
    it("mask undefined value without known values", () => {
      const res = maskArrayValue(undefined);
      chai.assert.equal(res, "<undefined>");
    });

    it("mask empty array value without known values", () => {
      const res = maskArrayValue([]);
      chai.assert.sameDeepOrderedMembers(res as string[], []);
    });

    it("mask unknown array value without known values", () => {
      const res = maskArrayValue(["unknown test value1", "unknown test value2"]);
      chai.assert.sameDeepOrderedMembers(res as string[], ["<unknown>", "<unknown>"]);
    });

    it("mask values with string known values", () => {
      const res = maskArrayValue(["test known value", "unknown test value"], ["test known value"]);
      chai.assert.sameDeepOrderedMembers(res as string[], ["test known value", "<unknown>"]);
    });

    it("mask values with mask value", () => {
      const res = maskArrayValue(
        ["test known value"],
        [{ value: "test known value", mask: "<default>" }]
      );
      chai.assert.sameDeepOrderedMembers(res as string[], ["<default>"]);
    });
  });

  describe("getTaskInfo()", () => {
    afterEach(async () => {
      sinon.restore();
    });

    it("Failed to get task.json", async () => {
      sinon.stub(globalVariables, "isTeamsFxProject").value(true);
      sinon
        .stub(globalVariables, "workspaceUri")
        .value(vscode.Uri.parse(path.resolve(__dirname, "unknown")));
      sinon.stub(LocalEnvManager.prototype, "getTaskJson").returns(Promise.resolve(undefined));
      const res = await getTaskInfo();
      chai.assert.isUndefined(res);
    });

    it("Failed to get renamed label", async () => {
      sinon.stub(globalVariables, "isTeamsFxProject").value(true);
      sinon
        .stub(globalVariables, "workspaceUri")
        .value(vscode.Uri.parse(path.resolve(__dirname, "data", "renameLabel")));
      const res = await getTaskInfo();
      chai.assert.isEmpty(res?.PreLaunchTaskInfo);
      chai.assert.isFalse(res?.IsTransparentTask);
    });

    it("task.json of old tab project", async () => {
      sinon.stub(globalVariables, "isTeamsFxProject").value(true);
      sinon
        .stub(globalVariables, "workspaceUri")
        .value(vscode.Uri.parse(path.resolve(__dirname, "data", "oldTab")));
      const res = await getTaskInfo();
      chai.assert.exists(res?.PreLaunchTaskInfo);
      chai.assert.sameDeepOrderedMembers(
        res?.PreLaunchTaskInfo?.[TaskOverallLabel.NextDefault] ?? [],
        [
          {
            command: "<unknown>",
            label: "<unknown>",
            type: "<unknown>",
          },
          {
            command: "<unknown>",
            label: "<unknown>",
            type: "<unknown>",
          },
          {
            command: "<undefined>",
            label: "<unknown>",
            type: "<undefined>",
          },
        ]
      );
      chai.assert.isFalse(res?.IsTransparentTask);
    });

    it("task.json of a tab + bot + func project", async () => {
      sinon.stub(globalVariables, "isTeamsFxProject").value(true);
      sinon
        .stub(globalVariables, "workspaceUri")
        .value(vscode.Uri.parse(path.resolve(__dirname, "data", "tabbotfunc")));
      const res = await getTaskInfo();
      chai.assert.isTrue(res?.IsTransparentTask);
      chai.assert.isUndefined(res?.PreLaunchTaskInfo?.[TaskOverallLabel.TransparentM365]);
      chai.assert.exists(res?.PreLaunchTaskInfo?.[TaskOverallLabel.TransparentDefault]);
      chai.assert.sameDeepOrderedMembers(
        res?.PreLaunchTaskInfo?.[TaskOverallLabel.TransparentDefault] ?? [],
        [
          {
            command: "debug-check-prerequisites",
            label: "Validate & install prerequisites",
            type: "teamsfx",
          },
          {
            command: "debug-npm-install",
            label: "Install npm packages",
            type: "teamsfx",
          },
          {
            command: "debug-start-local-tunnel",
            label: "Start local tunnel",
            type: "teamsfx",
          },
          {
            command: "debug-set-up-tab",
            label: "Set up tab",
            type: "teamsfx",
          },
          {
            command: "debug-set-up-bot",
            label: "Set up bot",
            type: "teamsfx",
          },
          {
            command: "debug-set-up-sso",
            label: "Set up SSO",
            type: "teamsfx",
          },
          {
            command: "debug-prepare-manifest",
            label: "Build & upload Teams manifest",
            type: "teamsfx",
          },
          {
            command: "<undefined>",
            label: "Start services",
            type: "<undefined>",
          },
        ]
      );
    });

    it("task.json of a m365 project", async () => {
      sinon.stub(globalVariables, "isTeamsFxProject").value(true);
      sinon
        .stub(globalVariables, "workspaceUri")
        .value(vscode.Uri.parse(path.resolve(__dirname, "data", "m365")));
      const res = await getTaskInfo();
      chai.assert.isTrue(res?.IsTransparentTask);
      chai.assert.exists(res?.PreLaunchTaskInfo?.[TaskOverallLabel.TransparentM365]);
      chai.assert.sameDeepOrderedMembers(
        res?.PreLaunchTaskInfo?.[TaskOverallLabel.TransparentM365] ?? [],
        [
          {
            command: "debug-check-prerequisites",
            label: "Validate & install prerequisites",
            type: "teamsfx",
          },
          {
            command: "debug-npm-install",
            label: "Install npm packages",
            type: "teamsfx",
          },
          {
            command: "debug-set-up-tab",
            label: "Set up tab",
            type: "teamsfx",
          },
          {
            command: "debug-set-up-sso",
            label: "Set up SSO",
            type: "teamsfx",
          },
          {
            command: "debug-prepare-manifest",
            label: "Build & upload Teams manifest",
            type: "teamsfx",
          },
          {
            command: "<undefined>",
            label: "Start services",
            type: "<undefined>",
          },
          {
            command: "<unknown>",
            label: "Install app in Teams",
            type: "<unknown>",
          },
        ]
      );
      chai.assert.exists(res?.PreLaunchTaskInfo?.[TaskOverallLabel.TransparentDefault]);
      chai.assert.sameDeepOrderedMembers(
        res?.PreLaunchTaskInfo?.[TaskOverallLabel.TransparentDefault] ?? [],
        [
          {
            command: "debug-check-prerequisites",
            label: "Validate & install prerequisites",
            type: "teamsfx",
          },
          {
            command: "debug-npm-install",
            label: "Install npm packages",
            type: "teamsfx",
          },
          {
            command: "debug-set-up-tab",
            label: "Set up tab",
            type: "teamsfx",
          },
          {
            command: "debug-set-up-sso",
            label: "Set up SSO",
            type: "teamsfx",
          },
          {
            command: "debug-prepare-manifest",
            label: "Build & upload Teams manifest",
            type: "teamsfx",
          },
          {
            command: "<undefined>",
            label: "Start services",
            type: "<undefined>",
          },
        ]
      );
    });
    it("task.json of user customized project", async () => {
      sinon.stub(globalVariables, "isTeamsFxProject").value(true);
      sinon
        .stub(globalVariables, "workspaceUri")
        .value(vscode.Uri.parse(path.resolve(__dirname, "data", "customized")));
      const res = await getTaskInfo();
      chai.assert.isTrue(res?.IsTransparentTask);
      chai.assert.isUndefined(res?.PreLaunchTaskInfo?.[TaskOverallLabel.TransparentM365]);
      chai.assert.exists(res?.PreLaunchTaskInfo?.[TaskOverallLabel.TransparentDefault]);
      chai.assert.sameDeepOrderedMembers(
        res?.PreLaunchTaskInfo?.[TaskOverallLabel.TransparentDefault] ?? [],
        [
          {
            command: "debug-npm-install",
            label: "Install npm packages",
            type: "teamsfx",
          },
          {
            command: "<unknown>",
            label: "<unknown>",
            type: "<unknown>",
          },
          {
            command: "debug-set-up-tab",
            label: "<unknown>",
            type: "teamsfx",
          },
          {
            command: "debug-set-up-bot",
            label: "<unknown>",
            type: "teamsfx",
          },
          {
            command: "debug-set-up-sso",
            label: "Set up SSO",
            type: "teamsfx",
          },
          {
            command: "debug-prepare-manifest",
            label: "Build & upload Teams manifest",
            type: "teamsfx",
          },
          {
            command: "<undefined>",
            label: "Start services",
            type: "<undefined>",
          },
        ]
      );
    });
  });
});

describe("sendDebugMetadataEvent()", () => {
  let mockReporter: MockTelemetryReporter;
  let sandbox: sinon.SinonSandbox;
  let mockCtx: ContextV3;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    const ui = new MockUserInteraction();
    mockReporter = new MockTelemetryReporter();
    const mockTools = { telemetryReporter: mockReporter, ui } as any as Tools;
    // call setTools in constructor
    new FxCore(mockTools);

    mockCtx = {
      logProvider: new MockLogProvier(),
      templateVariables: Generator.getDefaultVariables("test-mock-app"),
    } as ContextV3;
    // force generating template files from source code rather than GitHub
    sandbox.stub(process, "env").value({
      [FeatureFlagName.DebugTemplate]: "true",
      NODE_ENV: "development",
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("Notification bot happy path", async () => {
    let projectPath: string;
    {
      const tmpobj = tmp.dirSync({ unsafeCleanup: true });
      projectPath = tmpobj.name;
      after(() => {
        tmpobj.removeCallback();
      });
      const result = await Generator.generateTemplate(
        mockCtx,
        tmpobj.name,
        "notification-restify",
        "js"
      );
      chai.assert.isTrue(result.isOk());
    }

    // prevent being affected by events sent from previous actions
    mockReporter.resetEvents();
    await sendDebugMetadataEvent(projectPath);

    // Assert
    chai.assert.equal(mockReporter.events.length, 2);
    // yaml metadata event
    chai.assert.equal(mockReporter.events[0].eventName, TelemetryEvent.MetaData);
    chai.assert.equal(mockReporter.events[0].properties?.["yml-name"], "teamsapplocalyml");

    const actionList = mockReporter.events[0].properties?.["provision.actions"]?.split(",");
    chai.assert.isNotEmpty(actionList);
    chai.assert.include(actionList!, configureAppPackageActionName.replace(/\//g, ""));
    chai.assert.include(actionList!, createAppPackageActionName.replace(/\//g, ""));

    // manifest metdata event
    chai.assert.equal(mockReporter.events[1].eventName, TelemetryEvent.MetaData);
    chai.assert.isNotEmpty(mockReporter.events[1].properties?.["manifest.id"]);
    chai.assert.isNotEmpty(mockReporter.events[1].properties?.["manifest.bots"]);
    chai.assert.equal(
      mockReporter.events[1].properties?.[TelemetryProperty.DebugMetadataSource],
      ManifestSources.ConfigureAppPackageManifestPath
    );
  });

  it("Notification bot user manually build & upload manifest", async () => {
    let projectPath: string;
    {
      const tmpobj = tmp.dirSync({ unsafeCleanup: true });
      projectPath = tmpobj.name;
      after(() => {
        tmpobj.removeCallback();
      });
      const result = await Generator.generateTemplate(
        mockCtx,
        tmpobj.name,
        "notification-restify",
        "js"
      );
      chai.assert.isTrue(result.isOk());
    }

    sandbox.stub(metadataUtil, "parse").resolves(ok({}));

    // prevent being affected by events sent from previous actions
    mockReporter.resetEvents();
    await sendDebugMetadataEvent(projectPath);
    chai.assert.equal(mockReporter.events.length, 1);
    chai.assert.equal(mockReporter.events[0].eventName, TelemetryEvent.MetaData);
    chai.assert.isNotEmpty(mockReporter.events[0].properties?.["manifest.id"]);
    chai.assert.isNotEmpty(mockReporter.events[0].properties?.["manifest.bots"]);
    chai.assert.equal(
      mockReporter.events[0].properties?.[TelemetryProperty.DebugMetadataSource],
      ManifestSources.DefaultManifestPath
    );
  });

  it("SSO tab happy path", async () => {
    let projectPath: string;
    {
      const tmpobj = tmp.dirSync({ unsafeCleanup: true });
      projectPath = tmpobj.name;
      after(() => {
        tmpobj.removeCallback();
      });
      const result = await Generator.generateTemplate(mockCtx, tmpobj.name, "sso-tab", "js");
      chai.assert.isTrue(result.isOk());
    }

    // prevent being affected by events sent from previous actions
    mockReporter.resetEvents();
    await sendDebugMetadataEvent(projectPath);

    // Assert
    chai.assert.equal(mockReporter.events.length, 2);
    // yaml metadata event
    chai.assert.equal(mockReporter.events[0].eventName, TelemetryEvent.MetaData);
    chai.assert.equal(mockReporter.events[0].properties?.["yml-name"], "teamsapplocalyml");

    const actionList = mockReporter.events[0].properties?.["provision.actions"]?.split(",");
    chai.assert.isNotEmpty(actionList);
    chai.assert.include(actionList!, configureAppPackageActionName.replace(/\//g, ""));
    chai.assert.include(actionList!, createAppPackageActionName.replace(/\//g, ""));

    // manifest metdata event
    chai.assert.equal(mockReporter.events[1].eventName, TelemetryEvent.MetaData);
    chai.assert.isNotEmpty(mockReporter.events[1].properties?.["manifest.id"]);
    chai.assert.isNotEmpty(mockReporter.events[1].properties?.["manifest.staticTabs.contentUrl"]);
    chai.assert.isNotEmpty(
      mockReporter.events[1].properties?.["manifest.configurableTabs.configurationUrl"]
    );
    chai.assert.isNotEmpty(mockReporter.events[1].properties?.["manifest.webApplicationInfo.id"]);
    chai.assert.equal(
      mockReporter.events[1].properties?.[TelemetryProperty.DebugMetadataSource],
      ManifestSources.ConfigureAppPackageManifestPath
    );
  });

  describe("Telemetry failure should not block execution", () => {
    let projectPath: string;
    beforeEach(async () => {
      {
        const tmpobj = tmp.dirSync({ unsafeCleanup: true });
        projectPath = tmpobj.name;
        after(() => {
          tmpobj.removeCallback();
        });
        const result = await Generator.generateTemplate(
          mockCtx,
          tmpobj.name,
          "notification-restify",
          "js"
        );
        chai.assert.isTrue(result.isOk());
      }
    });

    it("Should not throw error on failure: pathUtils.getYmlFilePath()", async () => {
      const stub = sandbox.stub(pathUtils, "getYmlFilePath").throws(new Error("Mock error"));
      after(() => stub.reset());
      await sendDebugMetadataEvent(projectPath);
    });

    it("Should not throw error on failure: metadataUtil.parse()", async () => {
      const stub = sandbox.stub(metadataUtil, "parse").throws(new Error("Mock error"));
      after(() => stub.reset());
      await sendDebugMetadataEvent(projectPath);
    });

    it("Should not throw error on failure: metadataUtil.parseManifest()", async () => {
      const stub = sandbox.stub(metadataUtil, "parseManifest").throws(new Error("Mock error"));
      after(() => stub.reset());
      await sendDebugMetadataEvent(projectPath);
    });

    it("Should not throw error on failure: fs.readJson()", async () => {
      const stub = sandbox.stub(fs, "readJson").throws(new Error("Mock error"));
      after(() => stub.reset());
      await sendDebugMetadataEvent(projectPath);
    });
  });
});
