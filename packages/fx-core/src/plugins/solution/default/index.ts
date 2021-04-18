import { FxError, Inputs, QTreeNode, ResourceTemplates, Result, SolutionAllContext, SolutionContext, SolutionEnvContext, SolutionPlugin, Task, VariableDict, Void } from "fx-api";


export class DefaultSolution implements  SolutionPlugin{
    name = "fx-solution-default";
    displayName = "Default Solution";
    async scaffold (ctx: SolutionContext, inputs: Inputs) : Promise<Result<{provisionTemplates:ResourceTemplates, deployTemplates: ResourceTemplates}, FxError>>
    {
        throw new Error();
    }
    async build(ctx: SolutionContext, inputs: Inputs) : Promise<Result<Void, FxError>>{
        throw new Error();
    }
    async provision(ctx: SolutionEnvContext, inputs: Inputs) : Promise<Result<VariableDict, FxError>>{
        throw new Error();
    }
    async deploy(ctx: SolutionEnvContext, inputs: Inputs) : Promise<Result<VariableDict, FxError>>{
        throw new Error();
    }
    async publish (ctx: SolutionEnvContext, inputs: Inputs) : Promise<Result<Void, FxError>>{
        throw new Error();
    }
    async getQuestionsForLifecycleTask(ctx: SolutionAllContext, task: Task, inputs: Inputs) : Promise<Result<QTreeNode|undefined, FxError>>{
        throw new Error();
    }
    async getQuestionsForUserTask(ctx: SolutionAllContext, router: FunctionRouter, inputs: Inputs) : Promise<Result<QTreeNode|undefined, FxError>>{
        throw new Error();
    }
    async executeUserTask(ctx: SolutionAllContext, func:Func, inputs: Inputs) : Promise<Result<unknown, FxError>>{
        throw new Error();
    }
    async executeFuncQuestion(ctx: SolutionAllContext, func:Func, previousAnswers: Inputs) :Promise<Result<unknown, FxError>>{
        throw new Error();
    }
}