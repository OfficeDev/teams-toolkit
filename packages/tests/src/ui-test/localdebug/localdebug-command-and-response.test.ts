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
import {
  initPage,
  validateBot,
  reopenPage,
} from "../../utils/playwrightOperation";
import { LocalDebugTestContext } from "./localdebugContext";
import {
  Timeout,
  LocalDebugTaskLabel,
  LocalDebugTaskInfo,
  DebugItemSelect,
} from "../../utils/constants";
import { Env } from "../../utils/env";
import { it } from "../../utils/it";
import { killPort, validateFileExist } from "../../utils/commonUtils";
import { ModalDialog, VSBrowser } from "vscode-extension-tester";
import { ChildProcessWithoutNullStreams } from "child_process";
import { Executor } from "../../utils/executor";
import { expect } from "chai";
import { getScreenshotName } from "../../utils/nameUtil";

// TODO: Change preview test to normal test before rc release
describe("Command And Response Bot Local Debug Tests", function () {
  this.timeout(Timeout.testCase);
  let localDebugTestContext: LocalDebugTestContext;
  let devtunnelProcess: ChildProcessWithoutNullStreams | null;
  let debugProcess: ChildProcessWithoutNullStreams | null;
  let tunnelName = "";
  let successFlag = true;
  let errorMessage = "";

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
    if (debugProcess) {
      setTimeout(() => {
        debugProcess?.kill("SIGTERM");
      }, 2000);
    }

    if (tunnelName) {
      setTimeout(() => {
        devtunnelProcess?.kill("SIGTERM");
      }, 2000);
      Executor.deleteTunnel(
        tunnelName,
        (data) => {
          if (data) {
            console.log(data);
          }
        },
        (error) => {
          console.log(error);
        }
      );
    }
    await localDebugTestContext.after(false, true);
    this.timeout(Timeout.finishAzureTestCase);
    if (successFlag) process.exit(0);
    else process.exit(1);
  });

  it(
    "[auto] Local debug Command and Response Bot App",
    {
      testPlanCaseId: 13999814,
      author: "aochengwang@microsoft.com",
    },
    async function () {
      try {
        const projectPath = path.resolve(
          localDebugTestContext.testRootFolder,
          localDebugTestContext.appName
        );
        validateFileExist(projectPath, "src/index.js");
        const driver = VSBrowser.instance.driver;

        // local debug
        console.log("======= debug with ttk ========");
        await startDebugging(DebugItemSelect.DebugInTeamsUsingChrome);
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
          await startDebugging(DebugItemSelect.DebugInTeamsUsingChrome);
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

        // cli preview
        const res = await Executor.cliPreview(projectPath, true);
        devtunnelProcess = res.devtunnelProcess;
        tunnelName = res.tunnelName;
        debugProcess = res.debugProcess;
        {
          const page = await reopenPage(
            localDebugTestContext.context!,
            teamsAppId,
            Env.username,
            Env.password
          );
          await localDebugTestContext.validateLocalStateForBot();
          await validateBot(page, {
            botCommand: "helloWorld",
            expected: "Your Hello World App is Running",
          });
        }
      } catch (error) {
        successFlag = false;
        errorMessage = "[Error]: " + error;
        await VSBrowser.instance.takeScreenshot(getScreenshotName("error"));
        await VSBrowser.instance.driver.sleep(Timeout.playwrightDefaultTimeout);
      }
      expect(successFlag, errorMessage).to.true;
      console.log("debug finish!");
    }
  );
});
