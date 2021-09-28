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
  Void,
  CoreCallbackEvent,
  CoreCallbackFunc,
} from "@microsoft/teamsfx-api";

export class MockCore implements Core {
  constructor() {}

  public on(event: CoreCallbackEvent, callback: CoreCallbackFunc): void {
    return;
  }

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

  async activateEnv(inputs: Inputs): Promise<Result<Void, FxError>> {
    return ok(Void);
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

  async encrypt(plaintext: string, inputs: Inputs): Promise<Result<string, FxError>> {
    return ok(plaintext);
  }

  async decrypt(ciphertext: string, inputs: Inputs): Promise<Result<string, FxError>> {
    return ok(ciphertext);
  }

  async migrateV1Project(systemInputs: Inputs): Promise<Result<string, FxError>> {
    return ok("");
  }

  async grantPermission(inputs: Inputs): Promise<Result<any, FxError>> {
    return ok("");
  }

  async checkPermission(inputs: Inputs): Promise<Result<any, FxError>> {
    return ok("");
  }

  async listCollaborator(inputs: Inputs): Promise<Result<any, FxError>> {
    return ok("");
  }

  async listAllCollaborators(inputs: Inputs): Promise<Result<any, FxError>> {
    return ok("");
  }
}
