// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { it } from "mocha";
import { TeamsAppSolution } from " ../../../src/plugins/solution";
import {
  Platform,
  SolutionContext,
  ok,
  Result,
  FxError,
  SolutionSettings,
} from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import fs, { PathLike, writeJson } from "fs-extra";
import { GLOBAL_CONFIG, SolutionError } from "../../../src/plugins/solution/fx-solution/constants";
import {
  AzureSolutionQuestionNames,
  TabOptionItem,
} from "../../../src/plugins/solution/fx-solution/question";
import * as uuid from "uuid";
import { newEnvInfo } from "../../../src/core/tools";
import { LocalCrypto } from "../../../src/core/crypto";
import { MockedLogProvider, MockedTelemetryReporter } from "./util";
import { Stage, VsCodeEnv } from "@microsoft/teamsfx-api/build/constants";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("Solution migrate()", async () => {
  function mockSolutionContext(): SolutionContext {
    return {
      root: ".",
      envInfo: newEnvInfo(),
      answers: {
        platform: Platform.VSCode,
        projectPath: ".",
        "v1-capability": "Tab",
        "default-app-name-func": "v1personalts",
        stage: Stage.migrateV1,
        vscodeEnv: VsCodeEnv.local,
      },
      projectSettings: {
        appName: "my app",
        projectId: uuid.v4(),
        solutionSettings: {
          name: "azure",
          version: "1.0",
          migrateFromV1: true,
        },
      },
      telemetryReporter: new MockedTelemetryReporter(),
      logProvider: new MockedLogProvider(),
      cryptoProvider: new LocalCrypto(""),
    };
  }

  const mocker = sinon.createSandbox();
  afterEach(() => {
    mocker.restore();
  });

  const fileContent: Map<string, any> = new Map();

  it("should fail if projectSettings is undefined", async () => {
    fileContent.clear();
    const solution = new TeamsAppSolution();
    cleanPlugins(solution, mocker);
    const mockedSolutionCtx = mockSolutionContext();
    mockedSolutionCtx.projectSettings = undefined;
    const result = await solution.migrate(mockedSolutionCtx);
    expect(result.isErr()).equals(true);
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.InternelError);
    expect(result._unsafeUnwrapErr().message).equals("projectSettings is undefined");
    expect(mockedSolutionCtx.envInfo.state.get(GLOBAL_CONFIG)).to.be.not.undefined;
  });

  it("should fail if projectSettings.solutionSettings is undefined", async () => {
    fileContent.clear();
    const solution = new TeamsAppSolution();
    cleanPlugins(solution, mocker);
    const mockedSolutionCtx = mockSolutionContext();
    mockedSolutionCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: undefined as unknown as SolutionSettings,
    };
    const result = await solution.migrate(mockedSolutionCtx);
    expect(result.isErr()).equals(true);
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.InternelError);
    expect(result._unsafeUnwrapErr().message).equals("solutionSettings is undefined");
    expect(mockedSolutionCtx.envInfo.state.get(GLOBAL_CONFIG)).to.be.not.undefined;
  });

  it("should fail if capability is undefined", async () => {
    fileContent.clear();
    const solution = new TeamsAppSolution();
    cleanPlugins(solution, mocker);
    const mockedSolutionCtx = mockSolutionContext();
    mockedSolutionCtx.answers!["v1-capability"] = undefined;
    mockedSolutionCtx.projectSettings = {
      appName: "my app",
      programmingLanguage: "",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
        migrateFromV1: true,
      },
    };
    const result = await solution.migrate(mockedSolutionCtx);
    expect(result.isErr()).equals(true);
    //expect(result._unsafeUnwrapErr().name).equals(SolutionError.InternelError);
    expect(result._unsafeUnwrapErr().message).equals("capabilities is empty");
    expect(mockedSolutionCtx.envInfo.state.get(GLOBAL_CONFIG)).to.be.not.undefined;
  });

  it("should succeed if projectSettings, solution settings and v1 capability are provided, language is javascript", async () => {
    mocker.stub(fs, "pathExists").callsFake((path: PathLike) => {
      if (path.toString().includes("README")) {
        return true;
      }
      return false;
    });
    mocker.stub(fs, "copy").callsFake(() => {});
    mocker.stub(fs, "ensureDir").callsFake(() => {});
    mocker
      .stub(fs, "writeJSON")
      .callsFake(async (file: string, object: any, options: fs.WriteOptions) => {
        fileContent.set(file, object);
      });
    mocker.stub(fs, "writeFile").callsFake(async (file, data) => {
      fileContent.set(file.toString(), data);
    });
    fileContent.clear();
    const solution = new TeamsAppSolution();
    cleanPlugins(solution, mocker);
    const mockedSolutionCtx = mockSolutionContext();

    const answers = mockedSolutionCtx.answers!;
    answers[AzureSolutionQuestionNames.V1Capability] = TabOptionItem.id;

    const result = await solution.migrate(mockedSolutionCtx);
    expect(result.isOk()).equals(true);
    expect(mockedSolutionCtx.envInfo.state.get(GLOBAL_CONFIG)).is.not.undefined;
    const lang = mockedSolutionCtx.projectSettings?.programmingLanguage;
    expect(lang).equals("javascript");
    expect(fileContent.has("./.vscode/launch.json")).to.be.true;
    expect(fileContent.has("./.vscode/tasks.json")).to.be.true;
    expect(fileContent.has("./.fx/configs/localSettings.json")).to.be.true;
  });

  it("should succeed if projectSettings, solution settings and v1 capability are provided, language is typescript", async () => {
    mocker.stub(fs, "pathExists").callsFake((path: PathLike) => {
      return true;
    });
    mocker.stub(fs, "copy").callsFake(() => {});
    mocker.stub(fs, "ensureDir").callsFake(() => {});
    mocker
      .stub(fs, "writeJSON")
      .callsFake(async (file: string, object: any, options: fs.WriteOptions) => {
        fileContent.set(file, object);
      });
    mocker.stub(fs, "writeFile").callsFake(async (file, data) => {
      fileContent.set(file.toString(), data);
    });
    fileContent.clear();
    const solution = new TeamsAppSolution();
    cleanPlugins(solution, mocker);
    const mockedSolutionCtx = mockSolutionContext();

    const answers = mockedSolutionCtx.answers!;
    answers[AzureSolutionQuestionNames.V1Capability] = TabOptionItem.id;

    const result = await solution.migrate(mockedSolutionCtx);
    expect(result.isOk()).equals(true);
    expect(mockedSolutionCtx.envInfo.state.get(GLOBAL_CONFIG)).is.not.undefined;
    const lang = mockedSolutionCtx.projectSettings?.programmingLanguage;
    expect(lang).equals("typescript");
    expect(fileContent.has("./.vscode/launch.json")).to.be.true;
    expect(fileContent.has("./.vscode/tasks.json")).to.be.true;
    expect(fileContent.has("./.fx/configs/localSettings.json")).to.be.true;
  });
});

