/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */
import {
  Timeout,
  TemplateProject,
  TemplateProjectFolder,
} from "../../utils/constants";
import { initPage, validateQueryOrg } from "../../utils/playwrightOperation";
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
      TemplateProject.QueryOrg,
      TemplateProjectFolder.QueryOrg
    );
    await sampledebugContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishAzureTestCase);
    await sampledebugContext.sampleAfter(
      `${sampledebugContext.appName}-dev-rg`
    );
  });

  it(
    "[auto] remote debug for Sample Query Org",
    {
      testPlanCaseId: 24121481,
      author: "v-ivanchen@microsoft.com",
    },
    async function () {
      // create project
      await sampledebugContext.openResourceFolder();
      // await sampledebugContext.createTemplate();

      await runProvision(sampledebugContext.appName);
      await runDeploy();

      const teamsAppId = await sampledebugContext.getTeamsAppId("dev");
      console.log(teamsAppId);
      const page = await initPage(
        sampledebugContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      await validateQueryOrg(page, Env.displayName);
      console.log("debug finish!");
    }
  );
});
