/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */
import {
  Timeout,
  TemplateProject,
  TemplateProjectFolder,
} from "../../constants";
import { initTeamsPage } from "../../playwrightOperation";
import { Env } from "../../utils/env";
import { SampledebugContext } from "./sampledebugContext";
import { it } from "../../utils/it";
import { runProvision, runDeploy } from "../remotedebug/remotedebugContext";

describe("Sample Tests", function () {
  this.timeout(Timeout.testAzureCase);
  let sampledebugContext: SampledebugContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    sampledebugContext = new SampledebugContext(
      TemplateProject.TodoListSpfx,
      TemplateProjectFolder.TodoListSpfx
    );
    await sampledebugContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishAzureTestCase);
    await sampledebugContext.after();
  });

  it(
    "[auto] local debug for Sample todo list spfx",
    {
      testPlanCaseId: 24121511,
      author: "v-ivanchen@microsoft.com",
    },
    async function () {
      // create project
      await sampledebugContext.openResourceFolder();
      // await sampledebugContext.createTemplate();

      await runProvision(sampledebugContext.appName, "dev", false, true);
      await runDeploy(Timeout.tabDeploy, true);

      const teamsAppId = await sampledebugContext.getTeamsAppId("dev");
      console.log(teamsAppId);
      const page = await initTeamsPage(
        sampledebugContext.context!,
        teamsAppId,
        Env.username,
        Env.password,
        "TodoListSPFx-dev",
        "spfx"
      );
      console.log("debug finish!");
    }
  );
});