function cleanPlugins(solution: TeamsAppSolution, mocker: sinon.SinonSandbox) {
  mocker
    .stub(solution.LocalDebugPlugin, "executeUserTask")
    .callsFake(async (): Promise<Result<any, FxError>> => {
      return ok(undefined);
    });
  mocker.stub(solution.AadPlugin, "activate").callsFake((): boolean => {
    return false;
  });
  mocker.stub(solution.ApimPlugin, "activate").callsFake((): boolean => {
    return false;
  });
  mocker.stub(solution.AppStudioPlugin, "activate").callsFake((): boolean => {
    return false;
  });
  mocker.stub(solution.BotPlugin, "activate").callsFake((): boolean => {
    return false;
  });
  mocker.stub(solution.SpfxPlugin, "activate").callsFake((): boolean => {
    return false;
  });
  mocker.stub(solution.FrontendPlugin, "activate").callsFake((): boolean => {
    return true;
  });
  mocker.stub(solution.FrontendPlugin, "executeUserTask").callsFake(() => {
    return ok(undefined);
  });
  mocker.stub(solution.FunctionPlugin, "activate").callsFake((): boolean => {
    return true;
  });
  mocker.stub(solution.FunctionPlugin, "executeUserTask").callsFake(() => {
    return ok(undefined);
  });
  mocker.stub(solution.SqlPlugin, "activate").callsFake((): boolean => {
    return false;
  });
  mocker.stub(solution.LocalDebugPlugin, "activate").callsFake((): boolean => {
    return true;
  });
}
