import { Func, FunctionRouter, FxError, Inputs, ok, QTreeNode, ResourceTemplates, Result, SolutionAllContext, SolutionContext, SolutionEnvContext, SolutionPlugin, Task, VariableDict, Void } from "fx-api";


export class DefaultSolution implements  SolutionPlugin{
    name = "fx-solution-default";
    displayName = "Default Solution";
    async scaffold (ctx: SolutionContext, inputs: Inputs) : Promise<Result<{provisionTemplates:ResourceTemplates, deployTemplates: ResourceTemplates}, FxError>>
    {
        ctx.solutionSetting.resources = ["fx-resource-frontend"];
        return ok({
            provisionTemplates:{
                "fx-resource-frontend":{
                    endpoint: "{{endpoint}}"
                }
            },
            deployTemplates:{
                "fx-resource-frontend":{
                    storagename: "{{storagename}}"
                }
            }
        });
    }
    async build(ctx: SolutionContext, inputs: Inputs) : Promise<Result<Void, FxError>>{
        ctx.solutionState.build = true;
        return ok(Void);
    }
    async provision(ctx: SolutionEnvContext, inputs: Inputs) : Promise<Result<VariableDict, FxError & {result:VariableDict}>>{
        return ok({
            endpoint:"http://oowww.com",
            provision:true
        });
    }
    async deploy(ctx: SolutionEnvContext, inputs: Inputs) : Promise<Result<VariableDict, FxError & {result:VariableDict}>>{
        return ok({
            storagename:"mystorage",
            deploy:true
        });
    }
    async publish (ctx: SolutionEnvContext, inputs: Inputs) : Promise<Result<Void, FxError>>{
        ctx.solutionState.publish = true;
        return ok(Void);
    }
    async getQuestionsForLifecycleTask(ctx: SolutionAllContext, task: Task, inputs: Inputs) : Promise<Result<QTreeNode|undefined, FxError>>{
        return ok(undefined);
    }
    async getQuestionsForUserTask(ctx: SolutionAllContext, router: FunctionRouter, inputs: Inputs) : Promise<Result<QTreeNode|undefined, FxError>>{
        return ok(undefined);
    }
    async executeUserTask(ctx: SolutionAllContext, func:Func, inputs: Inputs) : Promise<Result<unknown, FxError>>{
        return ok(Void);
    }
    async executeFuncQuestion(ctx: SolutionAllContext, func:Func, inputs: Inputs) :Promise<Result<unknown, FxError>>{
        return ok(Void);
    }
}