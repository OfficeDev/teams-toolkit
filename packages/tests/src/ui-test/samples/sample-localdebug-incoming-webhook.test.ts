/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */
import {
  Timeout,
  TemplateProject,
  TemplateProjectFolder,
  LocalDebugTaskLabel,
} from "../../constants";
import { startDebugging, waitForTerminal } from "../../vscodeOperation";
import { getScreenshotName } from "../../utils/nameUtil";
import { VSBrowser } from "vscode-extension-tester";
import { SampledebugContext } from "./sampledebugContext";
import { it } from "../../utils/it";
import * as path from "path";
import fs from "fs";

describe("Sample Tests", function () {
  this.timeout(Timeout.testAzureCase);
  let sampledebugContext: SampledebugContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    sampledebugContext = new SampledebugContext(
      TemplateProject.IncomingWebhook,
      TemplateProjectFolder.IncomingWebhook
    );
    await sampledebugContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishAzureTestCase);
    await sampledebugContext.after();
  });

  it(
    "[auto] local debug for Sample Incoming Webhook Notification",
    {
      testPlanCaseId: 14524902,
      author: "v-ivanchen@microsoft.com",
    },
    async function () {
      // create project
      await sampledebugContext.openResourceFolder();

      // replace "<webhook-url>" to "https://test.com"
      console.log("replace webhook url");
      const targetFile = path.resolve(
        sampledebugContext.projectPath,
        "src",
        "index.ts"
      );
      let data = fs.readFileSync(targetFile, "utf-8");
      data = data.replace(/<webhook-url>/g, "https://test.com");
      fs.writeFileSync(targetFile, data);
      console.log("replace webhook url finish!");

      try {
        // local debug
        await startDebugging("Attach to Incoming Webhook");

        console.log("start incoming webhook");
        await waitForTerminal(LocalDebugTaskLabel.StartWebhook);
      } catch (error) {
        await VSBrowser.instance.takeScreenshot(getScreenshotName("debug"));
        console.log("[Skip Error]: ", error);
        await VSBrowser.instance.driver.sleep(Timeout.playwrightDefaultTimeout);
      }
    }
  );
});
