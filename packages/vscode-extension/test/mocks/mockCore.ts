import {
  CoreCallbackEvent,
  CreateProjectResult,
  Func,
  FxError,
  Inputs,
  QTreeNode,
  Result,
  Stage,
  ok,
} from "@microsoft/teamsfx-api";
import { CoreCallbackFunc } from "@microsoft/teamsfx-core";

export class MockCore {
  constructor() {}

  public on(event: CoreCallbackEvent, callback: CoreCallbackFunc): void {
    return;
  }

  async createProject(inputs: Inputs): Promise<Result<CreateProjectResult, FxError>> {
    return ok({ projectPath: "" });
  }
  async createSampleProject(inputs: Inputs): Promise<Result<CreateProjectResult, FxError>> {
    return ok({ projectPath: "" });
  }
  async provisionResources(inputs: Inputs): Promise<Result<undefined, FxError>> {
    return ok(undefined);
  }

  async deployAadManifest(inputs: Inputs): Promise<Result<undefined, FxError>> {
    return ok(undefined);
  }

  async deployArtifacts(inputs: Inputs): Promise<Result<undefined, FxError>> {
    return ok(undefined);
  }

  async localDebug(inputs: Inputs): Promise<Result<undefined, FxError>> {
    return ok(undefined);
  }

  async publishApplication(inputs: Inputs): Promise<Result<undefined, FxError>> {
    return ok(undefined);
  }

  async executeUserTask(func: Func, inputs: Inputs): Promise<Result<any, FxError>> {
    return ok("");
  }

  async createEnv(inputs: Inputs): Promise<Result<undefined, FxError>> {
    return ok(undefined);
  }

  async getSelectedEnv(inputs: Inputs): Promise<Result<string, FxError>> {
    return ok("dev");
  }

  async getQuestions(task: Stage, inputs: Inputs): Promise<Result<QTreeNode | undefined, FxError>> {
    return ok(new QTreeNode({ type: "group" }));
  }

  async encrypt(plaintext: string, inputs: Inputs): Promise<Result<string, FxError>> {
    return ok(plaintext);
  }

  async decrypt(ciphertext: string, inputs: Inputs): Promise<Result<string, FxError>> {
    return ok(ciphertext);
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

  async publishInDeveloperPortal(inputs: Inputs): Promise<Result<undefined, FxError>> {
    return ok(undefined);
  }

  async projectVersionCheck(inputs: Inputs): Promise<Result<any, FxError>> {
    return ok("");
  }

  async phantomMigrationV3(inputs: Inputs): Promise<Result<undefined, FxError>> {
    return ok(undefined);
  }

  async addWebpart(inputs: Inputs): Promise<Result<undefined, FxError>> {
    return ok(undefined);
  }

  async validateApplication(inputs: Inputs): Promise<Result<any, FxError>> {
    return ok("");
  }

  async previewWithManifest(inputs: Inputs): Promise<Result<string, FxError>> {
    return ok("");
  }
  async buildAadManifest(inputs: Inputs): Promise<Result<undefined, FxError>> {
    return ok(undefined);
  }
  async getProjectId(projectPath: string): Promise<Result<string, FxError>> {
    return ok("");
  }
  async getTeamsAppName(projectPath: string): Promise<Result<string, FxError>> {
    return ok("");
  }
  async copilotPluginAddAPI(inputs: Inputs): Promise<Result<undefined, FxError>> {
    return ok(undefined);
  }
  async getProjectInfo(
    projectPath: string,
    env: string
  ): Promise<
    Result<
      {
        projectId: string;
        teamsAppId: string;
        teamsAppName: string;
        m365TenantId: string;
      },
      FxError
    >
  > {
    return ok({
      projectId: "",
      teamsAppId: "",
      teamsAppName: "",
      m365TenantId: "",
    });
  }
}
