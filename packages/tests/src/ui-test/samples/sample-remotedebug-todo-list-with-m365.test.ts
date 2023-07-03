/**
 * @author Ivan Chen <v-ivanchen@microsoft.com>
 */
import {
  Timeout,
  TemplateProject,
  TemplateProjectFolder,
} from "../../constants";
import { initPage, validateTodoList } from "../../playwrightOperation";
import { Env } from "../../utils/env";
import { SampledebugContext } from "./sampledebugContext";
import { it } from "../../utils/it";
import { runProvision, runDeploy } from "../remotedebug/remotedebugContext";
import { editDotEnvFile } from "../../utils/commonUtils";
import path from "path";
import * as uuid from "uuid";

describe("Sample Tests", function () {
  this.timeout(Timeout.testAzureCase);
  let sampledebugContext: SampledebugContext;

  beforeEach(async function () {
    // ensure workbench is ready
    this.timeout(Timeout.prepareTestCase);
    sampledebugContext = new SampledebugContext(
      TemplateProject.TodoListM365,
      TemplateProjectFolder.TodoListM365
    );
    await sampledebugContext.before();
  });

  afterEach(async function () {
    this.timeout(Timeout.finishAzureTestCase);
    await sampledebugContext.after();
  });

  it(
    "[auto] remote debug for Sample todo list m365",
    {
      testPlanCaseId: 14571883,
      author: "v-ivanchen@microsoft.com",
    },
    async function () {
      // create project
      await sampledebugContext.openResourceFolder();
      // await sampledebugContext.createTemplate();

      // Provision
      const envFilePath = path.resolve(
        sampledebugContext.projectPath,
        "env",
        ".env.dev.user"
      );
      editDotEnvFile(envFilePath, "SQL_USER_NAME", "Abc123321");
      editDotEnvFile(
        envFilePath,
        "SQL_PASSWORD",
        "Cab232332" + uuid.v4().substring(0, 6)
      );
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

      await validateTodoList(page, Env.displayName, "remote");
      console.log("debug finish!");
    }
  );
});
