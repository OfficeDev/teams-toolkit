// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * @author Anne Fu <v-annefu@microsoft.com>
 */
import * as path from "path";
import {
  startDebugging,
  stopDebugging,
  waitForTerminal,
} from "../../utils/vscodeOperation";
import {
  initPage,
  validateNotificationBot,
  validateNotificationTimeBot,
} from "../../utils/playwrightOperation";
import { LocalDebugTestContext } from "./localdebugContext";
import {
  Timeout,
  LocalDebugTaskLabel,
  DebugItemSelect,
} from "../../utils/constants";
import { Env } from "../../utils/env";
import { it } from "../../utils/it";
import { validateFileExist } from "../../utils/commonUtils";
import { ModalDialog, VSBrowser } from "vscode-extension-tester";

// TODO: Change preview test to normal test before rc release
describe("Func Hosted and Timer-trigger Notification Bot Local Debug Tests", function () {
  this.timeout(Timeout.testCase);
  let localDebugTestContext: LocalDebugTestContext;

  const oldEnv = Object.assign({}, process.env);
  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    localDebugTestContext = new LocalDebugTestContext("ftNoti", {
      lang: "typescript",
    });
    await localDebugTestContext.before();
  });

  afterEach(async function () {
    process.env = oldEnv;
    this.timeout(Timeout.finishTestCase);
    await localDebugTestContext.after(false, true);
  });

  it(
    "[auto] [Typescript] Local debug Func Hosted and Timer-trigger Notification Bot App",
    {
      testPlanCaseId: 17431807,
      author: "v-annefu@microsoft.com",
    },
    async function () {
      const projectPath = path.resolve(
        localDebugTestContext.testRootFolder,
        localDebugTestContext.appName
      );
      validateFileExist(projectPath, "src/httpTrigger.ts");
      validateFileExist(projectPath, "src/timerTrigger.ts");
      const driver = VSBrowser.instance.driver;
      await startDebugging(DebugItemSelect.DebugInTeamsUsingChrome);
      await waitForTerminal(LocalDebugTaskLabel.StartLocalTunnel);
      try {
        await waitForTerminal(
          "Start Azurite emulator",
          "Azurite Blob service is successfully listening"
        );
        await waitForTerminal(
          LocalDebugTaskLabel.StartBotApp,
          "Worker process started and initialized"
        );
      } catch {
        const dialog = new ModalDialog();
        console.log("click Cancel button for error dialog");
        await dialog.pushButton("Cancel");
        await driver.sleep(Timeout.shortTimeLoading);
        console.log(
          "Clicked button Cancel for failing to attach to main target"
        );
        await stopDebugging();
        await startDebugging(DebugItemSelect.DebugInTeamsUsingChrome);
        try {
          await waitForTerminal(
            LocalDebugTaskLabel.StartBotApp,
            "Worker process started and initialized"
          );
        } catch {
          const dialog = new ModalDialog();
          console.log("click Cancel button for error dialog");
          await dialog.pushButton("Debug Anyway");
          console.log("Clicked button Debug Anyway");
          await driver.sleep(Timeout.shortTimeLoading);
          await waitForTerminal(
            LocalDebugTaskLabel.StartBotApp,
            "Worker process started and initialized"
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
      await validateNotificationBot(page);
      await validateNotificationTimeBot(page);
    }
  );
});
