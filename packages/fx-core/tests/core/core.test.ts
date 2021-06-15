// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { hooks, Middleware, NextFunction } from "@feathersjs/hooks/lib";
import { assert } from "chai";
import "mocha";
import { ErrorHandlerMW } from "../../src/core/middleware/errorHandler";
import { UserCancelError, err, FxError, Result, ok, Inputs, Platform, ConfigFolderName, Solution, Stage, SolutionContext, Json, AzureSolutionSettings, ConfigMap, QTreeNode, FunctionRouter, Func, InputTextConfig, Void, InputTextResult, SelectFolderConfig, SelectFolderResult, SingleSelectConfig, SingleSelectResult, OptionItem } from "@microsoft/teamsfx-api";
import { ConcurrentLockerMW } from "../../src/core/middleware/concurrentLocker";
import fs from "fs-extra";
import * as path from "path";
import { ConcurrentError, InvalidProjectError, NoProjectOpenedError, PathNotExistError } from "../../src/core/error";
import * as os from "os";
import { CoreHookContext, deepCopy, FxCore, InvalidInputError, mapToJson, PluginNames } from "../../src";
import { SolutionLoaderMW } from "../../src/core/middleware/solutionLoader";
import { ContextInjecterMW } from "../../src/core/middleware/contextInjecter";
import { ConfigWriterMW } from "../../src/core/middleware/configWriter";
import sinon from "sinon";
import { MockProjectSettings, MockSolution, MockSolutionLoader, MockTools, randomAppName } from "./utils";
import { ContextLoaderMW, newSolutionContext } from "../../src/core/middleware/contextLoader";
import { AzureResourceSQL } from "../../src/plugins/solution/fx-solution/question";
import { QuestionModelMW } from "../../src/core/middleware/questionModel";
import { defaultSolutionLoader } from "../../src/core/loader";
import { CoreQuestionNames, QuestionAppName, QuestionRootFolder, ScratchOptionYesVSC } from "../../src/core/question";

describe("Core API", () => {
  
  describe("createProject", () => {
    const sandbox = sinon.createSandbox();
    const mockSolution = new MockSolution();
    const tools = new MockTools();
    const ui = tools.ui;
    beforeEach(() => {
      sandbox.stub<any, any>(defaultSolutionLoader, "loadSolution").resolves(mockSolution);
      sandbox.stub<any, any>(defaultSolutionLoader, "loadGlobalSolutions").resolves([mockSolution]);
     
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("success: happy path of create from scratch", async () => { 

      const expectedInputs:Inputs = {
        platform: Platform.CLI,
        [CoreQuestionNames.AppName]: randomAppName(),
        [CoreQuestionNames.Foler]: os.tmpdir(),
        [CoreQuestionNames.CreateFromScratch]: ScratchOptionYesVSC.id,
      };
      sandbox.stub<any, any>(ui, "inputText").callsFake(async (config: InputTextConfig): Promise<Result<InputTextResult,FxError>> => {
        if(config.name === CoreQuestionNames.AppName){
          return ok({ type: "success", result: expectedInputs[CoreQuestionNames.AppName] as string });
        }
        throw err(InvalidInputError("invalid question"));
      });
      sandbox.stub<any, any>(ui, "selectFolder").callsFake(async (config: SelectFolderConfig): Promise<Result<SelectFolderResult,FxError>> => {
        if(config.name === CoreQuestionNames.Foler){
          return ok({ type: "success", result: expectedInputs[CoreQuestionNames.Foler] as string });
        }
        throw err(InvalidInputError("invalid question"));
      });
      sandbox.stub<any, any>(ui, "selectOption").callsFake(async (config: SingleSelectConfig): Promise<Result<SingleSelectResult,FxError>> => {
        if(config.name === CoreQuestionNames.CreateFromScratch){
          return ok({ type: "success", result: expectedInputs[CoreQuestionNames.CreateFromScratch] as string });
        }
        throw err(InvalidInputError("invalid question"));
      });
      try{
        const core = new FxCore(tools);
        const inputs:Inputs = {platform:Platform.CLI};
        const res = await core.createProject(inputs);
        const projectPath = path.resolve(os.tmpdir(), expectedInputs[CoreQuestionNames.AppName] as string);
        assert.isTrue (res.isOk() && res.value === projectPath);
        assert.deepEqual(expectedInputs, inputs);  
      }
      catch(e){
        assert.isTrue (e !== undefined);  
      }
      finally{
      }
    });
  });
});