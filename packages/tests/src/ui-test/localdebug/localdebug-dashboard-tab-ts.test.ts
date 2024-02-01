/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */
import * as path from "path";
import { startDebugging, waitForTerminal } from "../../utils/vscodeOperation";
import {
  initPage,
  validateBasicDashboardTab,
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

describe("Local Debug Tests", function () {
  this.timeout(Timeout.testCase);
  let localDebugTestContext: LocalDebugTestContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    localDebugTestContext = new LocalDebugTestContext(
      "dashboard",
      "typescript"
    );
    await localDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await localDebugTestContext.after();
  });

  it(
    "[auto] Local debug Dashboard Tab App in typescript",
    {
      testPlanCaseId: 16565721,
      author: "v-ivanchen@microsoft.com",
    },
    async () => {
      const projectPath = path.resolve(
        localDebugTestContext.testRootFolder,
        localDebugTestContext.appName
      );
      validateFileExist(projectPath, "src/index.tsx");

      await startDebugging(DebugItemSelect.DebugInTeamsUsingChrome);
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
      await validateBasicDashboardTab(page);
    }
  );
});
