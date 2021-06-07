// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as fs from "fs-extra";
import {
  Core,
  DialogMsg,
  DialogType,
  err,
  Func,
  ok,
  Platform,
  QTreeNode,
  QuestionType,
  Result,
  SolutionContext,
  Stage,
  SingleSelectQuestion,
  FxError,
  ConfigFolderName,
  Inputs,
  Tools,
  Void,
  FunctionRouter,
  OptionItem,
  Solution,
  ProjectConfig,
  ProjectSettings,
  PluginConfig,
} from "@microsoft/teamsfx-api";
import * as path from "path";
import {
  fetchCodeZip,
  isValidProject,
  saveFilesRecursively,
} from "../common/tools";
import {
  CoreQuestionNames,
  ProjectNamePattern,
  QuestionAppName,
  QuestionRootFolder,
  QuestionSelectSolution,
  SampleSelect,
  ScratchOptionNo,
  ScratchOptionYes,
  getCreateNewOrFromSampleQuestion,
} from "./question";
import * as jsonschema from "jsonschema";
import AdmZip from "adm-zip";
export * from "./error";
import { HookContext, hooks } from "@feathersjs/hooks";
import { ErrorHandlerMW } from "./middleware/errorHandler";
import { QuestionModelMW } from "./middleware/questionModel";
import { ConfigWriterMW } from "./middleware/configWriter";
import { ContextLoaderMW, newSolutionContext } from "./middleware/contextLoader";
import { ConcurrentLockerMW } from "./middleware/concurrentLocker";
import { FetchSampleError, FunctionRouterError, InvalidInputError, ProjectFolderExistError, TaskNotSupportError, WriteFileError } from "./error";
import { loadGlobalSolutions, loadSolution, SolutionLoaderMW } from "./middleware/solutionLoader";
import { ContextInjecterMW } from "./middleware/contextInjecter";
 
 
export class FxCore implements Core {
  
  tools: Tools;

  constructor(tools: Tools) { 
    this.tools = tools;
  }
  
  @hooks([ErrorHandlerMW, QuestionModelMW, ContextInjecterMW, ConfigWriterMW])
  async createProject(inputs: Inputs, ctx?: HookContext): Promise<Result<string, FxError>> {
    const folder = inputs[QuestionRootFolder.name] as string;
    const scratch = inputs[CoreQuestionNames.CreateFromScratch] as string;
    if (scratch === ScratchOptionNo.id) { // create from sample
      const samples = inputs[CoreQuestionNames.Samples] as OptionItem;
      if (samples && samples.data && folder) {
        const url = samples.data as string;
        const sampleId = samples.id;
        const sampleAppPath = path.resolve(folder, sampleId);
        if (
          (await fs.pathExists(sampleAppPath)) &&
          (await fs.readdir(sampleAppPath)).length > 0
        ) {
          return err(ProjectFolderExistError(sampleAppPath));
        }
        const progress = this.tools.dialog.createProgressBar("Fetch sample app", 2);
        progress.start();
        try {
          progress.next(`Downloading from '${url}'`);
          const fetchRes = await fetchCodeZip(url);
          progress.next("Unzipping the sample package");
          if (fetchRes !== undefined) {
            await saveFilesRecursively(new AdmZip(fetchRes.data), sampleId, folder);
            if (inputs.platform === Platform.VSCode) {
              this.tools.dialog?.communicate(
                new DialogMsg(DialogType.Ask, {
                  type: QuestionType.UpdateGlobalState,
                  description: "openSampleReadme",
                })
              );
            }
            return ok(path.join(folder, sampleId));
          } else { 
            return err(FetchSampleError());
          }
        } finally {
          progress.end();
        } 
      }
      return err(InvalidInputError(`invalid answer for '${CoreQuestionNames.Samples}'`, inputs));
    }

    // create from 
    const appName = inputs[QuestionAppName.name] as string;
    if (undefined === appName)
      return err( InvalidInputError(`App Name is empty`, inputs));

    const validateResult = jsonschema.validate(appName, {
      pattern: ProjectNamePattern,
    });
    if (validateResult.errors && validateResult.errors.length > 0) {
      return err(InvalidInputError(`${validateResult.errors[0].message}`, inputs));
    }

    const projectPath = path.join(folder, appName);
    const folderExist = await fs.pathExists(projectPath);
    if (folderExist) {
      return err(ProjectFolderExistError(projectPath));
    }

    inputs.projectPath = projectPath;
    const solution = await loadSolution(inputs);
    const projectSettings:ProjectSettings = {
      appName: appName,
      currentEnv: "default",
      solutionSettings:{
        name: solution.name,
        version:"1.0.0"
      }
    };
    
    const solutionContext:SolutionContext = {
      projectSettings: projectSettings,
      config: new Map<string, PluginConfig>(),
      root: projectPath,
      ... this.tools,
      ... this.tools.tokenProvider,
      answers: inputs
    };

    await fs.ensureDir(projectPath);
    await fs.ensureDir(path.join(projectPath,`.${ConfigFolderName}`));

    
    const createResult = await this.createBasicFolderStructure(inputs);
    if (createResult.isErr()) {
      return err(createResult.error);
    } 

    const createRes = await solution.create(solutionContext);
    if (createRes.isErr()) {
      return createRes;
    } 

    const scaffoldRes = await solution.scaffold(solutionContext);
    if (scaffoldRes.isErr()) {
      return scaffoldRes;
    } 
  
    if (inputs.platform === Platform.VSCode) {
      await this.tools.dialog?.communicate(
        new DialogMsg(DialogType.Ask, {
          type: QuestionType.UpdateGlobalState,
          description: "openReadme",
        })
      );
    }

    ctx!.solution = solution;
    ctx!.solutionContext = solutionContext;

    return ok(projectPath);
  }

