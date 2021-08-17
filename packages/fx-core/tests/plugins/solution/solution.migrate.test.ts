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

  const mocker = sinon.createSandbox();
  const fileContent: Map<string, any> = new Map();
  beforeEach(() => {});

  it("should fail if projectSettings is undefined", async () => {
    fileContent.clear();
    const solution = new TeamsAppSolution();
    const mockedSolutionCtx = mockSolutionContext();
    const result = await solution.migrate(mockedSolutionCtx);
    expect(result.isErr()).equals(true);
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.InternelError);
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
  });

  it("should succeed if projectSettings, solution settings and programming language are provided", async () => {
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
    // TODO: Enable after bot capacity supported
    // const answers = mockedSolutionCtx.answers!;
    // answers[AzureSolutionQuestionNames.Capabilities] = [BotOptionItem.id];
    const answers = mockedSolutionCtx.answers!;
    const programmingLanguage = "TypeScript";
    answers[AzureSolutionQuestionNames.ProgrammingLanguage as string] = programmingLanguage;
    const result = await solution.migrate(mockedSolutionCtx);
    expect(result.isOk()).equals(true);
    expect(mockedSolutionCtx.config.get(GLOBAL_CONFIG)).is.not.undefined;
  });

  it("should set programmingLanguage in config if programmingLanguage is in answers", async () => {
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
    const answers = mockedSolutionCtx.answers!;
    answers[AzureSolutionQuestionNames.Capabilities as string] = [BotOptionItem.id];
    const programmingLanguage = "TypeScript";
    answers[AzureSolutionQuestionNames.ProgrammingLanguage as string] = programmingLanguage;
    const result = await solution.migrate(mockedSolutionCtx);
    expect(result.isOk()).equals(true);

    const lang = mockedSolutionCtx.projectSettings.programmingLanguage;
    expect(lang).equals(programmingLanguage);
  });

  it("shouldn't throw error if programmingLanguage is not in answers", async () => {
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
    const result = await solution.migrate(mockedSolutionCtx);
    expect(result.isErr()).equals(true);
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.InternelError);
  });

  afterEach(() => {
    mocker.restore();
  });
});
