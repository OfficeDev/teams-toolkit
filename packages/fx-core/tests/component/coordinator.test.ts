import { Inputs, ok, Platform } from "@microsoft/teamsfx-api";
import "mocha";
import * as sinon from "sinon";
import { Generator } from "../../src/component/generator/generator";
import { createContextV3 } from "../../src/component/utils";
import { settingsUtil } from "../../src/component/utils/settingsUtil";
import { setTools } from "../../src/core/globalVars";
import { CoreQuestionNames, ScratchOptionNo, ScratchOptionYes } from "../../src/core/question";
import { MockTools, randomAppName } from "../core/utils";
import { assert } from "chai";
import { TabOptionItem } from "../../src/component/constants";
import { FxCore } from "../../src/core/FxCore";
import mockedEnv, { RestoreFn } from "mocked-env";
import { YamlParser } from "../../src/component/configManager/parser";
import { ProjectModel } from "../../src/component/configManager/interface";
import { DriverContext } from "../../src/component/driver/interface/commonArgs";
import { envUtil } from "../../src/component/utils/envUtil";
import { provisionUtils } from "../../src/component/provisionUtils";

describe("component coordinator test", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  setTools(tools);
  const context = createContextV3();
  let mockedEnvRestore: RestoreFn | undefined;

  afterEach(() => {
    sandbox.restore();
    if (mockedEnvRestore) {
      mockedEnvRestore();
    }
  });

  beforeEach(() => {
    mockedEnvRestore = mockedEnv({
      TEAMSFX_V3: "true",
    });
  });

  it("create project from sample", async () => {
    sandbox.stub(Generator, "generateSample").resolves(ok(undefined));
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox
      .stub(settingsUtil, "readSettings")
      .resolves(ok({ projectId: "mockId", version: "1", isFromSample: false }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    // const inputs: Inputs = {
    //   platform: Platform.VSCode,
    //   folder: ".",
    //   [CoreQuestionNames.CreateFromScratch]: ScratchOptionNo.id,
    //   [CoreQuestionNames.Samples]: "hello-world-tab",
    // };
    // const res = await coordinator.create(context, inputs);
    // assert.isTrue(res.isOk());

    const inputs2: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionNo.id,
      [CoreQuestionNames.Samples]: "hello-world-tab",
    };
    const fxCore = new FxCore(tools);
    const res2 = await fxCore.createProject(inputs2);
    assert.isTrue(res2.isOk());
  });

  it("create project from scratch", async () => {
    sandbox.stub(Generator, "generateSample").resolves(ok(undefined));
    sandbox.stub(Generator, "generateTemplate").resolves(ok(undefined));
    sandbox
      .stub(settingsUtil, "readSettings")
      .resolves(ok({ projectId: "mockId", version: "1", isFromSample: false }));
    sandbox.stub(settingsUtil, "writeSettings").resolves(ok(""));
    // const inputs: Inputs = {
    //   platform: Platform.VSCode,
    //   folder: ".",
    //   [CoreQuestionNames.AppName]: randomAppName(),
    //   [CoreQuestionNames.CreateFromScratch]: ScratchOptionYes.id,
    //   [CoreQuestionNames.Capabilities]: [TabOptionItem.id],
    //   [CoreQuestionNames.ProgrammingLanguage]: "javascript",
    // };
    // const res = await coordinator.create(context, inputs);
    // assert.isTrue(res.isOk());

    const inputs2: Inputs = {
      platform: Platform.VSCode,
      folder: ".",
      [CoreQuestionNames.AppName]: randomAppName(),
      [CoreQuestionNames.CreateFromScratch]: ScratchOptionYes.id,
      [CoreQuestionNames.Capabilities]: [TabOptionItem.id],
      [CoreQuestionNames.ProgrammingLanguage]: "javascript",
    };
    const fxCore = new FxCore(tools);
    const res2 = await fxCore.createProject(inputs2);
    assert.isTrue(res2.isOk());
  });

  it("provision happy path (create rg)", async () => {
    const mockProjectModel: ProjectModel = {
      registerApp: {
        name: "configureApp",
        run: async (ctx: DriverContext) => {
          return ok({
            env: new Map(),
            unresolvedPlaceHolders: ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"],
          });
        },
      },
    };
    sandbox.stub(YamlParser.prototype, "parse").resolves(ok(mockProjectModel));
    sandbox
      .stub(mockProjectModel.registerApp!, "run")
      .onFirstCall()
      .resolves(
        ok({
          env: new Map(),
          unresolvedPlaceHolders: ["AZURE_SUBSCRIPTION_ID", "AZURE_RESOURCE_GROUP_NAME"],
        })
      )
      .onSecondCall()
      .resolves(
        ok({
          env: new Map(),
          unresolvedPlaceHolders: [],
        })
      );
    sandbox.stub(envUtil, "listEnv").resolves(ok(["dev", "prod"]));
    sandbox.stub(envUtil, "readEnv").resolves(ok({}));
    sandbox.stub(envUtil, "writeEnv").resolves(ok(undefined));
    sandbox.stub(provisionUtils, "ensureSubscription").resolves(
      ok({
        subscriptionId: "mockSubId",
        tenantId: "mockTenantId",
        subscriptionName: "mockSubName",
      })
    );

    sandbox.stub(provisionUtils, "ensureResourceGroup").resolves(
      ok({
        createNewResourceGroup: true,
        name: "test-rg",
        location: "East US",
      })
    );
    sandbox.stub(tools.ui, "selectOption").callsFake(async (config) => {
      if (config.name === "env") {
        return ok({ type: "success", result: "dev" });
      } else {
        return ok({ type: "success", result: "" });
      }
    });
    const inputs: Inputs = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const fxCore = new FxCore(tools);
    const res = await fxCore.provisionResources(inputs);
    assert.isTrue(res.isOk());
  });
});