  @hooks([ErrorHandlerMW, ConcurrentLockerMW, ContextLoaderMW, SolutionLoaderMW, QuestionModelMW, ContextInjecterMW, ConfigWriterMW])
  async provisionResources(inputs: Inputs, ctx?: HookContext) : Promise<Result<Void, FxError>>{
    return await this._provisionResources(ctx!.solutionContext, ctx!.solution, inputs);
  }

  @hooks([ErrorHandlerMW, ConcurrentLockerMW, ContextLoaderMW, SolutionLoaderMW, QuestionModelMW, ContextInjecterMW, ConfigWriterMW])
  async deployArtifacts(inputs: Inputs, ctx?: HookContext) : Promise<Result<Void, FxError>>{
    return await this._deployArtifacts(ctx!.solutionContext, ctx!.solution, inputs);
  }
  
  @hooks([ErrorHandlerMW, ConcurrentLockerMW, ContextLoaderMW, SolutionLoaderMW, QuestionModelMW, ContextInjecterMW, ConfigWriterMW])
  async localDebug(inputs: Inputs, ctx?: HookContext) : Promise<Result<Void, FxError>>{
    return await this._localDebug(ctx!.solutionContext, ctx!.solution, inputs);
  }

  @hooks([ErrorHandlerMW, ConcurrentLockerMW, ContextLoaderMW, SolutionLoaderMW, QuestionModelMW, ContextInjecterMW, ConfigWriterMW])
  async publishApplication(inputs: Inputs, ctx?: HookContext) : Promise<Result<Void, FxError>>{
    return await this._publishApplication(ctx!.solutionContext, ctx!.solution, inputs);
  }

  @hooks([ErrorHandlerMW, ConcurrentLockerMW, ContextLoaderMW, SolutionLoaderMW, QuestionModelMW, ContextInjecterMW, ConfigWriterMW])
  async executeUserTask(func: Func, inputs: Inputs, ctx?: HookContext) :  Promise<Result<unknown, FxError>>{
    if(!ctx!.solutionContext)ctx!.solutionContext = await newSolutionContext(this.tools, inputs);
    return await this._executeUserTask(ctx!.solutionContext, ctx!.solution, func, inputs);
  }
 
