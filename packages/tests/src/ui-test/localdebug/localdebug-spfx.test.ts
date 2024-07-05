// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Anne Fu <v-annefu@microsoft.com>
 */
import { startDebugging, waitForTerminal } from "../../utils/vscodeOperation";
import {
  initPage,
  validateTeamsWorkbench,
} from "../../utils/playwrightOperation";
import { LocalDebugSpfxTestContext } from "./localdebugContext";
import { Timeout, LocalDebugTaskLabel } from "../../utils/constants";
import { Env } from "../../utils/env";
import { it } from "../../utils/it";

describe("SPFx local debug", function () {
  this.timeout(Timeout.testCase);
  let localDebugTestContext: LocalDebugSpfxTestContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    localDebugTestContext = new LocalDebugSpfxTestContext("react");
    await localDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await localDebugTestContext.after(false);
  });

  it(
    "[auto] Debug SPFx with react framework",
    {
      testPlanCaseId: 12624479,
      author: "v-annefu@microsoft.com",
    },
    async () => {
      await startDebugging("Teams workbench (Chrome)");

      // await waitForTerminal(LocalDebugTaskLabel.TabsNpmInstall);
      // await waitForTerminal("gulp trust-dev-cert");
      await waitForTerminal("gulp serve");

      const teamsAppId = await localDebugTestContext.getTeamsAppId();
      const page = await initPage(
        localDebugTestContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      await validateTeamsWorkbench(page, localDebugTestContext.appName);
    }
  );
});
