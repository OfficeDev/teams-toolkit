// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { MigrationTestContext } from "../migrationContext";
import { Timeout, Capability, Notification } from "../../../utils/constants";
import { it } from "../../../utils/it";
import { CliHelper } from "../../cliHelper";
import {
  validateNotification,
  startDebugging,
  stopDebugging,
} from "../../../utils/vscodeOperation";
import { VSBrowser } from "vscode-extension-tester";

describe("Migration Tests", function () {
  this.timeout(Timeout.testCase);
  let mirgationDebugTestContext: MigrationTestContext;
  CliHelper.setV2Enable();

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);

    mirgationDebugTestContext = new MigrationTestContext(
      Capability.Bot,
      "javascript"
    );
    await mirgationDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await mirgationDebugTestContext.after();
  });

  it(
    "[auto] V3 to V2 debug test",
    {
      testPlanCaseId: 17183411,
      author: "v-ivanchen@microsoft.com",
    },
    async () => {
      // create v3 project using CLI
      await mirgationDebugTestContext.createProjectCLI(true);

      // verify popup
      await validateNotification(Notification.Incompatible);
      await startDebugging();
      VSBrowser.instance.driver.sleep(Timeout.shortTimeWait);
      await stopDebugging();
      await validateNotification(Notification.TaskError);
    }
  );
});
