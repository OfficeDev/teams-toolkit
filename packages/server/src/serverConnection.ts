// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ApiOperation,
  AppPackageFolderName,
  BuildFolderName,
  CreateProjectResult,
  Func,
  FxError,
  Inputs,
  OpenAIPluginManifest,
  QTreeNode,
  Result,
  Stage,
  Tools,
  UserError,
  Void,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import {
  Correlator,
  FxCore,
  environmentManager,
  getSideloadingStatus,
  setRegion,
  listDevTunnels,
} from "@microsoft/teamsfx-core";
import { CoreQuestionNames } from "@microsoft/teamsfx-core";
import { VersionCheckRes } from "@microsoft/teamsfx-core/build/core/types";
import path from "path";
import { CancellationToken, MessageConnection } from "vscode-jsonrpc";
import { IServerConnection, Namespaces } from "./apis";
import { callFunc } from "./customizedFuncAdapter";
import LogProvider from "./providers/logger";
import TelemetryReporter from "./providers/telemetry";
import TokenProvider from "./providers/tokenProvider";
import UserInteraction from "./providers/userInteraction";
import { standardizeResult } from "./utils";
import { Tunnel } from "@microsoft/dev-tunnels-contracts";

export default class ServerConnection implements IServerConnection {
  public static readonly namespace = Namespaces.Server;
  private readonly connection: MessageConnection;
  private readonly tools: Tools;
  private readonly core: FxCore;

  constructor(connection: MessageConnection) {
    this.connection = connection;
    this.tools = {
      logProvider: new LogProvider(connection),
      tokenProvider: new TokenProvider(connection),
      telemetryReporter: new TelemetryReporter(connection),
      ui: new UserInteraction(connection),
    };
    this.core = new FxCore(this.tools);

    [
      this.getQuestionsRequest.bind(this),
      this.createProjectRequest.bind(this),
      this.localDebugRequest.bind(this),
      this.preProvisionResourcesRequest.bind(this),
      this.preCheckYmlAndEnvForVSRequest.bind(this),
      this.validateManifestForVSRequest.bind(this),
      this.provisionResourcesRequest.bind(this),
      this.deployArtifactsRequest.bind(this),
      this.buildArtifactsRequest.bind(this),
      this.publishApplicationRequest.bind(this),
      this.deployTeamsAppManifestRequest.bind(this),
      this.getSideloadingStatusRequest.bind(this),
      this.getLaunchUrlRequest.bind(this),

      this.customizeLocalFuncRequest.bind(this),
      this.customizeValidateFuncRequest.bind(this),
      this.customizeOnSelectionChangeFuncRequest.bind(this),
      this.addSsoRequest.bind(this),
      this.getProjectMigrationStatusRequest.bind(this),
      this.migrateProjectRequest.bind(this),
      this.publishInDeveloperPortalRequest.bind(this),
      this.setRegionRequest.bind(this),
      this.listDevTunnelsRequest.bind(this),
      this.copilotPluginAddAPIRequest.bind(this),
      this.loadOpenAIPluginManifestRequest.bind(this),
      this.listOpenAPISpecOperationsRequest.bind(this),
    ].forEach((fn) => {
      /// fn.name = `bound ${functionName}`
      connection.onRequest(`${ServerConnection.namespace}/${fn.name.split(" ")[1]}`, fn);
    });
  }
  public listen() {
    this.connection.listen();
  }

