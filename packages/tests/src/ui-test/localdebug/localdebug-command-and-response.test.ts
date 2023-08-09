// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Aocheng Wang <aochengwang@microsoft.com>
 */

import * as path from "path";
import {
  startDebugging,
  stopDebugging,
  waitForTerminal,
} from "../../utils/vscodeOperation";
import { initPage, validateBot } from "../../utils/playwrightOperation";
import { LocalDebugTestContext } from "./localdebugContext";
import {
  Timeout,
  LocalDebugTaskLabel,
  LocalDebugTaskInfo,
} from "../../utils/constants";
import { Env } from "../../utils/env";
import { it } from "../../utils/it";
import { killPort, validateFileExist } from "../../utils/commonUtils";
import { ModalDialog, VSBrowser } from "vscode-extension-tester";

// TODO: Change preview test to normal test before rc release
describe("Command And Response Bot Local Debug Tests", function () {
  this.timeout(Timeout.testCase);
  let localDebugTestContext: LocalDebugTestContext;

  const oldEnv = Object.assign({}, process.env);
  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    localDebugTestContext = new LocalDebugTestContext("crbot");
    await localDebugTestContext.before();
  });

  afterEach(async function () {
    process.env = oldEnv;
    this.timeout(Timeout.finishTestCase);
    await localDebugTestContext.after(false, true);
  });

  it(
    "[auto] Local debug Command and Response Bot App",
    {
      testPlanCaseId: 13999814,
      author: "aochengwang@microsoft.com",
    },
    async function () {
      const projectPath = path.resolve(
        localDebugTestContext.testRootFolder,
        localDebugTestContext.appName
      );
      validateFileExist(projectPath, "src/index.js");
      const driver = VSBrowser.instance.driver;

      await startDebugging();
      await waitForTerminal(LocalDebugTaskLabel.StartLocalTunnel);
      await waitForTerminal(
        LocalDebugTaskLabel.StartBotApp,
        LocalDebugTaskInfo.StartBotAppInfo
      );

      // check if there is error "Could not attach to main target"
      await driver.sleep(Timeout.startdebugging);
      try {
        await waitForTerminal(
          LocalDebugTaskLabel.StartBotApp,
          LocalDebugTaskInfo.StartBotAppInfo
        );
      } catch {
        const dialog = new ModalDialog();
        console.log(`click "Cancel" button for error dialog`);
        await dialog.pushButton("Cancel");
        await driver.sleep(Timeout.shortTimeLoading);
        console.log(
          `Clicked button "Cancel" for failing to attach to main target`
        );
        await stopDebugging();
        await driver.sleep(Timeout.stopdebugging);
        try {
          await killPort(3978);
          console.log(`close port 3978 successfully`);
        } catch (error) {
          console.log(`close port 3978 failed`);
        }
        await startDebugging();
        try {
          await waitForTerminal(
            LocalDebugTaskLabel.StartBotApp,
            LocalDebugTaskInfo.StartBotAppInfo
          );

          // check if there is error "Debug Anyway"
          await driver.sleep(Timeout.startdebugging);
          await waitForTerminal(
            LocalDebugTaskLabel.StartBotApp,
            LocalDebugTaskInfo.StartBotAppInfo
          );
        } catch {
          const dialog = new ModalDialog();
          console.log(`click "Debug Anyway" button for error dialog`);
          await dialog.pushButton("Debug Anyway");
          console.log(`Clicked button "Debug Anyway"`);
          await driver.sleep(Timeout.shortTimeLoading);
          await waitForTerminal(
            LocalDebugTaskLabel.StartBotApp,
            LocalDebugTaskInfo.StartBotAppInfo
          );
        }
      }

      const teamsAppId = await localDebugTestContext.getTeamsAppId();
      const page = await initPage(
        localDebugTestContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      await validateBot(page, {
        botCommand: "helloWorld",
        expected: "Your Hello World App is Running",
      });
    }
  );
});
