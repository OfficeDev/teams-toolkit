// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */

import { MigrationTestContext } from "../migrationContext";
import { Timeout, Capability, Notification } from "../../../utils/constants";
import { it } from "../../../utils/it";
import {
  validateNotification,
  startDebugging,
  validateUpgrade,
  upgrade,
} from "../../../utils/vscodeOperation";

describe("Migration Tests", function () {
  this.timeout(Timeout.testCase);
  let mirgationDebugTestContext: MigrationTestContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);

    mirgationDebugTestContext = new MigrationTestContext(
      Capability.Bot,
      "typescript"
    );
    await mirgationDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await mirgationDebugTestContext.after();
  });

  it(
    "[auto] V2 to V3 upgrade test",
    {
      testPlanCaseId: 17183430,
      author: "v-ivanchen@microsoft.com",
    },
    async () => {
      // create v2 project using CLI
      await mirgationDebugTestContext.createProjectCLI(false);

      // verify popup
      await validateNotification(Notification.Upgrade);
      await startDebugging("Debug (Chrome)");

      // upgrade
      await upgrade();

      //verify upgrade
      await validateUpgrade();
    }
  );
});
