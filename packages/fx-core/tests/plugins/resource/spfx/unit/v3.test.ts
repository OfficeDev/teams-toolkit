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
  TokenProvider,
} from "@microsoft/teamsfx-api";
import {
  BuiltInFeaturePluginNames,
  BuiltInSolutionNames,
} from "../../../../../src/plugins/solution/fx-solution/v3/constants";
import * as uuid from "uuid";
import { MockedLogProvider, MockedV2Context } from "../../../solution/util";
import path from "path";
import * as os from "os";
import {
  MockAppStudioTokenProvider,
  MockAzureAccountProvider,
  MockGraphTokenProvider,
  MockSharepointTokenProvider,
  randomAppName,
} from "../../../../core/utils";
import { AppManifestProvider, ContextWithManifestProvider } from "@microsoft/teamsfx-api/build/v3";
import Sinon from "sinon";
import { SPFxPluginImpl } from "../../../../../src/plugins/resource/spfx/v3/plugin";
import fs from "fs-extra";
import { Utils } from "../../../../../src/plugins/resource/spfx/utils/utils";
import { SPFxPluginV3 } from "../../../../../src/plugins/resource/spfx/v3/index";
import { ProgressHelper } from "../../../../../src/plugins/resource/spfx/utils/progress-helper";
import { SPFXQuestionNames } from "../../../../../src/plugins/resource/spfx/utils/questions";
import { SPOClient } from "../../../../../src/plugins/resource/spfx/spoClient";
import { DefaultManifestProvider } from "../../../../../src/plugins/solution/fx-solution/v3/addFeature";

