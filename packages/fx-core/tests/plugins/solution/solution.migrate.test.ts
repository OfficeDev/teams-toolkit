// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { it } from "mocha";
import { SolutionRunningState, TeamsAppSolution } from " ../../../src/plugins/solution";
import { Platform, SolutionConfig, SolutionContext } from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import fs, { PathLike } from "fs-extra";
import {
  GLOBAL_CONFIG,
  PROGRAMMING_LANGUAGE,
  SolutionError,
} from "../../../src/plugins/solution/fx-solution/constants";
import {
  AzureSolutionQuestionNames,
  BotOptionItem,
  TabOptionItem,
} from "../../../src/plugins/solution/fx-solution/question";
import * as uuid from "uuid";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("Solution migrate()", async () => {
  function mockSolutionContext(): SolutionContext {
    const config: SolutionConfig = new Map();
    return {
      root: ".",
      config,
      answers: { platform: Platform.VSCode },
      projectSettings: undefined,
    };
  }

  const fileContent: Map<string, any> = new Map();

  it("should fail if projectSettings is undefined", async () => {
    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedSolutionCtx = mockSolutionContext();
    const result = await solution.migrate(mockedSolutionCtx);
    expect(result.isErr()).equals(true);
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.InternelError);
    expect(result._unsafeUnwrapErr().message).equals("projectSettings is undefined");
    expect(mockedSolutionCtx.config.get(GLOBAL_CONFIG)).to.be.not.undefined;
  });

  it("should fail if projectSettings.solutionSettings is undefined", async () => {
    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedSolutionCtx = mockSolutionContext();
    mockedSolutionCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: undefined,
    };
    const result = await solution.migrate(mockedSolutionCtx);
    expect(result.isErr()).equals(true);
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.InternelError);
    expect(result._unsafeUnwrapErr().message).equals("solutionSettings is undefined");
    expect(mockedSolutionCtx.config.get(GLOBAL_CONFIG)).to.be.not.undefined;
  });

  it("should fail if capability is undefined", async () => {
    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedSolutionCtx = mockSolutionContext();
    mockedSolutionCtx.projectSettings = {
      appName: "my app",
      programmingLanguage: "",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
      },
    };
    const result = await solution.migrate(mockedSolutionCtx);
    expect(result.isErr()).equals(true);
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.InternelError);
    expect(result._unsafeUnwrapErr().message).equals("capabilities is empty");
    expect(mockedSolutionCtx.config.get(GLOBAL_CONFIG)).to.be.not.undefined;
  });

  it("should succeed if projectSettings, solution settings and v1 capability are provided, language is javascript", async () => {
    const mocker = sinon.createSandbox();
    mocker.stub(fs, "access").callsFake((path: PathLike, mode?: number) => {
      throw new Error("");
    });
    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedSolutionCtx = mockSolutionContext();
    mockedSolutionCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
      },
    };

    const answers = mockedSolutionCtx.answers!;
    answers[AzureSolutionQuestionNames.V1Capability] = TabOptionItem.id;

    const result = await solution.migrate(mockedSolutionCtx);
    expect(result.isOk()).equals(true);
    expect(mockedSolutionCtx.config.get(GLOBAL_CONFIG)).is.not.undefined;
    const lang = mockedSolutionCtx.projectSettings.programmingLanguage;
    expect(lang).equals("javascript");
    mocker.restore();
  });

  it("should succeed if projectSettings, solution settings and v1 capability are provided, language is typescript", async () => {
    const mocker = sinon.createSandbox();
    mocker.stub(fs, "access").callsFake(
      async (path: PathLike, mode?: number): Promise<void> => {
        return;
      }
    );
    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedSolutionCtx = mockSolutionContext();
    mockedSolutionCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        name: "azure",
        version: "1.0",
      },
    };

    const answers = mockedSolutionCtx.answers!;
    answers[AzureSolutionQuestionNames.V1Capability] = TabOptionItem.id;

    const result = await solution.migrate(mockedSolutionCtx);
    expect(result.isOk()).equals(true);
    expect(mockedSolutionCtx.config.get(GLOBAL_CONFIG)).is.not.undefined;
    const lang = mockedSolutionCtx.projectSettings.programmingLanguage;
    expect(lang).equals("typescript");
    mocker.restore();
  });
});
