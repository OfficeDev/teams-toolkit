// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Helly Zhang <v-helzha@microsoft.com>
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
  validateWorkFlowBot,
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
describe("Workflow Bot Local Debug Tests", function () {
  this.timeout(Timeout.testCase);
  let localDebugTestContext: LocalDebugTestContext;
  let devtunnelProcess: ChildProcessWithoutNullStreams;
  let debugProcess: ChildProcessWithoutNullStreams;
  let tunnelName = "";
  let successFlag = true;
  let errorMessage = "";

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    localDebugTestContext = new LocalDebugTestContext("workflow");
    await localDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    if (debugProcess) {
      setTimeout(() => {
        debugProcess.kill("SIGTERM");
      }, 2000);
    }

    if (tunnelName) {
      setTimeout(() => {
        devtunnelProcess.kill("SIGTERM");
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
    "[auto] [JavaScript] Local debug workflow app",
    {
      testPlanCaseId: 15638255,
      author: "v-helzha@microsoft.com",
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
          expected: "Your Hello World Bot is Running",
        });
        await validateWorkFlowBot(page);

        // cli preview
        console.log("======= debug with cli ========");
        const tunnel = Executor.debugBotFunctionPreparation(projectPath);
        tunnelName = tunnel.tunnelName;
        devtunnelProcess = tunnel.devtunnelProcess;
        await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
        debugProcess = Executor.debugProject(
          projectPath,
          "local",
          true,
          process.env,
          (data) => {
            if (data) {
              console.log(data);
            }
          },
          (error) => {
            console.log(error);
          }
        );
        await new Promise((resolve) => setTimeout(resolve, 2 * 60 * 1000));
        {
          const page = await reopenPage(
            localDebugTestContext.context!,
            teamsAppId,
            Env.username,
            Env.password
          );
          await validateBot(page, {
            botCommand: "helloWorld",
            expected: "Your Hello World Bot is Running",
          });
          await validateWorkFlowBot(page);
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
