// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
const expect = chai.expect;

import { it } from "mocha";
import { TeamsAppSolution } from " ../../../src/plugins/solution";
import {
  ConfigMap,
  err,
  Func,
  FxError,
  ok,
  Platform,
  Result,
  returnSystemError,
  SolutionConfig,
  SolutionContext,
  Void,
} from "@microsoft/teamsfx-api";
import {
  GLOBAL_CONFIG,
  SolutionError,
  SOLUTION_PROVISION_SUCCEEDED,
} from "../../../src/plugins/solution/fx-solution/constants";
import {
  AzureResourceApim,
  AzureResourceFunction,
  AzureResourceSQL,
  AzureSolutionQuestionNames,
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
  TabOptionItem,
} from "../../../src/plugins/solution/fx-solution/question";

import _ from "lodash";
import * as uuid from "uuid";
import { ResourcePlugins } from "../../../src/plugins/solution/fx-solution/ResourcePluginContainer";
import Container from "typedi";
import { MockUserInteraction } from "../../core/utils";
import mockedEnv from "mocked-env";
import { newEnvInfo } from "../../../src/core/tools";
import { LocalCrypto } from "../../../src/core/crypto";

const fehostPlugin = Container.get<Plugin>(ResourcePlugins.FrontendPlugin);
const localDebug = Container.get<Plugin>(ResourcePlugins.LocalDebugPlugin);
const sqlPlugin = Container.get<Plugin>(ResourcePlugins.SqlPlugin);
const functionPlugin = Container.get<Plugin>(ResourcePlugins.FunctionPlugin);
const apimPlugin = Container.get<Plugin>(ResourcePlugins.ApimPlugin);
function mockSolutionContext(): SolutionContext {
  const config: SolutionConfig = new Map();
  return {
    root: ".",
    envInfo: newEnvInfo(),
    answers: { platform: Platform.VSCode },
    projectSettings: undefined,
    cryptoProvider: new LocalCrypto(""),
  };
}

