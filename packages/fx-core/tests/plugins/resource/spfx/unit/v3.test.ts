import * as mocha from "mocha";
import * as chai from "chai";
import {
  FxError,
  ok,
  Platform,
  ProjectSettings,
  Result,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import {
  BuiltInFeaturePluginNames,
  BuiltInSolutionNames,
} from "../../../../../src/plugins/solution/fx-solution/v3/constants";
import * as uuid from "uuid";
import { MockedV2Context } from "../../../solution/util";
import * as path from "path";
import * as os from "os";
import { randomAppName } from "../../../../core/utils";
import { AppManifestProvider, ContextWithManifestProvider } from "@microsoft/teamsfx-api/build/v3";
import Sinon from "sinon";
import { SPFxPluginImpl } from "../../../../../src/plugins/resource/spfx/v3/plugin";
import * as fs from "fs-extra";
import { Utils } from "../../../../../src/plugins/resource/spfx/utils/utils";
import { SPFxPlugin } from "../../../../../src/plugins/resource/spfx/v3/index";

describe("SPFx plugin v3", () => {
  beforeEach(async () => {
    await fs.ensureDir(testFolder);
    Sinon.stub(Utils, "configure");
    Sinon.stub(fs, "stat").resolves();
  });

  afterEach(() => {
    Sinon.restore();
  });

  const testFolder = path.resolve("./tmp");
  const subFolderName = "SPFx";
  const pluginV3 = new SPFxPlugin();
  const pluginImplV3 = new SPFxPluginImpl();
  const projectSettings: ProjectSettings = {
    appName: "my app",
    projectId: uuid.v4(),
    solutionSettings: {
      name: BuiltInSolutionNames.azure,
      version: "3.0.0",
      capabilities: ["TabSPFx"],
      hostType: "SPFx",
      azureResources: [],
      activeResourcePlugins: [],
    },
  };
  const ctx = new MockedV2Context(projectSettings);
  const inputs: v2.InputsWithProjectPath = {
    platform: Platform.VSCode,
    projectPath: path.join(os.tmpdir(), randomAppName()),
  };

  it("getQuestionsForAddFeature", async () => {
    const questions = await pluginV3.getQuestionsForAddFeature!(ctx, inputs);

    chai.assert.isTrue(questions.isOk());
  });

  it("AddFeature- spfx already added", async () => {
    const appManifestProvider: AppManifestProvider = {
      loadManifest: async (): Promise<Result<JSON, FxError>> => {
        return ok({ local: {}, remote: {} } as unknown as JSON);
      },
      saveManifest: async (): Promise<Result<Void, FxError>> => {
        return ok(Void);
      },
      addCapabilities: async (): Promise<Result<Void, FxError>> => {
        return ok(Void);
      },
    };
    const ctxV3: ContextWithManifestProvider = { ...ctx, appManifestProvider };
    const addFeature = await pluginV3.addFeature(ctxV3, inputs);
    chai.assert.isTrue(addFeature.isErr());
  });

  it("AddFeature- spfx added first time", async () => {
    ctx.projectSetting.solutionSettings!.capabilities = [];
    const appManifestProvider: AppManifestProvider = {
      loadManifest: async (): Promise<Result<JSON, FxError>> => {
        return ok({ local: {}, remote: {} } as unknown as JSON);
      },
      saveManifest: async (): Promise<Result<Void, FxError>> => {
        return ok(Void);
      },
      addCapabilities: async (): Promise<Result<Void, FxError>> => {
        return ok(Void);
      },
    };
    const ctxV3: ContextWithManifestProvider = { ...ctx, appManifestProvider };
    Sinon.stub(SPFxPluginImpl.prototype, "scaffold").resolves(ok(undefined));
    const addCapabilities = Sinon.stub(appManifestProvider, "addCapabilities");

    await pluginV3.addFeature(ctxV3, inputs);

    chai.assert.isTrue(addCapabilities.calledOnce);
  });
});
