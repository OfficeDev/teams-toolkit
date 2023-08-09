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
} from "../../utils/playwrightOperation";
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
describe("Workflow Bot Local Debug Tests", function () {
  this.timeout(Timeout.testCase);
  let localDebugTestContext: LocalDebugTestContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    localDebugTestContext = new LocalDebugTestContext("workflow", "typescript");
    await localDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await localDebugTestContext.after(false, true);
  });

  it(
    "[auto] [TypeScript] Local debug workflow app ",
    {
      testPlanCaseId: 15638321,
      author: "v-helzha@microsoft.com",
    },
    async function () {
      const projectPath = path.resolve(
        localDebugTestContext.testRootFolder,
        localDebugTestContext.appName
      );
      validateFileExist(projectPath, "src/index.ts");
      const driver = VSBrowser.instance.driver;

      await startDebugging();
      await waitForTerminal(LocalDebugTaskLabel.StartLocalTunnel);
      await waitForTerminal(
        LocalDebugTaskLabel.StartBotApp,
        LocalDebugTaskInfo.StartBotInfo
      );

      // check if there is error "Could not attach to main target"
      await driver.sleep(Timeout.startdebugging);
      try {
        await waitForTerminal(
          LocalDebugTaskLabel.StartBotApp,
          LocalDebugTaskInfo.StartBotInfo
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
            LocalDebugTaskInfo.StartBotInfo
          );
          // check if there is error "Debug Anyway"
          await driver.sleep(Timeout.startdebugging);
          await waitForTerminal(
            LocalDebugTaskLabel.StartBotApp,
            LocalDebugTaskInfo.StartBotInfo
          );
        } catch {
          const dialog = new ModalDialog();
          console.log(`click "Debug Anyway" button for error dialog`);
          await dialog.pushButton("Debug Anyway");
          console.log(`Clicked button "Debug Anyway"`);
          await driver.sleep(Timeout.shortTimeLoading);
          await waitForTerminal(
            LocalDebugTaskLabel.StartBotApp,
            LocalDebugTaskInfo.StartBotInfo
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
    }
  );
});
