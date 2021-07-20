import {
  Core,
  Inputs,
  Result,
  FxError,
  ok,
  QTreeNode,
  FunctionRouter,
  Stage,
  Func,
} from "@microsoft/teamsfx-api";

export class MockCore implements Core {
  constructor() {}

  async createProject(inputs: Inputs): Promise<Result<string, FxError>> {
    return ok("");
  }

  async provisionResources(inputs: Inputs): Promise<Result<string, FxError>> {
    return ok("");
  }

  async buildArtifacts(inputs: Inputs): Promise<Result<string, FxError>> {
    return ok("");
  }

  async deployArtifacts(inputs: Inputs): Promise<Result<string, FxError>> {
    return ok("");
  }

  async localDebug(inputs: Inputs): Promise<Result<string, FxError>> {
    return ok("");
  }

  async publishApplication(inputs: Inputs): Promise<Result<string, FxError>> {
    return ok("");
  }

  async executeUserTask(func: Func, inputs: Inputs): Promise<Result<string, FxError>> {
    return ok("");
  }

  async createEnv(inputs: Inputs): Promise<Result<string, FxError>> {
    return ok("");
  }

  async removeEnv(inputs: Inputs): Promise<Result<string, FxError>> {
    return ok("");
  }

  async switchEnv(inputs: Inputs): Promise<Result<string, FxError>> {
    return ok("");
  }

  async getQuestions(task: Stage, inputs: Inputs): Promise<Result<QTreeNode | undefined, FxError>> {
    return ok(new QTreeNode({ type: "group" }));
  }

  async getQuestionsForUserTask(
    router: FunctionRouter,
    inputs: Inputs
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    return ok(new QTreeNode({ type: "group" }));
  }
}