describe("SPFx plugin v3", () => {
  beforeEach(async () => {
    await fs.ensureDir(testFolder);
    Sinon.stub(Utils, "configure");
    Sinon.stub(fs, "stat").resolves();
  });

  afterEach(async () => {
    await fs.remove(testFolder);
    Sinon.restore();
  });

  const testFolder = path.resolve("./tmp");
  const subFolderName = "SPFx";
  const pluginV3 = new SPFxPluginV3();
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
    projectPath: testFolder,
  };
  const tokenProvider: TokenProvider = {
    azureAccountProvider: new MockAzureAccountProvider(),
    graphTokenProvider: new MockGraphTokenProvider(),
    appStudioToken: new MockAppStudioTokenProvider(),
    sharepointTokenProvider: new MockSharepointTokenProvider(),
  };

  it("getQuestionsForAddFeature", async () => {
    const questions = await pluginV3.getQuestionsForAddInstance(ctx, inputs);

    chai.assert.isTrue(questions.isOk());
  });

  it("AddFeature- spfx already added", async () => {
    const appManifestProvider = new DefaultManifestProvider();
    appManifestProvider.addCapabilities = async (): Promise<Result<Void, FxError>> => {
      return ok(Void);
    };
    appManifestProvider.updateCapability = async (): Promise<Result<Void, FxError>> => {
      return ok(Void);
    };
    const ctxV3: ContextWithManifestProvider = { ...ctx, appManifestProvider };
    const addFeature = await pluginV3.addInstance(ctxV3, inputs);
    chai.assert.isTrue(addFeature.isErr());
  });

  it("AddFeature- spfx added first time", async () => {
    ctx.projectSetting.solutionSettings!.capabilities = [];
    const appManifestProvider = new DefaultManifestProvider();
    appManifestProvider.addCapabilities = async (): Promise<Result<Void, FxError>> => {
      return ok(Void);
    };
    appManifestProvider.updateCapability = async (): Promise<Result<Void, FxError>> => {
      return ok(Void);
    };
    const ctxV3: ContextWithManifestProvider = { ...ctx, appManifestProvider };
    Sinon.stub(SPFxPluginImpl.prototype, "scaffold").resolves(ok(undefined));
    const addCapabilities = Sinon.stub(appManifestProvider, "addCapabilities");

    await pluginV3.addInstance(ctxV3, inputs);

    chai.assert.isTrue(addCapabilities.calledOnce);
  });

  it("Scaffold-none framework", async () => {
    const componentId = uuid.v4();
    ctx.projectSetting.solutionSettings!.capabilities = [];
    const appManifestProvider = new DefaultManifestProvider();
    appManifestProvider.addCapabilities = async (): Promise<Result<Void, FxError>> => {
      return ok(Void);
    };
    appManifestProvider.updateCapability = async (): Promise<Result<Void, FxError>> => {
      return ok(Void);
    };
    const ctxV3: ContextWithManifestProvider = { ...ctx, appManifestProvider };
    inputs[SPFXQuestionNames.webpart_name] = "helloworld";
    inputs[SPFXQuestionNames.webpart_desp] = "test";
    inputs[SPFXQuestionNames.framework_type] = "none";

    const result = await pluginImplV3.scaffold(ctxV3, inputs, componentId);

    chai.expect(result.isOk()).to.eq(true);
    // check specified files
    const files: string[] = [
      "config/config.json",
      "config/copy-assets.json",
      "config/deploy-azure-storage.json",
      "config/package-solution.json",
      "config/serve.json",
      "config/write-manifests.json",
      "src/webparts/helloworld/HelloworldWebPart.manifest.json",
      "src/webparts/helloworld/HelloworldWebPart.ts",
      "src/webparts/helloworld/loc/en-us.js",
      "src/webparts/helloworld/loc/mystrings.d.ts",
      "src/index.ts",
      ".gitignore",
      "gulpfile.js",
      "package.json",
      "README.md",
      "tsconfig.json",
      "tslint.json",
    ];
    for (const file of files) {
      const filePath = path.join(testFolder, subFolderName, file);
      chai.expect(await fs.pathExists(filePath), `${filePath} must exist.`).to.eq(true);
    }
  });

  it("Scaffold-react framework", async () => {
    const componentId = uuid.v4();
    ctx.projectSetting.solutionSettings!.capabilities = [];
    const appManifestProvider = new DefaultManifestProvider();
    appManifestProvider.addCapabilities = async (): Promise<Result<Void, FxError>> => {
      return ok(Void);
    };
    appManifestProvider.updateCapability = async (): Promise<Result<Void, FxError>> => {
      return ok(Void);
    };
    const ctxV3: ContextWithManifestProvider = { ...ctx, appManifestProvider };
    inputs[SPFXQuestionNames.webpart_name] = "helloworld";
    inputs[SPFXQuestionNames.webpart_desp] = "test";
    inputs[SPFXQuestionNames.framework_type] = "react";

    const result = await pluginImplV3.scaffold(ctxV3, inputs, componentId);

    chai.expect(result.isOk()).to.eq(true);
    // check specified files
    const files: string[] = [
      "config/config.json",
      "config/copy-assets.json",
      "config/deploy-azure-storage.json",
      "config/package-solution.json",
      "config/serve.json",
      "config/write-manifests.json",
      "src/webparts/helloworld/HelloworldWebPart.manifest.json",
      "src/webparts/helloworld/HelloworldWebPart.ts",
      "src/webparts/helloworld/loc/en-us.js",
      "src/webparts/helloworld/loc/mystrings.d.ts",
      "src/index.ts",
      ".gitignore",
      "gulpfile.js",
      "package.json",
      "README.md",
      "tsconfig.json",
      "tslint.json",
    ];
    for (const file of files) {
      const filePath = path.join(testFolder, subFolderName, file);
      chai.expect(await fs.pathExists(filePath), `${filePath} must exist.`).to.eq(true);
    }
  });

  it("buildSharepointPackage", async () => {
    Sinon.stub(ProgressHelper, "startPreDeployProgressHandler");
    Sinon.stub(ProgressHelper, "endPreDeployProgress");
    Sinon.stub(Utils, "execute");
    Sinon.stub(SPFxPluginImpl.prototype, "getPackage" as any);
    Sinon.stub(fs, "pathExists").resolves(true);
    Sinon.stub(path, "normalize").returns("");
    Sinon.stub(path, "parse").returns({ root: "", dir: "", base: "", ext: "", name: "" });
    inputs.platform = Platform.CLI;

    const build = await pluginImplV3.buildSPPackage(ctx, inputs);

    chai.expect(build.isOk()).to.be.true;
  });

  it("deploy", async () => {
    Sinon.stub(SPFxPluginImpl.prototype, "buildSPPackage" as any).returns(ok(undefined));
    Sinon.stub(SPFxPluginImpl.prototype, "getTenant" as any).returns(ok("TENANT_URL"));
    Sinon.stub(SPFxPluginImpl.prototype, "getPackage" as any);
    Sinon.stub(SPFxPluginImpl.prototype, "getAppID" as any);
    Sinon.stub(SPOClient, "getAppCatalogSite").resolves("APP_CATALOG");
    Sinon.stub(SPOClient, "uploadAppPackage").resolves();
    Sinon.stub(SPOClient, "deployAppPackage").resolves();
    Sinon.stub(fs, "pathExists").resolves(true);
    Sinon.stub(path, "parse").returns({ root: "", dir: "", base: "", ext: "", name: "" });
    Sinon.stub(fs, "readFile").resolves("" as any);
    Sinon.stub(MockSharepointTokenProvider.prototype, "getAccessToken").resolves(
      "fakedAccessToken"
    );

    const result = await pluginImplV3.deploy(ctx, inputs, tokenProvider);

    chai.assert.isTrue(result.isOk());
  });
});
