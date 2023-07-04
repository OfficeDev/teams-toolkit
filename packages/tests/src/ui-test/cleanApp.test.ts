/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */
import { Timeout } from "../constants";
import { openBrowser, cleanApp, initChannelTab } from "../playwrightOperation";
import { Env } from "../utils/env";
import { TestContext } from "./testContext";
import { it } from "../utils/it";

describe("Clean App", function () {
  this.timeout(Timeout.testAzureCase);
  let testContext: TestContext;
  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    testContext = new TestContext("CleanApp");
    await testContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishAzureTestCase);
    await testContext.after();
  });

  it(
    "Clean app",
    {
      testPlanCaseId: "XXXXXX",
      author: "v-ivanchen@microsoft.com",
    },
    async function () {
      const page = await openBrowser(
        testContext.context!,
        Env.username,
        Env.password
      );
      // await cleanApp(page)
      await initChannelTab(page);
    }
  );
});
