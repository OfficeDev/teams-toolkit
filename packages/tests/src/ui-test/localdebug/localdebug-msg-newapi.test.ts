// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Anne Fu <v-annefu@microsoft.com>
 */
import * as path from "path";
import { startDebugging, waitForTerminal } from "../../utils/vscodeOperation";
import {
  initNoAddappPage,
  validateSearchCmdResult,
} from "../../utils/playwrightOperation";
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
    localDebugTestContext = new LocalDebugTestContext("msgnewapi");
    await localDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await localDebugTestContext.after(false, true);
  });

  it(
    "[Javascript] Local debug for new API message extension project",
    {
      testPlanCaseId: 25270400,
      author: "v-annefu@microsoft.com",
    },
    async function () {
      const projectPath = path.resolve(
        localDebugTestContext.testRootFolder,
        localDebugTestContext.appName
      );
      validateFileExist(projectPath, "src/functions/repair.js");
      await startDebugging("Debug in Teams (Chrome)");
      await waitForTerminal(LocalDebugTaskLabel.StartLocalTunnel);
      await waitForTerminal(
        LocalDebugTaskLabel.StartBackend,
        "Worker process started and initialized"
      );
      const teamsAppId = await localDebugTestContext.getTeamsAppId();
      /*
      const page = await initNoAddappPage(
        localDebugTestContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      const envName = "local";*/
      //disable validation
      /*
      await validateSearchCmdResult(
        page,
        localDebugTestContext.appName,
        envName
      );*/
    }
  );
});
