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
import { ChildProcess, ChildProcessWithoutNullStreams } from "child_process";
import { Executor } from "../../utils/executor";
import { expect } from "chai";
import { getScreenshotName } from "../../utils/nameUtil";
import { initDebugPort } from "../../utils/commonUtils";
import os from "os";

// TODO: Change preview test to normal test before rc release
describe("Workflow Bot Local Debug Tests", function () {
  this.timeout(Timeout.testAzureCase);
  let localDebugTestContext: LocalDebugTestContext;
  let devtunnelProcess: ChildProcessWithoutNullStreams | null;
  let debugProcess: ChildProcess | null;
  let successFlag = true;
  let errorMessage = "";

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    localDebugTestContext = new LocalDebugTestContext("workflow");
    await localDebugTestContext.before();
  });

  after(async function () {
    this.timeout(Timeout.finishTestCase);
    await localDebugTestContext.after(false, true);
    setTimeout(() => {
      if (os.type() === "Windows_NT") {
        if (successFlag) process.exit(0);
        else process.exit(1);
      }
    }, 30000);
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
        const res = await Executor.cliPreview(projectPath, true);
        devtunnelProcess = res.devtunnelProcess;
        debugProcess = res.debugProcess;
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

      // kill process
      await Executor.closeProcess(debugProcess);
      await Executor.closeProcess(devtunnelProcess);
      await initDebugPort();

      expect(successFlag, errorMessage).to.true;
      console.log("debug finish!");
    }
  );
});
