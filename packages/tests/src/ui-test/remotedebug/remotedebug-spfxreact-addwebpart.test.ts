// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Helly Zhang <v-helzha@microsoft.com>
 */
import * as path from "path";
import * as fs from "fs-extra";
import { expect } from "chai";
import { InputBox, VSBrowser } from "vscode-extension-tester";
import {
  CommandPaletteCommands,
  Timeout,
  Notification,
} from "../../utils/constants";
import { RemoteDebugTestContext, runDeploy } from "./remotedebugContext";
import {
  execCommandIfExist,
  getNotification,
  createNewProject,
  clearNotifications,
  addSpfxWebPart,
} from "../../utils/vscodeOperation";
import {
  initPage,
  switchToTab,
  validateSpfx,
} from "../../utils/playwrightOperation";
import { Env } from "../../utils/env";
import { cleanUpLocalProject } from "../../utils/cleanHelper";
import { it } from "../../utils/it";
import { validateFileExist } from "../../utils/commonUtils";

describe("Remote debug Tests", function () {
  this.timeout(Timeout.testAzureCase);
  let remoteDebugTestContext: RemoteDebugTestContext;
  let testRootFolder: string;
  let appName: string;
  const appNameCopySuffix = "copy";
  let newAppFolderName: string;
  let projectPath: string;

  beforeEach(async function () {
    this.timeout(Timeout.prepareTestCase);
    remoteDebugTestContext = new RemoteDebugTestContext("spfx");
    testRootFolder = remoteDebugTestContext.testRootFolder;
    appName = remoteDebugTestContext.appName;
    newAppFolderName = appName + appNameCopySuffix;
    projectPath = path.resolve(testRootFolder, newAppFolderName);
    await remoteDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await remoteDebugTestContext.after();
    // Close the folder and cleanup local sample project
    await execCommandIfExist("Workspaces: Close Workspace", Timeout.webView);
    cleanUpLocalProject(projectPath);
  });

  it(
    "[auto] Add web part to SPFx project with React framework",
    {
      testPlanCaseId: 17581722,
      author: "v-helzha@microsoft.com",
    },
    async function () {
      const driver = VSBrowser.instance.driver;
      await createNewProject("spfxreact", appName);
      validateFileExist(projectPath, "src/src/index.ts");
      await addSpfxWebPart("helloworld");
      await clearNotifications();
      await execCommandIfExist(CommandPaletteCommands.ProvisionCommand);
      await driver.sleep(Timeout.spfxProvision);
      await getNotification(
        Notification.ProvisionSucceeded,
        Timeout.shortTimeWait
      );
      await runDeploy();

      const teamsAppId = await remoteDebugTestContext.getTeamsAppId(
        projectPath
      );
      const page = await initPage(
        remoteDebugTestContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      await driver.sleep(Timeout.longTimeWait);
      await validateSpfx(page, { displayName: appName });
      // Validate app name is in the page
      await switchToTab(page, "helloworld");
      await validateSpfx(page, {
        displayName: "helloworld",
      });
    }
  );
});
