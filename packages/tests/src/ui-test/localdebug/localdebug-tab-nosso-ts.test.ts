/**
 * @author Xiaofu Huang <xiaofu.huang@microsoft.com>
 */
import * as path from "path";
import { startDebugging, waitForTerminal } from "../../utils/vscodeOperation";
import { initPage, validateBasicTab } from "../../utils/playwrightOperation";
import { LocalDebugTestContext } from "./localdebugContext";
import {
  Timeout,
  LocalDebugTaskLabel,
  ValidationContent,
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
    localDebugTestContext = new LocalDebugTestContext("tabnsso", "typescript");
    await localDebugTestContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishTestCase);
    await localDebugTestContext.after(false);
  });

  it(
    "[auto] [Typescript] Local Debug for Tab project without sso",
    {
      testPlanCaseId: 15276946,
      author: "xiaofu.huang@microsoft.com",
    },
    async () => {
      const projectPath = path.resolve(
        localDebugTestContext.testRootFolder,
        localDebugTestContext.appName
      );
      validateFileExist(projectPath, "src/app.ts");

      await startDebugging(DebugItemSelect.DebugInTeamsUsingChrome);

      await waitForTerminal(
        LocalDebugTaskLabel.StartApplication,
        "restify listening to"
      );

      const teamsAppId = await localDebugTestContext.getTeamsAppId();
      const page = await initPage(
        localDebugTestContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      await validateBasicTab(page, ValidationContent.Tab);
    }
  );
});
