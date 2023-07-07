/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */
import {
  Timeout,
  TemplateProject,
  TemplateProjectFolder,
} from "../../constants";
import * as path from "path";
import fs from "fs";
import { initPage, validateStockUpdate } from "../../playwrightOperation";
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
      TemplateProject.StockUpdate,
      TemplateProjectFolder.StockUpdate
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
    "[auto] local debug for Sample Hello World Bot Sso",
    {
      testPlanCaseId: 24121504,
      author: "v-ivanchen@microsoft.com",
    },
    async function () {
      // create project
      await sampledebugContext.openResourceFolder();
      // await sampledebugContext.createTemplate();

      const targetFile = path.resolve(
        sampledebugContext.projectPath,
        "env",
        ".env.dev"
      );
      let data = fs.readFileSync(targetFile, "utf-8");
      data +=
        "\nTEAMSFX_API_ALPHAVANTAGE_ENDPOINT=https://www.alphavantage.co\nTEAMSFX_API_ALPHAVANTAGE_API_KEY=demo";
      fs.writeFileSync(targetFile, data);
      console.log("write .env.local finish!");

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
      validateStockUpdate(page);
      console.log("debug finish!");
    }
  );
});
