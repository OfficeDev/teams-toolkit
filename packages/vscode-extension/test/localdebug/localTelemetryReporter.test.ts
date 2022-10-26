// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { LocalEnvManager, TaskOverallLabel } from "@microsoft/teamsfx-core/build/common/local";
import * as chai from "chai";
import * as path from "path";
import * as sinon from "sinon";
import * as vscode from "vscode";
import { getTaskInfo, maskArrayValue, maskValue } from "../../src/debug/localTelemetryReporter";
import * as globalVariables from "../../src/globalVariables";

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
