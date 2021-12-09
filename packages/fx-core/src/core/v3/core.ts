import { hooks } from "@feathersjs/hooks";
import {
  err,
  Func,
  FunctionRouter,
  FxError,
  Inputs,
  NotImplementedError,
  QTreeNode,
  Result,
  Stage,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import { CoreHookContext } from "../..";
import {
  ContextInjectorMW,
  ErrorHandlerMW,
  ProjectSettingsWriterMW,
  QuestionModelMW,
} from "../middleware";
import { addModule } from "./addModule";
import { init } from "./init";
import { QuestionModelMW_V3 } from "./mw/questionModel";

export class FxCoreV3 implements v3.ICore {
  @hooks([ErrorHandlerMW, QuestionModelMW_V3, ContextInjectorMW, ProjectSettingsWriterMW])
  async init(
    inputs: v2.InputsWithProjectPath & { solution?: string },
    ctx?: CoreHookContext
  ): Promise<Result<Void, FxError>> {
    return init(inputs, ctx);
  }
  addModule = addModule;
  async scaffold(inputs: v2.InputsWithProjectPath): Promise<Result<Void, FxError>> {
    return err(new NotImplementedError("CoreV3", "scaffold"));
  }
  async addResource(inputs: v2.InputsWithProjectPath): Promise<Result<Void, FxError>> {
    return err(new NotImplementedError("CoreV3", "addResource"));
  }
  async provisionResources(inputs: v2.InputsWithProjectPath): Promise<Result<Void, FxError>> {
    return err(new NotImplementedError("CoreV3", "provisionResources"));
  }
  async deployArtifacts(inputs: v2.InputsWithProjectPath): Promise<Result<Void, FxError>> {
    return err(new NotImplementedError("CoreV3", "deployArtifacts"));
  }
  async publishApplication(inputs: v2.InputsWithProjectPath): Promise<Result<Void, FxError>> {
    return err(new NotImplementedError("CoreV3", "publishApplication"));
  }
  async executeUserTask(func: Func, inputs: Inputs): Promise<Result<unknown, FxError>> {
    return err(new NotImplementedError("CoreV3", "executeUserTask"));
  }
  async getQuestions(task: Stage, inputs: Inputs): Promise<Result<QTreeNode | undefined, FxError>> {
    return err(new NotImplementedError("CoreV3", "getQuestions"));
  }
  async getQuestionsForUserTask(
    router: FunctionRouter,
    inputs: Inputs
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return err(new NotImplementedError("CoreV3", "getQuestionsForUserTask"));
  }
}