  @hooks([ErrorHandlerMW, ContextLoaderMW, SolutionLoaderMW, ContextInjecterMW])
  async getQuestions(task: Stage, inputs: Inputs, ctx?: HookContext) : Promise<Result<QTreeNode | undefined, FxError>> {
    if(task ===  Stage.create) {
      delete inputs.projectPath;
      return await this._getQuestionsForCreateProject(inputs);
    }
    else{
      const solutionContext = ctx!.solutioContext === undefined ? await newSolutionContext(this.tools, inputs) : ctx!.solutioContext;
      const solution = ctx!.solution === undefined ? await loadSolution(inputs) : ctx!.solution;
      return await this._getQuestions(solutionContext, solution, task, inputs);
    }  
  }
 
  @hooks([ErrorHandlerMW, ContextLoaderMW, SolutionLoaderMW, ContextInjecterMW])
  async getQuestionsForUserTask(func: FunctionRouter, inputs: Inputs, ctx?: HookContext) : Promise<Result<QTreeNode | undefined, FxError>>{
    const solutionContext = ctx!.solutioContext === undefined ? await newSolutionContext(this.tools, inputs) : ctx!.solutioContext;
    const solution = ctx!.solution === undefined ? await loadSolution(inputs) : ctx!.solution;
    return await this._getQuestionsForUserTask(solutionContext, solution, func, inputs);
  }

   
  @hooks([ErrorHandlerMW, ContextLoaderMW, ContextInjecterMW])
  async getProjectConfig(inputs: Inputs, ctx?: HookContext): Promise<Result<ProjectConfig|undefined, FxError>>{
    return ok({
      settings: ctx!.solutionContext!.projectSettings,
      config: ctx!.solutionContext!.config
    });
  }

  @hooks([ErrorHandlerMW, ContextLoaderMW, ContextInjecterMW, ConfigWriterMW])
  async setSubscriptionInfo(inputs: Inputs, ctx?: HookContext) :Promise<Result<Void, FxError>>{
    const solutionContext = ctx!.solutionContext as SolutionContext;
    if(inputs.tenantId)
      solutionContext.config.get("solution")?.set("tenantId",inputs.tenantId);
    else 
      solutionContext.config.get("solution")?.delete("tenantId");
    if(inputs.subscriptionId)
      solutionContext.config.get("solution")?.set("subscriptionId",inputs.subscriptionId);
    else 
      solutionContext.config.get("solution")?.delete("subscriptionId");
    return ok(Void);
  }
 
  async _provisionResources(ctx: SolutionContext, solution:Solution, inputs: Inputs) : Promise<Result<Void, FxError>>{
    return await solution.provision(ctx);
  }

  async _deployArtifacts(ctx: SolutionContext, solution:Solution, inputs: Inputs) : Promise<Result<Void, FxError>>{
    return await solution.deploy(ctx);
  }

  async _localDebug(ctx: SolutionContext, solution:Solution, inputs: Inputs) : Promise<Result<Void, FxError>>{
    return await solution.localDebug(ctx);
  }

  async _publishApplication(ctx: SolutionContext, solution:Solution, inputs: Inputs) : Promise<Result<Void, FxError>>{
    return await solution.publish(ctx);
  }

  async _executeUserTask(ctx: SolutionContext, solution:Solution, func: Func, inputs: Inputs) :  Promise<Result<unknown, FxError>>{
    const namespace = func.namespace;
    const array = namespace ? namespace.split("/") : [];
    if ("" !== namespace && array.length > 0 && solution.executeUserTask) {
      return await solution.executeUserTask(func, ctx);
    }
    return err(FunctionRouterError(func));
  }

    
  async _getQuestionsForUserTask(ctx:SolutionContext, solution:Solution, func: FunctionRouter, inputs: Inputs) : Promise<Result<QTreeNode | undefined, FxError>>{
    const namespace = func.namespace;
    const array = namespace ? namespace.split("/") : [];
    if (namespace && "" !== namespace && array.length > 0 && solution.getQuestionsForUserTask) {
      ctx!.answers = inputs;
      const res = await solution.getQuestionsForUserTask!(func, ctx!);
      if (res.isOk()) {
        if (res.value) {
          const node = res.value.trim();
          return ok(node);
        }
      }
      return res;
    }
    return err(FunctionRouterError(func));
  }
  
