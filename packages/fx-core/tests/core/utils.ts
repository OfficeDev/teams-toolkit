// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Solution, SolutionContext,FxError, Result, QTreeNode, Func, Stage, LogProvider, LogLevel, AzureAccountProvider, GraphTokenProvider, Tools, TokenProvider, AppStudioTokenProvider, TelemetryReporter, Dialog, UserInteraction, DialogMsg, IProgressHandler, SingleSelectConfig, MultiSelectConfig, InputTextConfig, SelectFileConfig, SelectFilesConfig, SelectFolderConfig, SingleSelectResult, MultiSelectResult, InputTextResult, SelectFileResult, SelectFilesResult, SelectFolderResult, RunnableTask, TaskConfig, SubscriptionInfo, Inputs, ProjectSettings, AzureSolutionSettings } from "@microsoft/teamsfx-api";
import {TokenCredential} from "@azure/core-auth";
import {TokenCredentialsBase} from "@azure/ms-rest-nodeauth";
import { SolutionLoader } from "../../src/core/loader";
import { PluginNames } from "../../src/plugins/solution/fx-solution/solution";


export class MockSolution implements Solution{
  name = "fx-solution-mock"
  create(ctx: SolutionContext) : Promise<Result<any, FxError>>{
    throw new Error();
  }
  scaffold(ctx: SolutionContext) : Promise<Result<any, FxError>>{
    throw new Error();
  }
  provision(ctx: SolutionContext) : Promise<Result<any, FxError>>{
    throw new Error();
  }
  deploy(ctx: SolutionContext) : Promise<Result<any, FxError>>{
    throw new Error();
  }
  publish(ctx: SolutionContext) : Promise<Result<any, FxError>>{
    throw new Error();
  }
  localDebug(ctx: SolutionContext) : Promise<Result<any, FxError>>{
    throw new Error();
  }
  getQuestions(task: Stage, ctx: SolutionContext) : Promise<Result<QTreeNode | undefined, FxError>>{
    throw new Error();
  }
  getQuestionsForUserTask(func: Func, ctx: SolutionContext) : Promise<Result<QTreeNode | undefined, FxError>>{
    throw new Error();
  }
  executeUserTask(func: Func, ctx: SolutionContext) : Promise<Result<any, FxError>>{
    throw new Error();
  }
}

export class MockSolutionLoader implements SolutionLoader{
  async loadSolution(inputs: Inputs): Promise<Solution> {
    return new MockSolution();
  }
  async loadGlobalSolutions(inputs: Inputs): Promise<Solution[]> {
    return [new MockSolution()];
  }
}

export function randomAppName(){
  return "mock" + new Date().getTime();
}



export class MockAzureAccountProvider implements AzureAccountProvider {
  getAccountCredentialAsync(): Promise<TokenCredentialsBase | undefined> {
      throw new Error("getAccountCredentialAsync Method not implemented.");
  }
  getIdentityCredentialAsync(): Promise<TokenCredential | undefined> {
      throw new Error("getIdentityCredentialAsync Method not implemented.");
  }
  signout(): Promise<boolean> {
      throw new Error("Method not implemented.");
  }
  setStatusChangeMap(name: string, statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>): Promise<boolean> {
      throw new Error("Method not implemented.");
  }
  removeStatusChangeMap(name: string): Promise<boolean> {
      throw new Error("Method not implemented.");
  }
  getJsonObject(showDialog?: boolean): Promise<Record<string, unknown>> {
      throw new Error("Method not implemented.");
  }
  listSubscriptions(): Promise<SubscriptionInfo[]> {
      throw new Error("Method not implemented.");
  }
  setSubscription(subscriptionId: string): Promise<void> {
      throw new Error("Method not implemented.");
  }
}

class MockGraphTokenProvider implements GraphTokenProvider {
  getAccessToken(): Promise<string | undefined> {
      const result = new Promise<string>(function (resovle, {}) {
          resovle("success");
      });
      return result;
  }
  getJsonObject(): Promise<Record<string, unknown> | undefined> {
      const result = new Promise<Record<string, unknown>>(function (resovle, {}) {
          resovle({});
      });
      return result;
  }
  signout(): Promise<boolean> {
      throw new Error("Method not implemented.");
  }
  setStatusChangeMap(name: string, statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>): Promise<boolean> {
      throw new Error("Method not implemented.");
  }
  removeStatusChangeMap(name: string): Promise<boolean> {
      throw new Error("Method not implemented.");
  }
}

class MockAppStudioTokenProvider implements AppStudioTokenProvider {

  /**
   * Get team access token
   * @param showDialog Control whether the UI layer displays pop-up windows 
   */
  getAccessToken(showDialog?: boolean): Promise<string | undefined> {
    throw new Error("Method not implemented.");
  }