describe("update()", () => {
  it("should return internal error if answers is undefined", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.answers = undefined;
    const func: Func = {
      namespace: "fx-solution-azure",
      method: "addResource",
    };
    const result = await solution.executeUserTask(func, mockedCtx);
    expect(result.isErr()).equals(true);
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.InternelError);
  });

  it("should return AddResourceNotSupport for SPFx project", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.answers = { platform: Platform.VSCode };
    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionSPFx.id,
        name: "azure",
        version: "1.0",
      },
    };
    const result = await solution.update(mockedCtx);
    expect(result.isErr()).equals(true);
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.AddResourceNotSupport);
  });

  it("should return AddResourceNotSupport if capabilities is empty", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.answers = { platform: Platform.VSCode };
    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
      },
    };
    const result = await solution.update(mockedCtx);
    expect(result.isErr()).equals(true);
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.AddResourceNotSupport);
  });

  it("should return AddResourceNotSupport if capabilities doesn't contain Tab", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.answers = { platform: Platform.VSCode };
    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        capabilities: [],
      },
    };
    const result = await solution.update(mockedCtx);
    expect(result.isErr()).equals(true);
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.AddResourceNotSupport);
  });

  it("should return AddResourceNotSupport if user tries to add SQL when SQL is already activated", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.answers = { platform: Platform.VSCode };
    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        capabilities: [TabOptionItem.id],
        activeResourcePlugins: [fehostPlugin.name, localDebug.name, sqlPlugin.name],
      },
    };
    mockedCtx.answers![AzureSolutionQuestionNames.AddResources] = [AzureResourceSQL.id];
    const result = await solution.update(mockedCtx);
    expect(result.isErr()).equals(true);
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.AddResourceNotSupport);
  });

  it("should return AddResourceNotSupport if user tries to add APIM when APIM is already activated", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.answers = { platform: Platform.VSCode };
    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        capabilities: [TabOptionItem.id],
        activeResourcePlugins: [fehostPlugin.name, localDebug.name, apimPlugin.name],
      },
    };
    mockedCtx.answers![AzureSolutionQuestionNames.AddResources] = [AzureResourceApim.id];
    const result = await solution.update(mockedCtx);
    expect(result.isErr()).equals(true);
    expect(result._unsafeUnwrapErr().name).equals(SolutionError.AddResourceNotSupport);
  });

  it("should add FunctionPlugin when adding SQL if FunctionPlugin is not already added", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.answers = { platform: Platform.VSCode };
    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        capabilities: [TabOptionItem.id],
        activeResourcePlugins: [fehostPlugin.name, localDebug.name],
        azureResources: [],
      },
    };
    mockedCtx.answers![AzureSolutionQuestionNames.AddResources] = [AzureResourceSQL.id];
    solution.doScaffold = async function (
      _ctx: SolutionContext,
      _selectedPlugins
    ): Promise<Result<any, FxError>> {
      return ok(Void);
    };

    let confirmDialogDisplayed = false;
    mockedCtx.ui = new MockUserInteraction();
    mockedCtx.ui.showMessage = async (
      level: "info" | "warn" | "error",
      message: string | any,
      modal: boolean,
      ...items: string[]
    ): Promise<Result<string | undefined, FxError>> => {
      confirmDialogDisplayed = true;
      return ok("Ok");
    };
    const result = await solution.update(mockedCtx);
    expect(result.isOk()).equals(true);
    expect(mockedCtx.projectSettings?.solutionSettings?.azureResources as string[]).contains(
      AzureResourceSQL.id
    );
    expect(mockedCtx.projectSettings?.solutionSettings?.azureResources as string[]).contains(
      AzureResourceFunction.id
    );
  });

  it("should add FunctionPlugin when adding APIM if FunctionPlugin is not already added", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.answers = { platform: Platform.VSCode };
    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        capabilities: [TabOptionItem.id],
        activeResourcePlugins: [fehostPlugin.name, localDebug.name],
        azureResources: [],
      },
    };
    mockedCtx.answers![AzureSolutionQuestionNames.AddResources] = [AzureResourceApim.id];
    solution.doScaffold = async function (
      _ctx: SolutionContext,
      _selectedPlugins
    ): Promise<Result<any, FxError>> {
      return ok(Void);
    };
    let confirmDialogDisplayed = false;
    mockedCtx.ui = new MockUserInteraction();
    mockedCtx.ui.showMessage = async (
      level: "info" | "warn" | "error",
      message: string | any,
      modal: boolean,
      ...items: string[]
    ): Promise<Result<string | undefined, FxError>> => {
      confirmDialogDisplayed = true;
      return ok("Ok");
    };
    const result = await solution.update(mockedCtx);
    expect(result.isOk()).equals(true);
    expect(mockedCtx.projectSettings?.solutionSettings?.azureResources as string[]).contains(
      AzureResourceApim.id
    );
    expect(mockedCtx.projectSettings?.solutionSettings?.azureResources as string[]).contains(
      AzureResourceFunction.id
    );
  });

  it("should set provisionSucceeded to false", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.answers = { platform: Platform.VSCode };
    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        capabilities: [TabOptionItem.id],
        activeResourcePlugins: [fehostPlugin.name, localDebug.name],
        azureResources: [],
      },
    };
    mockedCtx.answers![AzureSolutionQuestionNames.AddResources] = [AzureResourceApim.id];
    solution.doScaffold = async function (
      _ctx: SolutionContext,
      _selectedPlugins
    ): Promise<Result<any, FxError>> {
      return ok(Void);
    };
    let confirmDialogDisplayed = false;
    mockedCtx.ui = new MockUserInteraction();
    mockedCtx.ui.showMessage = async (
      level: "info" | "warn" | "error",
      message: string | any,
      modal: boolean,
      ...items: string[]
    ): Promise<Result<string | undefined, FxError>> => {
      confirmDialogDisplayed = true;
      return ok("Ok");
    };
    // mock that provision already succeeded
    mockedCtx.envInfo.state.set(GLOBAL_CONFIG, new ConfigMap());
    mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
    const result = await solution.update(mockedCtx);
    expect(result.isOk()).equals(true);
    expect(mockedCtx.projectSettings?.solutionSettings?.azureResources as string[]).contains(
      AzureResourceApim.id
    );
    expect(mockedCtx.projectSettings?.solutionSettings?.azureResources as string[]).contains(
      AzureResourceFunction.id
    );
    expect(mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.get(SOLUTION_PROVISION_SUCCEEDED)).is.false;
  });

  it("should leave projectSettings unchanged if scaffold fails", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.answers = { platform: Platform.VSCode };
    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        capabilities: [TabOptionItem.id],
        activeResourcePlugins: [fehostPlugin.name, localDebug.name],
        azureResources: [],
      },
    };
    const originalProjectSettings = _.cloneDeep(mockedCtx.projectSettings);
    mockedCtx.answers![AzureSolutionQuestionNames.AddResources] = [AzureResourceApim.id];
    solution.doScaffold = async function (
      _ctx: SolutionContext,
      _selectedPlugins
    ): Promise<Result<any, FxError>> {
      return err(returnSystemError(new Error("Some fake error"), "SolutionTest", "FakeError"));
    };
    let confirmDialogDisplayed = false;
    mockedCtx.ui = new MockUserInteraction();
    mockedCtx.ui.showMessage = async (
      level: "info" | "warn" | "error",
      message: string | any,
      modal: boolean,
      ...items: string[]
    ): Promise<Result<string | undefined, FxError>> => {
      confirmDialogDisplayed = true;
      return ok("Ok");
    };
    // mock that provision already succeeded
    mockedCtx.envInfo.state.set(GLOBAL_CONFIG, new ConfigMap());
    mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
    const result = await solution.update(mockedCtx);
    expect(result.isOk()).equals(false);
    expect(mockedCtx.projectSettings).to.be.deep.equal(originalProjectSettings);
    // provisionSucceeded is not changed due to the failure of solution.update()
    expect(mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.get(SOLUTION_PROVISION_SUCCEEDED)).to.be
      .true;
  });

  it("shouldn't set provisionSucceeded to false when adding a new Function endpoint", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.answers = { platform: Platform.VSCode };
    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        capabilities: [TabOptionItem.id],
        activeResourcePlugins: [fehostPlugin.name, localDebug.name, functionPlugin.name],
        azureResources: [AzureResourceFunction.id],
      },
    };
    mockedCtx.answers![AzureSolutionQuestionNames.AddResources] = [AzureResourceFunction.id];
    solution.doScaffold = async function (
      _ctx: SolutionContext,
      _selectedPlugins
    ): Promise<Result<any, FxError>> {
      return ok(Void);
    };
    // mock that provision already succeeded
    mockedCtx.envInfo.state.set(GLOBAL_CONFIG, new ConfigMap());
    mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
    const result = await solution.update(mockedCtx);
    expect(result.isOk()).equals(true);
    // provisionSucceeded is not changed because function is already added.
    expect(mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.get(SOLUTION_PROVISION_SUCCEEDED)).to.be
      .true;
  });

  it("should set provisionSucceeded to false when adding SQL to a project with Function", async () => {
    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.answers = { platform: Platform.VSCode };
    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        capabilities: [TabOptionItem.id],
        activeResourcePlugins: [fehostPlugin.name, localDebug.name, functionPlugin.name],
        azureResources: [AzureResourceFunction.id],
      },
    };
    mockedCtx.answers![AzureSolutionQuestionNames.AddResources] = [
      AzureResourceFunction.id,
      AzureResourceSQL.id,
    ];
    solution.doScaffold = async function (
      _ctx: SolutionContext,
      _selectedPlugins
    ): Promise<Result<any, FxError>> {
      return ok(Void);
    };
    let confirmDialogDisplayed = false;
    mockedCtx.ui = new MockUserInteraction();
    mockedCtx.ui.showMessage = async (
      level: "info" | "warn" | "error",
      message: string | any,
      modal: boolean,
      ...items: string[]
    ): Promise<Result<string | undefined, FxError>> => {
      confirmDialogDisplayed = true;
      return ok("Ok");
    };
    // mock that provision already succeeded
    mockedCtx.envInfo.state.set(GLOBAL_CONFIG, new ConfigMap());
    mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.set(SOLUTION_PROVISION_SUCCEEDED, true);
    const result = await solution.update(mockedCtx);
    expect(result.isOk()).equals(true);
    // provisionSucceeded is not changed because function is already added.
    expect(mockedCtx.envInfo.state.get(GLOBAL_CONFIG)?.get(SOLUTION_PROVISION_SUCCEEDED)).to.be
      .false;
  });

  it("should ask for confirm regenerate ARM template when adding resources", async () => {
    const restore = mockedEnv({
      __TEAMSFX_INSIDER_PREVIEW: "1",
    });

    const solution = new TeamsAppSolution();
    const mockedCtx = mockSolutionContext();
    mockedCtx.answers = { platform: Platform.VSCode };
    mockedCtx.projectSettings = {
      appName: "my app",
      projectId: uuid.v4(),
      solutionSettings: {
        hostType: HostTypeOptionAzure.id,
        name: "azure",
        version: "1.0",
        capabilities: [TabOptionItem.id],
        activeResourcePlugins: [fehostPlugin.name, localDebug.name],
        azureResources: [],
      },
    };
    mockedCtx.answers![AzureSolutionQuestionNames.AddResources] = [AzureResourceFunction.id];

    let generateResourceTemplateResult = false;
    let scaffoldExecuted = false;
    let confirmDialogDisplayed = false;
    solution.doScaffold = async (
      _ctx: SolutionContext,
      _selectedPlugins,
      _generateResourceTemplate
    ): Promise<Result<any, FxError>> => {
      scaffoldExecuted = true;
      generateResourceTemplateResult = _generateResourceTemplate;
      return ok(Void);
    };

    mockedCtx.ui = new MockUserInteraction();
    mockedCtx.ui.showMessage = async (
      level: "info" | "warn" | "error",
      message: string | any,
      modal: boolean,
      ...items: string[]
    ): Promise<Result<string | undefined, FxError>> => {
      confirmDialogDisplayed = true;
      return ok("Ok");
    };

    const result = await solution.update(mockedCtx);
    expect(result.isOk()).equals(true);
    expect(scaffoldExecuted).equals(true);
    expect(generateResourceTemplateResult).equals(true);

    restore();
  });
});
