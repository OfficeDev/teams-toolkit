// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { it } from "mocha";
import { TeamsAppSolution } from " ../../../src/plugins/solution";
import {
  ConfigFolderName,
  ConfigMap,
  SolutionConfig,
  SolutionContext,
  TeamsAppManifest,
} from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import fs, { PathLike } from "fs-extra";
import {
  BOTS_TPL,
  COMPOSE_EXTENSIONS_TPL,
  CONFIGURABLE_TABS_TPL,
  DEFAULT_PERMISSION_REQUEST,
  GLOBAL_CONFIG,
  PROGRAMMING_LANGUAGE,
  REMOTE_MANIFEST,
  SolutionError,
  STATIC_TABS_TPL,
} from "../../../src/plugins/solution/fx-solution/constants";
import {
  AzureSolutionQuestionNames,
  BotOptionItem,
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
  MessageExtensionItem,
  TabOptionItem,
} from "../../../src/plugins/solution/fx-solution/question";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("Solution running state on creation", () => {
  const solution = new TeamsAppSolution();
  it("should be idle", () => {
    expect(solution.runningState).equal("idle");
  });
});

describe("Solution create()", async () => {
  function mockSolutionContext(): SolutionContext {
    const config: SolutionConfig = new Map();
    return {
      root: ".",
      app: new TeamsAppManifest(),
      config,
      answers: new ConfigMap(),
      projectSettings: undefined,
    };
  }

  const mocker = sinon.createSandbox();
  const permissionsJsonPath = "./permissions.json";
  const fileContent: Map<string, any> = new Map();
  beforeEach(() => {
    mocker.stub(fs, "writeFile").callsFake((path: number | PathLike, data: any) => {
      fileContent.set(path.toString(), data);
    });
    // mocker.stub(fs, "writeFile").resolves();
    mocker.stub(fs, "writeJSON").callsFake((file: string, obj: any) => {
      fileContent.set(file, JSON.stringify(obj));
    });
    // Uses stub<any, any> to circumvent type check. Beacuse sinon fails to mock my target overload of readJson.
    mocker.stub<any, any>(fs, "readJson").withArgs(permissionsJsonPath).resolves({});
    mocker.stub<any, any>(fs, "pathExists").withArgs(permissionsJsonPath).resolves(true);
    mocker.stub<any, any>(fs, "copy").resolves();
  });

  it("should fail if projectSettings is undefined", async () => {
    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedSolutionCtx = mockSolutionContext();
    const result = await solution.create(mockedSolutionCtx);
    expect(result.isErr()).equals(true);
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.InternelError);
    // expect(mockedSolutionCtx.config.get(GLOBAL_CONFIG)).to.be.not.undefined;
  });

  it("should fail if projectSettings.solutionSettings is undefined", async () => {
    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedSolutionCtx = mockSolutionContext();
    mockedSolutionCtx.projectSettings = {
      appName: "my app",
      solutionSettings: undefined,
    };
    const result = await solution.create(mockedSolutionCtx);
    expect(result.isErr()).equals(true);
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.InternelError);
  });

  it("should fail if capability is empty", async () => {
    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedSolutionCtx = mockSolutionContext();
    mockedSolutionCtx.projectSettings = {
      appName: "my app",
      solutionSettings: {
        name: "azure",
        version: "1.0",
      },
    };
    const result = await solution.create(mockedSolutionCtx);
    expect(result.isErr()).equals(true);
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.InternelError);
  });

  it("should succeed if projectSettings, solution settings and capabilities are provided", async () => {
    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedSolutionCtx = mockSolutionContext();
    mockedSolutionCtx.projectSettings = {
      appName: "my app",
      solutionSettings: {
        name: "azure",
        version: "1.0",
      },
    };
    mockedSolutionCtx.answers?.set(AzureSolutionQuestionNames.Capabilities, [BotOptionItem.id]);
    const result = await solution.create(mockedSolutionCtx);
    expect(result.isOk()).equals(true);
    expect(mockedSolutionCtx.config.get(GLOBAL_CONFIG)).is.not.undefined;
  });

  it("should set programmingLanguage in config if programmingLanguage is in answers", async () => {
    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedSolutionCtx = mockSolutionContext();
    mockedSolutionCtx.projectSettings = {
      appName: "my app",
      solutionSettings: {
        name: "azure",
        version: "1.0",
      },
    };
    mockedSolutionCtx.answers?.set(AzureSolutionQuestionNames.Capabilities, [BotOptionItem.id]);
    const programmingLanguage = "TypeScript";
    mockedSolutionCtx.answers?.set(
      AzureSolutionQuestionNames.ProgrammingLanguage,
      programmingLanguage
    );
    const result = await solution.create(mockedSolutionCtx);
    expect(result.isOk()).equals(true);
    const lang = mockedSolutionCtx.config.get(GLOBAL_CONFIG)?.getString(PROGRAMMING_LANGUAGE);
    expect(lang).equals(programmingLanguage);
  });

  it("shouldn't set programmingLanguage in config if programmingLanguage is not in answers", async () => {
    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedSolutionCtx = mockSolutionContext();
    mockedSolutionCtx.projectSettings = {
      appName: "my app",
      solutionSettings: {
        name: "azure",
        version: "1.0",
      },
    };
    mockedSolutionCtx.answers?.set(AzureSolutionQuestionNames.Capabilities, [BotOptionItem.id]);
    const result = await solution.create(mockedSolutionCtx);
    expect(result.isOk()).equals(true);
    const lang = mockedSolutionCtx.config.get(GLOBAL_CONFIG)?.getString(PROGRAMMING_LANGUAGE);
    expect(lang).to.be.undefined;
  });

  it("should require hostType azure in answers if tab is chosen", async () => {
    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedSolutionCtx = mockSolutionContext();
    mockedSolutionCtx.projectSettings = {
      appName: "my app",
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
      },
    };

    mockedSolutionCtx.answers?.set(AzureSolutionQuestionNames.Capabilities, [TabOptionItem.id]);
    const result = await solution.create(mockedSolutionCtx);
    expect(result.isErr()).equals(true);
    expect(result._unsafeUnwrapErr().message).equals("hostType is undefined");
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.InternelError);
  });

  it("should generate manifest and permissions.json for azure tab", async () => {
    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedSolutionCtx = mockSolutionContext();
    mockedSolutionCtx.projectSettings = {
      appName: "my app",
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
      },
    };

    mockedSolutionCtx.answers?.set(AzureSolutionQuestionNames.Capabilities, [TabOptionItem.id]);
    mockedSolutionCtx.answers?.set(AzureSolutionQuestionNames.HostType, HostTypeOptionAzure.id);

    const result = await solution.create(mockedSolutionCtx);
    expect(result.isOk()).equals(true);
    const manifest: TeamsAppManifest = JSON.parse(
      fileContent.get(`${mockedSolutionCtx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`)
    );
    expect(manifest.staticTabs).to.deep.equal(STATIC_TABS_TPL);
    expect(manifest.configurableTabs).to.deep.equal(CONFIGURABLE_TABS_TPL);
    expect(manifest.bots, "Bots should be empty, because only tab is chosen").to.deep.equal([]);
    expect(
      manifest.composeExtensions,
      "ComposeExtensions should be empty, because only tab is chosen"
    ).to.deep.equal([]);

    const permissionJson = fileContent.get(`${mockedSolutionCtx.root}/permissions.json`);
    expect(JSON.parse(permissionJson)).to.be.deep.equal(DEFAULT_PERMISSION_REQUEST);
  });

  it("should generate manifest and permissions.json for bot", async () => {
    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedSolutionCtx = mockSolutionContext();
    mockedSolutionCtx.projectSettings = {
      appName: "my app",
      solutionSettings: {
        name: "azure",
        version: "1.0",
      },
    };

    mockedSolutionCtx.answers?.set(AzureSolutionQuestionNames.Capabilities, [BotOptionItem.id]);

    const result = await solution.create(mockedSolutionCtx);
    expect(result.isOk()).equals(true);
    const manifest: TeamsAppManifest = JSON.parse(
      fileContent.get(`${mockedSolutionCtx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`)
    );
    expect(
      manifest.staticTabs,
      "staticTabs should be empty, because only bot is chosen"
    ).to.deep.equal([]);
    expect(
      manifest.configurableTabs,
      "configurableTabs should be empty, because only bot is chosen"
    ).to.deep.equal([]);
    expect(manifest.bots).to.deep.equal(BOTS_TPL);
    expect(
      manifest.composeExtensions,
      "ComposeExtensions should be empty, because only bot is chosen"
    ).to.deep.equal([]);

    const permissionJson = fileContent.get(`${mockedSolutionCtx.root}/permissions.json`);
    expect(JSON.parse(permissionJson)).to.be.deep.equal(DEFAULT_PERMISSION_REQUEST);
  });

  it("should generate manifest and permissions.json for messaging extension", async () => {
    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedSolutionCtx = mockSolutionContext();
    mockedSolutionCtx.projectSettings = {
      appName: "my app",
      solutionSettings: {
        name: "azure",
        version: "1.0",
      },
    };

    mockedSolutionCtx.answers?.set(AzureSolutionQuestionNames.Capabilities, [
      MessageExtensionItem.id,
    ]);

    const result = await solution.create(mockedSolutionCtx);
    expect(result.isOk()).equals(true);
    const manifest: TeamsAppManifest = JSON.parse(
      fileContent.get(`${mockedSolutionCtx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`)
    );
    expect(
      manifest.staticTabs,
      "staticTabs should be empty, because only msgext is chosen"
    ).to.deep.equal([]);
    expect(
      manifest.configurableTabs,
      "configurableTabs should be empty, because msgext bot is chosen"
    ).to.deep.equal([]);
    expect(manifest.bots, "Bots should be empty, because only msgext is chosen").to.deep.equal([]);
    expect(manifest.composeExtensions).to.deep.equal(COMPOSE_EXTENSIONS_TPL);

    const permissionJson = fileContent.get(`${mockedSolutionCtx.root}/permissions.json`);
    expect(JSON.parse(permissionJson)).to.be.deep.equal(DEFAULT_PERMISSION_REQUEST);
  });

  it("should generate manifest and permissions.json for tab, bot and messaging extension", async () => {
    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedSolutionCtx = mockSolutionContext();
    mockedSolutionCtx.projectSettings = {
      appName: "my app",
      solutionSettings: {
        name: "azure",
        version: "1.0",
      },
    };

    mockedSolutionCtx.answers?.set(AzureSolutionQuestionNames.Capabilities, [
      TabOptionItem.id,
      BotOptionItem.id,
      MessageExtensionItem.id,
    ]);
    mockedSolutionCtx.answers?.set(AzureSolutionQuestionNames.HostType, HostTypeOptionAzure.id);

    const result = await solution.create(mockedSolutionCtx);
    expect(result.isOk()).equals(true);
    const manifest: TeamsAppManifest = JSON.parse(
      fileContent.get(`${mockedSolutionCtx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`)
    );
    expect(manifest.staticTabs).to.deep.equal(STATIC_TABS_TPL);
    expect(manifest.configurableTabs).to.deep.equal(CONFIGURABLE_TABS_TPL);
    expect(manifest.bots).to.deep.equal(BOTS_TPL);
    expect(manifest.composeExtensions).to.deep.equal(COMPOSE_EXTENSIONS_TPL);

    const permissionJson = fileContent.get(`${mockedSolutionCtx.root}/permissions.json`);
    expect(JSON.parse(permissionJson)).to.be.deep.equal(DEFAULT_PERMISSION_REQUEST);
  });

  it("shouldn't generate permissions.json for SPFx project", async () => {
    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedSolutionCtx = mockSolutionContext();
    mockedSolutionCtx.projectSettings = {
      appName: "my app",
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
      },
    };

    mockedSolutionCtx.answers?.set(AzureSolutionQuestionNames.Capabilities, [TabOptionItem.id]);
    mockedSolutionCtx.answers?.set(AzureSolutionQuestionNames.HostType, HostTypeOptionSPFx.id);

    const result = await solution.create(mockedSolutionCtx);
    expect(result.isOk()).equals(true);
    const manifest = fileContent.get(
      `${mockedSolutionCtx.root}/.${ConfigFolderName}/${REMOTE_MANIFEST}`
    );
    expect(manifest).to.be.not.undefined;

    const permissionJson = fileContent.get(`${mockedSolutionCtx.root}/permissions.json`);
    expect(permissionJson).to.be.undefined;
  });

  afterEach(() => {
    mocker.restore();
  });
});