  async _getQuestionsForCreateProject(inputs: Inputs): Promise<Result<QTreeNode | undefined, FxError>> { 
    const node = new QTreeNode(getCreateNewOrFromSampleQuestion(inputs.platform));
    // create new
    const createNew = new QTreeNode({ type: "group" });
    node.addChild(createNew);
    createNew.condition = { equals: ScratchOptionYes.id };
    const globalSolutions:Solution[] = await loadGlobalSolutions(inputs);
    const solutionNames: string[] = globalSolutions.map(s=>s.name);
    const selectSolution: SingleSelectQuestion = QuestionSelectSolution;
    selectSolution.staticOptions = solutionNames;
    const solutionSelectNode = new QTreeNode(selectSolution);
    createNew.addChild(solutionSelectNode);
    const solutionContext = await newSolutionContext(this.tools, inputs);
    for (const v of globalSolutions) {
      if (v.getQuestions) {
        const res = await v.getQuestions(Stage.create, solutionContext);
        if (res.isErr()) return res;
        if (res.value) {
          const solutionNode = res.value as QTreeNode;
          solutionNode.condition = { equals: v.name };
          if (solutionNode.data) solutionSelectNode.addChild(solutionNode);
        }
      }
    }
    createNew.addChild(new QTreeNode(QuestionRootFolder));
    createNew.addChild(new QTreeNode(QuestionAppName));
    
    // create from sample
    const sampleNode = new QTreeNode(SampleSelect);
    node.addChild(sampleNode);
    sampleNode.condition = { equals: ScratchOptionNo.id };
    sampleNode.addChild(new QTreeNode(QuestionRootFolder));
    
    return ok(node.trim());
  }
 
  async _getQuestions(ctx:SolutionContext, solution:Solution, stage: Stage, inputs: Inputs): Promise<Result<QTreeNode | undefined, FxError>> {
    const node = new QTreeNode({ type: "group" });
    if (stage !== Stage.create) {
      const res = await solution.getQuestions(stage, ctx);
      if (res.isErr()) return res;
      if (res.value) {
        const child = res.value as QTreeNode;
        if (child.data) node.addChild(child);
      }
    }
    return ok(node.trim());
  }

  async createBasicFolderStructure(inputs: Inputs): Promise<Result<null, FxError>> {
    try {
      const appName = inputs[QuestionAppName.name] as string;
      await fs.writeFile(
        path.join(inputs.projectPath!,`package.json`),
        JSON.stringify(
          {
            name: appName,
            version: "0.0.1",
            description: "",
            author: "",
            scripts: {
              test: "echo \"Error: no test specified\" && exit 1",
            },
            license: "MIT",
          },
          null,
          4
        )
      );
      await fs.writeFile(
        path.join(inputs.projectPath!,`.gitignore`),
        `node_modules\n/.${ConfigFolderName}/*.env\n/.${ConfigFolderName}/*.userdata\n.DS_Store`
      );
    } catch (e) {
      return err(WriteFileError(e));
    }
    return ok(null);
  }

  async buildArtifacts(inputs: Inputs) : Promise<Result<Void, FxError>>{
      throw TaskNotSupportError(Stage.build);
  }
  async createEnv (inputs: Inputs) : Promise<Result<Void, FxError>>{
    throw TaskNotSupportError(Stage.createEnv);
  }
  async removeEnv (inputs: Inputs) : Promise<Result<Void, FxError>>{
    throw TaskNotSupportError(Stage.removeEnv);
  }
  async switchEnv (inputs: Inputs) : Promise<Result<Void, FxError>>{
    throw TaskNotSupportError(Stage.switchEnv);
  }
} 




