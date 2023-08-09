/**
 * @author Kuojian Lu <kuojianlu@microsoft.com>
 */
import * as path from "path";
import { startDebugging, waitForTerminal } from "../../utils/vscodeOperation";
import {
  initPage,
  validateReactOutlookTab,
  validateReactTab,
} from "../../utils/playwrightOperation";
import { LocalDebugTestContext } from "./localdebugContext";
import { Timeout, LocalDebugTaskLabel } from "../../utils/constants";
import { Env } from "../../utils/env";
import { it } from "../../utils/it";
import { validateFileExist } from "../../utils/commonUtils";

describe("Local Debug M365 Tests", function () {
  this.timeout(Timeout.testCase);
  let localDebugTestContext: LocalDebugTestContext;

  beforeEach(async function () {
    process.env.TEAMSFX_M365_APP = "true";
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    localDebugTestContext = new LocalDebugTestContext("m365lp");
    await localDebugTestContext.before();
  });

  afterEach(async function () {
    process.env.TEAMSFX_M365_APP = "false";
    this.timeout(Timeout.finishTestCase);
    await localDebugTestContext.after();
  });

  it(
    "[auto] Local debug Tab App in Outlook",
    {
      testPlanCaseId: 14039691,
      author: "kuojianlu@microsoft.com",
    },
    async () => {
      const projectPath = path.resolve(
        localDebugTestContext.testRootFolder,
        localDebugTestContext.appName
      );
      validateFileExist(projectPath, "src/index.jsx");

      await startDebugging("Debug in Teams (Chrome)");

      await waitForTerminal(
        LocalDebugTaskLabel.StartBackend,
        "Worker process started and initialized"
      );

      await waitForTerminal(
        LocalDebugTaskLabel.StartFrontend,
        "Compiled successfully!"
      );

      const teamsAppId = await localDebugTestContext.getTeamsAppId();
      const page = await initPage(
        localDebugTestContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      await localDebugTestContext.validateLocalStateForTab();
      await validateReactTab(page, Env.displayName, true);
      const url = page.url();
      const pattern =
        /https:\/\/teams\.microsoft\.com\/_#\/apps\/(.*)\/sections\/index.*/;
      const result = url.match(pattern);
      const internalId = result![1];
      await page.goto(
        `https://outlook.office.com/host/${internalId}/index?login_hint=${Env.username}`
      );
      await validateReactOutlookTab(page, Env.displayName, true);
    }
  );
});
