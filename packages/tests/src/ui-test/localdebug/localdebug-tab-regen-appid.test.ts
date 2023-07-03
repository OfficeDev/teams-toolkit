/**
 * @author Xiaofu Huang <xiaofu.huang@microsoft.com>
 */
import * as path from "path";
import {
  startDebugging,
  stopDebugging,
  waitForTerminal,
} from "../../vscodeOperation";
import { initPage, validateTab } from "../../playwrightOperation";
import { LocalDebugTestContext } from "./localdebugContext";
import { Timeout, LocalDebugTaskLabel, DebugItemSelect } from "../../constants";
import { Env } from "../../utils/env";
import { it } from "../../utils/it";
import { validateFileExist } from "../../utils/commonUtils";
import { cleanAppStudio } from "../../utils/cleanHelper";

describe("Local Debug Tests", function () {
  this.timeout(Timeout.testCase);
  let localDebugTestContext: LocalDebugTestContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    localDebugTestContext = new LocalDebugTestContext("tab");
    await localDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await localDebugTestContext.after();
  });

  it(
    "[auto] Local debug: remove teams app from dev portal and re-run",
    {
      testPlanCaseId: 10822115,
      author: "xiaofu.huang@microsoft.com",
    },
    async () => {
      const projectPath = path.resolve(
        localDebugTestContext.testRootFolder,
        localDebugTestContext.appName
      );
      validateFileExist(projectPath, "src/index.jsx");

      await startDebugging(DebugItemSelect.DebugInTeamsUsingChrome);

      await waitForTerminal(
        LocalDebugTaskLabel.StartFrontend,
        "Compiled successfully!"
      );

      await stopDebugging();

      await cleanAppStudio(localDebugTestContext.appName);

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
      await localDebugTestContext.validateLocalStateForTab();
      await validateTab(page, Env.displayName, false);
    }
  );
});
