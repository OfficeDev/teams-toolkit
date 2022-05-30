import * as chai from "chai";

import * as sinon from "sinon";

import * as fs from "fs-extra";

import * as os from "os";

import * as commonUtils from "../../../src/utils/commonUtils";

import * as extensionPackage from "../../../package.json";
import path = require("path");
import {
  ConfigFolderName,
  InputConfigsFolderName,
  ProjectSettingsFileName,
} from "@microsoft/teamsfx-api";
import * as globalVariables from "../../../src/globalVariables";
import { Uri } from "vscode";
import * as tmp from "tmp";

suite("CommonUtils", () => {
  suite("getPackageVersion", () => {
    test("alpha version", () => {
      const version = "1.1.1-alpha.4";

      chai.expect(commonUtils.getPackageVersion(version)).equals("alpha");
    });

    test("beta version", () => {
      const version = "1.1.1-beta.2";

      chai.expect(commonUtils.getPackageVersion(version)).equals("beta");
    });

    test("rc version", () => {
      const version = "1.0.0-rc.3";

      chai.expect(commonUtils.getPackageVersion(version)).equals("rc");
    });

    test("formal version", () => {
      const version = "4.6.0";

      chai.expect(commonUtils.getPackageVersion(version)).equals("formal");
    });
  });

  suite("isFeatureFlag", () => {
    test("return true when enabled", () => {
      sinon.stub(extensionPackage, "featureFlag").value("true");

      chai.expect(commonUtils.isFeatureFlag()).equals(true);

      sinon.restore();
    });

    test("return false when disabled", () => {
      sinon.stub(extensionPackage, "featureFlag").value("false");

      chai.expect(commonUtils.isFeatureFlag()).equals(false);

      sinon.restore();
    });
  });

  suite("sleep", () => {
    test("sleep should be accurate", async () => {
      const start = Date.now();

      commonUtils.sleep(1000).then(() => {
        const millis = Date.now() - start;

        chai.expect(millis).gte(1000);

        chai.expect(millis).lte(1100);
      });
    });
  });

  suite("os assertion", () => {
    test("should return exactly result according to os.type", async () => {
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

  suite("getProjectId", async () => {
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

    setup(() => {
      // Use real file system instead of stub because of cross-package stub issues of ES6 import
      // https://github.com/sinonjs/sinon/issues/1711
      const { name, removeCallback } = tmp.dirSync({ unsafeCleanup: true });
      cleanupCallback = removeCallback;
      workspacePath = name;
      sandbox.stub(globalVariables, "workspaceUri").value(Uri.file(workspacePath));
    });

    teardown(() => {
      if (cleanupCallback) {
        cleanupCallback();
      }
    });

    suiteSetup(() => {
      // stub existsSync for other project files besides project settings file
      sandbox.stub(fs, "existsSync").callsFake((pathLike: fs.PathLike) => {
        const _path = pathLike.toString();
        return _path.includes("real");
      });
    });

    suiteTeardown(() => {
      sandbox.restore();
    });

    test("Multi env enabled and both new files and old files exist", async () => {
      createOldProjectSettings();
      createNewProjectSettings();
      const result = commonUtils.getProjectId();
      chai.expect(result).equals("new");
    });
    test("Multi env enabled and only new files exist", async () => {
      createNewProjectSettings();
      const result = commonUtils.getProjectId();
      chai.expect(result).equals("new");
    });
    test("Multi env enabled and only old files exist", async () => {
      createOldProjectSettings();
      const result = commonUtils.getProjectId();
      chai.expect(result).equals("old");
    });
    test("Multi env enabled and neither new nor old files exist", async () => {
      const result = commonUtils.getProjectId();
      chai.expect(result).equals(undefined);
    });
  });
});
