import * as chai from "chai";

import * as sinon from "sinon";

import * as fs from "fs-extra";

import * as os from "os";

import * as commonUtils from "../../src/utils/commonUtils";

import * as extensionPackage from "../../package.json";
import path = require("path");
import {
  ConfigFolderName,
  InputConfigsFolderName,
  ok,
  ProjectSettingsFileName,
} from "@microsoft/teamsfx-api";
import * as globalVariables from "../../src/globalVariables";
import { Uri } from "vscode";
import * as tmp from "tmp";
import { TelemetryProperty, TelemetryTriggerFrom } from "../../src/telemetry/extTelemetryEvents";
import { expect } from "chai";
import * as commonTools from "@microsoft/teamsfx-core/build/common/tools";
import { envUtil } from "@microsoft/teamsfx-core/build/component/utils/envUtil";

describe("CommonUtils", () => {
  describe("getPackageVersion", () => {
    it("alpha version", () => {
      const version = "1.1.1-alpha.4";

      chai.expect(commonUtils.getPackageVersion(version)).equals("alpha");
    });

    it("beta version", () => {
      const version = "1.1.1-beta.2";

      chai.expect(commonUtils.getPackageVersion(version)).equals("beta");
    });

    it("rc version", () => {
      const version = "1.0.0-rc.3";

      chai.expect(commonUtils.getPackageVersion(version)).equals("rc");
    });

    it("formal version", () => {
      const version = "4.6.0";

      chai.expect(commonUtils.getPackageVersion(version)).equals("formal");
    });
  });

  describe("isFeatureFlag", () => {
    it("return true when enabled", () => {
      sinon.stub(extensionPackage, "featureFlag").value("true");

      chai.expect(commonUtils.isFeatureFlag()).equals(true);

      sinon.restore();
    });

    it("return false when disabled", () => {
      sinon.stub(extensionPackage, "featureFlag").value("false");

      chai.expect(commonUtils.isFeatureFlag()).equals(false);

      sinon.restore();
    });
  });

  describe("sleep", () => {
    it("sleep should be accurate", async () => {
      const start = Date.now();

      commonUtils.sleep(1000).then(() => {
        const millis = Date.now() - start;

        chai.expect(millis).gte(1000);

        chai.expect(millis).lte(1100);
      });
    });
  });

  describe("os assertion", () => {
    it("should return exactly result according to os.type", async () => {
      sinon.stub(os, "type").returns("Windows_NT");

      chai.expect(commonUtils.isWindows()).equals(true);

      sinon.restore();

      sinon.stub(os, "type").returns("Linux");

      chai.expect(commonUtils.isLinux()).equals(true);

      sinon.restore();

      sinon.stub(os, "type").returns("Darwin");

      chai.expect(commonUtils.isMacOS()).equals(true);

      sinon.restore();
    });
  });

  describe("getProjectId", async () => {
    const sandbox = sinon.createSandbox();

    let workspacePath: string;
    let cleanupCallback: (() => void) | undefined;

    function createOldProjectSettings() {
      const filePath = path.join(workspacePath, `.${ConfigFolderName}`, "settings.json");
      fs.ensureDirSync(path.dirname(filePath));
      fs.writeJsonSync(filePath, {
        solutionSettings: {
          hostType: "azure",
        },
        projectId: "old",
      });
    }
    function createNewProjectSettings() {
      const filePath = path.join(
        workspacePath,
        `.${ConfigFolderName}`,
        InputConfigsFolderName,
        ProjectSettingsFileName
      );
      fs.ensureDirSync(path.dirname(filePath));
      fs.writeJsonSync(filePath, {
        solutionSettings: {
          hostType: "azure",
        },
        projectId: "new",
      });
    }

    beforeEach(() => {
      // Use real file system instead of stub because of cross-package stub issues of ES6 import
      // https://github.com/sinonjs/sinon/issues/1711
      const { name, removeCallback } = tmp.dirSync({ unsafeCleanup: true });
      cleanupCallback = removeCallback;
      workspacePath = name;
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file(workspacePath));
    });

    afterEach(() => {
      if (cleanupCallback) {
        cleanupCallback();
      }
    });

    before(() => {
      // stub existsSync for other project files besides project settings file
      sandbox.stub(fs, "existsSync").callsFake((pathLike: fs.PathLike) => {
        const _path = pathLike.toString();
        return _path.includes("real");
      });
    });

    after(() => {
      sandbox.restore();
    });

    it("Multi env enabled and both new files and old files exist", async () => {
      createOldProjectSettings();
      createNewProjectSettings();
      const result = commonUtils.getProjectId();
      chai.expect(result).equals("new");
    });
    it("Multi env enabled and only new files exist", async () => {
      createNewProjectSettings();
      const result = commonUtils.getProjectId();
      chai.expect(result).equals("new");
    });
    it("Multi env enabled and only old files exist", async () => {
      createOldProjectSettings();
      const result = commonUtils.getProjectId();
      chai.expect(result).equals("old");
    });
    it("Multi env enabled and neither new nor old files exist", async () => {
      const result = commonUtils.getProjectId();
      chai.expect(result).equals(undefined);
    });

    it("undefined workspace uri", () => {
      sandbox.restore();
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file(workspacePath));

      const result = commonUtils.getProjectId();
      chai.expect(result).equals(undefined);
    });

    describe("menus", async () => {
      it("preview", async () => {
        const previewCommand = extensionPackage.contributes.menus["editor/title"].find(
          (x) => x.command === "fx-extension.openPreviewFile"
        );
        chai.assert.isTrue(previewCommand !== undefined);
        chai.assert.isTrue(previewCommand?.when.includes("manifest.template.json"));
      });
    });
  });

  describe("isTriggerFromWalkThrough", () => {
    it("Should return false with no args", () => {
      const isFromWalkthrough = commonUtils.isTriggerFromWalkThrough();

      chai.assert.equal(isFromWalkthrough, false);
    });

    it("Should return false with empty args", () => {
      const isFromWalkthrough = commonUtils.isTriggerFromWalkThrough([]);

      chai.assert.equal(isFromWalkthrough, false);
    });

    it("Should return true with walkthrough args", () => {
      const isFromWalkthrough = commonUtils.isTriggerFromWalkThrough([
        TelemetryTriggerFrom.WalkThrough,
      ]);

      chai.assert.equal(isFromWalkthrough, true);
    });

    it("Should return true with notification args", () => {
      const isFromWalkthrough = commonUtils.isTriggerFromWalkThrough([
        TelemetryTriggerFrom.Notification,
      ]);

      chai.assert.equal(isFromWalkthrough, true);
    });

    it("Should return false with other args", () => {
      const isFromWalkthrough = commonUtils.isTriggerFromWalkThrough([TelemetryTriggerFrom.Other]);

      chai.assert.equal(isFromWalkthrough, false);
    });
  });

  describe("getTriggerFromProperty", () => {
    it("Should return cmp with no args", () => {
      const props = commonUtils.getTriggerFromProperty();

      expect(props).to.deep.equal({
        [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.CommandPalette,
      });
    });

    it("Should return cmp with empty args", () => {
      const props = commonUtils.getTriggerFromProperty([]);

      expect(props).to.deep.equal({
        [TelemetryProperty.TriggerFrom]: TelemetryTriggerFrom.CommandPalette,
      });
    });

    for (const triggerFrom of [
      TelemetryTriggerFrom.Auto,
      TelemetryTriggerFrom.CodeLens,
      TelemetryTriggerFrom.EditorTitle,
      TelemetryTriggerFrom.Webview,
      TelemetryTriggerFrom.Notification,
      TelemetryTriggerFrom.Other,
      TelemetryTriggerFrom.QuickPick,
      TelemetryTriggerFrom.SideBar,
      TelemetryTriggerFrom.TreeView,
      TelemetryTriggerFrom.Unknow,
      TelemetryTriggerFrom.ViewTitleNavigation,
      TelemetryTriggerFrom.WalkThrough,
    ]) {
      it(`Should return ${triggerFrom.toString()}`, () => {
        const props = commonUtils.getTriggerFromProperty([triggerFrom]);

        expect(props).to.deep.equal({
          [TelemetryProperty.TriggerFrom]: triggerFrom,
        });
      });
    }
  });

  describe("get app name", () => {
    const sandbox = sinon.createSandbox();
    afterEach(() => {
      sandbox.restore();
    });
    it("get app name successfully - v2", () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(fs, "readFileSync").returns('{ "appName": "name"}');
      sandbox.stub(commonTools, "isV3Enabled").returns(false);

      const res = commonUtils.getAppName();
      expect(res).equal("name");
    });

    it("throw exception - v2", () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(fs, "readFileSync").throws();
      sandbox.stub(commonTools, "isV3Enabled").returns(false);

      const res = commonUtils.getAppName();
      expect(res).equal(undefined);
    });

    it("get app name successfully - v3", () => {
      const ymlData = `# Triggered when 'teamsfx provision' is executed
      registerApp:
        - uses: aadApp/create # Creates a new AAD app to authenticate users if AAD_APP_CLIENT_ID environment variable is empty
          with:
            name: appNameTest-aad
      
        - uses: teamsApp/create # Creates a Teams app
          with:
            name: appNameTest-\${{TEAMSFX_ENV}} # Teams app name
      `;
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(fs, "readFileSync").returns(ymlData);
      sandbox.stub(commonTools, "isV3Enabled").returns(true);

      const res = commonUtils.getAppName();
      expect(res).equal("appNameTest");
    });

    it("throw exception - v3", () => {
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(fs, "readFileSync").throws();
      sandbox.stub(commonTools, "isV3Enabled").returns(true);

      const res = commonUtils.getAppName();
      expect(res).equal(undefined);
    });
  });

  describe("getProvisionSucceedFromEnv", () => {
    const sandbox = sinon.createSandbox();

    afterEach(() => {
      sandbox.restore();
    });

    it("returns false if teamsAppId is empty", async () => {
      sandbox.stub(commonTools, "isV3Enabled").returns(true);
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(envUtil, "readEnv").resolves(
        ok({
          TEAMS_APP_ID: "",
        })
      );

      const result = await commonUtils.getProvisionSucceedFromEnv("test");

      chai.expect(result).equals(false);
    });

    it("returns true if teamsAppId is not empty", async () => {
      sandbox.stub(commonTools, "isV3Enabled").returns(true);
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(envUtil, "readEnv").resolves(
        ok({
          TEAMS_APP_ID: "xxx",
        })
      );

      const result = await commonUtils.getProvisionSucceedFromEnv("test");

      chai.expect(result).equals(true);
    });

    it("returns false if teamsAppId has error", async () => {
      sandbox.stub(commonTools, "isV3Enabled").returns(true);
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file("test"));
      sandbox.stub(envUtil, "readEnv").resolves(ok({}));

      const result = await commonUtils.getProvisionSucceedFromEnv("test");

      chai.expect(result).equals(false);
    });
  });
});
