// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { it } from "mocha";
import { TeamsAppSolution } from " ../../../src/plugins/solution";
import {
  ConfigMap,
  SolutionConfig,
  SolutionContext,
  Platform,
  Func,
  ProjectSettings,
  Inputs,
  v2,
} from "@microsoft/teamsfx-api";
import * as sinon from "sinon";
import { GLOBAL_CONFIG, SolutionError } from "../../../src/plugins/solution/fx-solution/constants";
import {
  MockedAppStudioProvider,
  MockedAzureAccountProvider,
  MockedV2Context,
  mockPublishThatAlwaysSucceed,
} from "./util";
import _ from "lodash";
import { ResourcePlugins } from "../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import Container from "typedi";
import { AppStudioPlugin } from "../../../src";
import * as uuid from "uuid";
import {
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
} from "../../../src/plugins/solution/fx-solution/question";
import { executeUserTask } from "../../../src/plugins/solution/fx-solution/v2/executeUserTask";

chai.use(chaiAsPromised);
const expect = chai.expect;
const appStudioPlugin = Container.get<AppStudioPlugin>(ResourcePlugins.AppStudioPlugin);
function mockSolutionContextWithPlatform(platform?: Platform): SolutionContext {
  const config: SolutionConfig = new Map();
  config.set(GLOBAL_CONFIG, new ConfigMap());
  return {
    root: ".",
    config,
    answers: { platform: platform ? platform : Platform.VSCode },
    projectSettings: undefined,
  };
}

describe("executeUserTask VSpublish", async () => {
  it("should return error for non-vs platform", async () => {
    const mockedCtx = mockSolutionContextWithPlatform(Platform.VSCode);
    const solution = new TeamsAppSolution();
    const func: Func = {
      namespace: "solution",
      method: "VSpublish",
    };
    let result = await solution.executeUserTask(func, mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.UnsupportedPlatform);

    mockedCtx.answers!.platform = Platform.CLI;
    result = await solution.executeUserTask(func, mockedCtx);
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.UnsupportedPlatform);

    // mockedCtx.answers!.platform = undefined;
    // result = await solution.executeUserTask(func, mockedCtx);
    // expect(result.isErr()).to.be.true;
    // expect(result._unsafeUnwrapErr().name).equals(SolutionError.UnsupportedPlatform);
  });

  describe("happy path", async () => {
    const mocker = sinon.createSandbox();

    beforeEach(() => {});

    afterEach(() => {
      mocker.restore();
    });

    it("should return ok", async () => {
      const mockedCtx = mockSolutionContextWithPlatform(Platform.VS);
      const solution = new TeamsAppSolution();
      const func: Func = {
        namespace: "solution",
        method: "VSpublish",
      };
      mockPublishThatAlwaysSucceed(appStudioPlugin);
      const spy = mocker.spy(appStudioPlugin, "publish");
      const result = await solution.executeUserTask(func, mockedCtx);
      expect(result.isOk()).to.be.true;
      expect(spy.calledOnce).to.be.true;
    });
  });
});

describe("V2 implementation", () => {
  it("should return err if given invalid router", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        activeResourcePlugins: [appStudioPlugin.name],
      },
    };
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedProvider = new MockedAppStudioProvider();
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
    };

    const result = await executeUserTask(
      mockedCtx,
      { namespace: "someInvalidNamespace", method: "invalid" },
      mockedInputs,
      mockedProvider
    );
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals("executeUserTaskRouteFailed");
  });

  it("should return err when trying to add capability for SPFx project", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "test",
        version: "1.0",
        activeResourcePlugins: [appStudioPlugin.name],
      },
    };
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedProvider = new MockedAppStudioProvider();
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
    };

    const result = await executeUserTask(
      mockedCtx,
      { namespace: "solution", method: "addCapability" },
      mockedInputs,
      mockedProvider
    );
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.FailedToAddCapability);
  });

  it("should return err when trying to add resource for SPFx project", async () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "test",
        version: "1.0",
        activeResourcePlugins: [appStudioPlugin.name],
      },
    };
    const mockedCtx = new MockedV2Context(projectSettings);
    const mockedProvider = new MockedAppStudioProvider();
    const mockedInputs: Inputs = {
      platform: Platform.VSCode,
    };

    const result = await executeUserTask(
      mockedCtx,
      { namespace: "solution", method: "addResource" },
      mockedInputs,
      mockedProvider
    );
    expect(result.isErr()).to.be.true;
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.AddResourceNotSupport);
  });
});