  /**
   * Get app studio token JSON object
   * - tid : tenantId
   * - unique_name : user name
   * - ...
   * @param showDialog Control whether the UI layer displays pop-up windows 
   */
  getJsonObject(showDialog?: boolean): Promise<Record<string, unknown> | undefined>{
    throw new Error("Method not implemented.");
  }

  /**
   * App studio sign out
   */
  signout(): Promise<boolean>{
    throw new Error("Method not implemented.");
  }

  /**
   * Add update account info callback 
   * @param name callback name
   * @param statusChange callback method
   * @param immediateCall whether callback when register, the default value is true
   */
  setStatusChangeMap(name: string, statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>, immediateCall?: boolean): Promise<boolean>
  {
    throw new Error("Method not implemented.");
  }

  /**
   * Remove update account info callback 
   * @param name callback name
   */
  removeStatusChangeMap(name: string): Promise<boolean>{
    throw new Error("Method not implemented.");
  }
}

class MockTelemetryReporter implements TelemetryReporter {
  sendTelemetryErrorEvent({}: string, {}: {[p: string]: string;}, {}: {[p: string]: number;}, {}: string[]): void {
      // do nothing
  }

  sendTelemetryEvent({}: string, {}: {[p: string]: string;}, {}: {[p: string]: number;}): void {
      // do nothing
  }

  sendTelemetryException({}: Error, {}: {[p: string]: string;}, {}: {[p: string]: number;}): void {
      // do nothing
  }
}


class MockDialog implements Dialog{
  communicate(msg: DialogMsg) : Promise<DialogMsg>{
    throw new Error("Method not implemented.");
  }
 
  createProgressBar(title: string, totalSteps: number): IProgressHandler{
    throw new Error("Method not implemented.");
  }
}

class  MockUserInteraction implements UserInteraction {
  selectOption(config: SingleSelectConfig) : Promise<Result<SingleSelectResult,FxError>>{
    throw new Error("Method not implemented.");
  }
  selectOptions(config: MultiSelectConfig) : Promise<Result<MultiSelectResult,FxError>>{
    throw new Error("Method not implemented.");
  }
  inputText(config: InputTextConfig) : Promise<Result<InputTextResult,FxError>>{
    throw new Error("Method not implemented.");
  }
  selectFile(config: SelectFileConfig) : Promise<Result<SelectFileResult,FxError>>{
    throw new Error("Method not implemented.");
  }
  selectFiles (config: SelectFilesConfig) : Promise<Result<SelectFilesResult,FxError>>{
    throw new Error("Method not implemented.");
  }
  selectFolder(config: SelectFolderConfig) : Promise<Result<SelectFolderResult,FxError>>{
    throw new Error("Method not implemented.");
  }
  
  openUrl(link: string): Promise<Result<boolean,FxError>>{
    throw new Error("Method not implemented.");
  }
  showMessage(
    level: "info" | "warn" | "error",
    message: string,
    modal: boolean,
    ...items: string[]
  ): Promise<Result<string|undefined,FxError>>{
    throw new Error("Method not implemented.");
  }
  runWithProgress<T>(task: RunnableTask<T>, config: TaskConfig, ...args:any): Promise<Result<T,FxError>>{
    throw new Error("Method not implemented.");
  }
}

export class MockTools implements Tools
{
    logProvider = new MockLogProvider();
    tokenProvider:TokenProvider = {
      azureAccountProvider: new MockAzureAccountProvider(),
      graphTokenProvider: new MockGraphTokenProvider(),
      appStudioToken: new MockAppStudioTokenProvider()
    };
    telemetryReporter = new MockTelemetryReporter();
    dialog = new MockDialog();
    ui = new MockUserInteraction();
}
 

export class MockLogProvider implements LogProvider {
  async trace({}: string): Promise<boolean> {
      return true;
  }
  async debug({}: string): Promise<boolean> {
      return true;
  }
  async info({}: string | Array<any>): Promise<boolean> {
      return true;
  }
  async warning({}: string): Promise<boolean> {
      return true;
  }
  async error({}: string): Promise<boolean> {
      return true;
  }
  async fatal({}: string): Promise<boolean> {
      return true;
  }
  async log({}: LogLevel, {}: string): Promise<boolean> {
      return true;
  }
}

export function MockProjectSettings(appName: string):ProjectSettings{
  return {
    appName: appName,
    currentEnv: "default",
    solutionSettings:  {
      name: PluginNames.SOLUTION,
      version: "1.0.0",
      hostType: "Azure",
      capabilities: ["Tab"],
      azureResources: [],
      activeResourcePlugins: [PluginNames.FE, PluginNames.LDEBUG, PluginNames.AAD, PluginNames.SA]
    } as AzureSolutionSettings
  };
}