  public async getQuestionsRequest(
    stage: Stage,
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<QTreeNode | undefined, FxError>> {
    const corrId = inputs.correlationId ? inputs.correlationId : "";
    const res = await Correlator.runWithId(
      corrId,
      (stage, inputs) => this.core.getQuestions(stage, inputs),
      stage,
      inputs
    );
    return standardizeResult(res);
  }

  public async createProjectRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<CreateProjectResult, FxError>> {
    const corrId = inputs.correlationId ? inputs.correlationId : "";
    const res = await Correlator.runWithId(
      corrId,
      (params) => this.core.createProject(params),
      inputs
    );
    return standardizeResult(res);
  }

  public async localDebugRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<undefined, FxError>> {
    const corrId = inputs.correlationId ? inputs.correlationId : "";
    const res = await Correlator.runWithId(
      corrId,
      (params) => this.core.localDebug(params),
      inputs
    );
    return standardizeResult(res);
  }

  public async preProvisionResourcesRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<
    Result<
      {
        needAzureLogin: boolean;
        needM365Login: boolean;
        resolvedAzureSubscriptionId?: string | undefined;
        resolvedAzureResourceGroupName?: string | undefined;
      },
      FxError
    >
  > {
    const corrId = inputs.correlationId ? inputs.correlationId : "";
    const res = await Correlator.runWithId(
      corrId,
      (params) => this.core.preProvisionForVS(params),
      inputs
    );
    return standardizeResult(res);
  }

  public async preCheckYmlAndEnvForVSRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<undefined, FxError>> {
    const corrId = inputs.correlationId ? inputs.correlationId : "";
    const res = await Correlator.runWithId(
      corrId,
      (params) => this.core.preCheckYmlAndEnvForVS(params),
      inputs
    );
    return standardizeResult(res);
  }

  public async validateManifestForVSRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<undefined, FxError>> {
    const corrId = inputs.correlationId ? inputs.correlationId : "";
    const res = await Correlator.runWithId(
      corrId,
      (params) => this.core.validateManifest(params),
      inputs
    );
    return standardizeResult(res);
  }

  public async provisionResourcesRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<undefined, FxError>> {
    const corrId = inputs.correlationId ? inputs.correlationId : "";
    const res = await Correlator.runWithId(
      corrId,
      (params) => this.core.provisionResources(params),
      inputs
    );
    return standardizeResult(res);
  }

  public async deployArtifactsRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<undefined, FxError>> {
    const corrId = inputs.correlationId ? inputs.correlationId : "";
    const res = await Correlator.runWithId(
      corrId,
      (params) => this.core.deployArtifacts(params),
      inputs
    );
    return standardizeResult(res);
  }

  public async buildArtifactsRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<any, FxError>> {
    const corrId = inputs.correlationId ? inputs.correlationId : "";
    let func: Func;
    inputs[CoreQuestionNames.OutputZipPathParamName] = path.join(
      inputs.projectPath!,
      AppPackageFolderName,
      BuildFolderName,
      `appPackage.${inputs.env}.zip`
    );
    inputs[CoreQuestionNames.OutputManifestParamName] = path.join(
      inputs.projectPath!,
      AppPackageFolderName,
      BuildFolderName,
      `manifest.${inputs.env}.json`
    );
    const res = await Correlator.runWithId(
      corrId,
      (inputs) => this.core.createAppPackage(inputs),
      inputs
    );
    if (res.isOk()) {
      return ok(undefined);
    }
    return standardizeResult(res);
  }

  public async publishApplicationRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<undefined, FxError>> {
    const corrId = inputs.correlationId ? inputs.correlationId : "";
    const res = await Correlator.runWithId(
      corrId,
      (params) => this.core.publishApplication(params),
      inputs
    );
    return standardizeResult(res);
  }

  public async deployTeamsAppManifestRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<any, FxError>> {
    const corrId = inputs.correlationId ? inputs.correlationId : "";

    const res = await Correlator.runWithId(
      corrId,
      (inputs) => this.core.deployTeamsManifest(inputs),
      inputs
    );

    return standardizeResult(
      res.map((_) => {
        return Void;
      })
    );
  }

  public async getLaunchUrlRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<string, FxError>> {
    const corrId = inputs.correlationId ? inputs.correlationId : "";
    inputs[CoreQuestionNames.M365Host] = "Teams";
    const res = await Correlator.runWithId(
      corrId,
      (params) => this.core.previewWithManifest(params),
      inputs
    );
    return standardizeResult(res);
  }

  public async customizeLocalFuncRequest(
    funcId: number,
    params: Inputs,
    token: CancellationToken
  ): Promise<Result<undefined, FxError>> {
    const res = await callFunc("LocalFunc", funcId, params);
    return standardizeResult(res);
  }

  public async customizeValidateFuncRequest(
    funcId: number,
    answer: any,
    previousAnswers: Inputs | undefined,
    token: CancellationToken
  ): Promise<Result<any, FxError>> {
    const res = await callFunc("ValidateFunc", funcId, answer, previousAnswers);
    return standardizeResult(res);
  }

  public async customizeOnSelectionChangeFuncRequest(
    funcId: number,
    currentSelectedIds: Set<string>,
    previousSelectedIds: Set<string>,
    token: CancellationToken
  ): Promise<Result<any, FxError>> {
    const res = await callFunc(
      "OnSelectionChangeFunc",
      funcId,
      currentSelectedIds,
      previousSelectedIds
    );
    return standardizeResult(res);
  }

  public async getSideloadingStatusRequest(
    accountToken: {
      token: string;
    },
    token: CancellationToken
  ): Promise<Result<string, FxError>> {
    const res = await getSideloadingStatus(accountToken.token);
    return ok(String(res));
  }

  public async addSsoRequest(inputs: Inputs, token: CancellationToken) {
    const corrId = inputs.correlationId ? inputs.correlationId : "";
    const func: Func = {
      namespace: "fx-solution-azure",
      method: "addSso",
      params: {
        envName: environmentManager.getDefaultEnvName(),
      },
    };
    const res = await Correlator.runWithId(
      corrId,
      (func, inputs) => this.core.executeUserTask(func, inputs),
      func,
      inputs
    );
    return standardizeResult(res);
  }

  public async getProjectMigrationStatusRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<VersionCheckRes, FxError>> {
    const corrId = inputs.correlationId ? inputs.correlationId : "";
    const res = await Correlator.runWithId(
      corrId,
      (inputs) => this.core.projectVersionCheck(inputs),
      inputs
    );
    return standardizeResult(res);
  }

  public async migrateProjectRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<boolean, FxError>> {
    const corrId = inputs.correlationId ? inputs.correlationId : "";
    const res = await Correlator.runWithId(
      corrId,
      (inputs) => this.core.phantomMigrationV3(inputs),
      inputs
    );
    return res.isErr() ? standardizeResult(err(res.error)) : ok(res.value === Void);
  }

  public async publishInDeveloperPortalRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<undefined, FxError>> {
    const corrId = inputs.correlationId ? inputs.correlationId : "";
    const res = await Correlator.runWithId(
      corrId,
      (inputs) => this.core.publishInDeveloperPortal(inputs),
      inputs
    );
    return standardizeResult(res);
  }

  public async setRegionRequest(
    accountToken: {
      token: string;
    },
    token: CancellationToken
  ): Promise<Result<any, FxError>> {
    await setRegion(accountToken.token);
    return ok(true);
  }

  public async listDevTunnelsRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<Tunnel[], FxError>> {
    const corrId = inputs.correlationId ? inputs.correlationId : "";
    const res = await Correlator.runWithId(
      corrId,
      (params) => listDevTunnels(inputs.devTunnelToken),
      inputs
    );
    return standardizeResult(res);
  }

  public async copilotPluginAddAPIRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<undefined, FxError>> {
    const corrId = inputs.correlationId ? inputs.correlationId : "";
    const res = await Correlator.runWithId(
      corrId,
      (inputs) => this.core.copilotPluginAddAPI(inputs),
      inputs
    );
    return standardizeResult(res);
  }

  public async loadOpenAIPluginManifestRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<OpenAIPluginManifest, FxError>> {
    const corrId = inputs.correlationId ? inputs.correlationId : "";
    const res = await Correlator.runWithId(
      corrId,
      (inputs) => this.core.copilotPluginLoadOpenAIManifest(inputs),
      inputs
    );
    return standardizeResult(res);
  }

  public async listOpenAPISpecOperationsRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<ApiOperation[], FxError>> {
    const corrId = inputs.correlationId ? inputs.correlationId : "";
    const res = await Correlator.runWithId(
      corrId,
      (inputs) => this.core.copilotPluginListOperations(inputs),
      inputs
    );
    if (res.isErr()) {
      const msg = res.error.map((e) => e.content).join("\n");
      return standardizeResult(
        err(new UserError("Fx-VS", "ListOpenAPISpecOperationsError", msg, msg))
      );
    }
    return standardizeResult(ok(res.value));
  }
}
