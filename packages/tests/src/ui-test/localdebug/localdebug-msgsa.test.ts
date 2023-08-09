// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import { startDebugging, waitForTerminal } from "../../utils/vscodeOperation";
import { initPage, validateBot } from "../../utils/playwrightOperation";
import { LocalDebugTestContext } from "./localdebugContext";
import { Timeout, LocalDebugTaskLabel } from "../../utils/constants";
import { Env } from "../../utils/env";
import { it } from "../../utils/it";
import { validateFileExist } from "../../utils/commonUtils";

describe("Local Debug Tests", function () {
  this.timeout(Timeout.testCase);
  let localDebugTestContext: LocalDebugTestContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    localDebugTestContext = new LocalDebugTestContext("msgsa");
    await localDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await localDebugTestContext.after(false, true);
  });

  it(
    "[Javascript] Local debug for Search-based message extension project",
    {
      testPlanCaseId: 14483079,
      author: "xiaofu.huang@microsoft.com",
    },
    async function () {
      const projectPath = path.resolve(
        localDebugTestContext.testRootFolder,
        localDebugTestContext.appName
      );
      validateFileExist(projectPath, "src/index.js");

      await startDebugging("Debug in Teams (Chrome)");

      await waitForTerminal(LocalDebugTaskLabel.StartLocalTunnel);
      await waitForTerminal(LocalDebugTaskLabel.StartBotApp, "Bot started");

      const teamsAppId = await localDebugTestContext.getTeamsAppId();
      //   const page = await initPage(
      //     localDebugTestContext.context!,
      //     teamsAppId,
      //     Env.username,
      //     Env.password
      //   );
      //   await localDebugTestContext.validateLocalStateForBot();
      //   await validateBot(page);
    }
  );
});
