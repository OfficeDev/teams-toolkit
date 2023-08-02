// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as path from "path";
import { startDebugging, waitForTerminal } from "../../utils/vscodeOperation";
import { initPage, validateBot } from "../../utils/playwrightOperation";
import { LocalDebugTestContext } from "./localdebugContext";
import {
  Timeout,
  LocalDebugTaskLabel,
  LocalDebugTaskInfo,
} from "../../utils/constants";
import { Env } from "../../utils/env";
import { it } from "../../utils/it";
import { validateFileExist } from "../../utils/commonUtils";

// TODO: Change preview test to normal test before rc release
describe("Command And Response Bot Local Debug Tests", function () {
  this.timeout(Timeout.testCase);
  let localDebugTestContext: LocalDebugTestContext;

  const oldEnv = Object.assign({}, process.env);
  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    localDebugTestContext = new LocalDebugTestContext("crbot");
    await localDebugTestContext.before();
  });

  afterEach(async function () {
    process.env = oldEnv;
    this.timeout(Timeout.finishTestCase);
    await localDebugTestContext.after(false, true);
  });

  it(
    "[auto] Local debug Command and Response Bot App",
    {
      testPlanCaseId: 13999814,
      author: "aochengwang@microsoft.com",
    },
    async function () {
      const projectPath = path.resolve(
        localDebugTestContext.testRootFolder,
        localDebugTestContext.appName
      );
      validateFileExist(projectPath, "src/index.js");

      await startDebugging();

      await waitForTerminal(LocalDebugTaskLabel.StartLocalTunnel);
      await waitForTerminal(
        LocalDebugTaskLabel.StartBotApp,
        LocalDebugTaskInfo.StartBotAppInfo
      );

      const teamsAppId = await localDebugTestContext.getTeamsAppId();
      const page = await initPage(
        localDebugTestContext.context!,
        teamsAppId,
        Env.username,
        Env.password
      );
      await validateBot(page, {
        botCommand: "helloWorld",
        expected: "Your Hello World App is Running",
      });
    }
  );
});
