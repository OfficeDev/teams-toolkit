// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CancellationToken, MessageConnection } from "vscode-jsonrpc";
import {
  FxError,
  Inputs,
  Void,
  Tools,
  Result,
  Func,
  ok,
  Stage,
  QTreeNode,
  BuildFolderName,
  AppPackageFolderName,
  err,
} from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";
import { Correlator } from "@microsoft/teamsfx-core/build/common/correlator";
import { getSideloadingStatus, isV3Enabled } from "@microsoft/teamsfx-core/build/common/tools";
import { getProjectComponents as coreGetProjectComponents } from "@microsoft/teamsfx-core/build/common/local";
import { IServerConnection, Namespaces } from "./apis";
import LogProvider from "./providers/logger";
import TokenProvider from "./providers/tokenProvider";
import TelemetryReporter from "./providers/telemetry";
import UserInteraction from "./providers/userInteraction";
import { callFunc } from "./customizedFuncAdapter";
import { standardizeResult } from "./utils";
import { environmentManager } from "@microsoft/teamsfx-core/build/core/environment";
import { VersionCheckRes } from "@microsoft/teamsfx-core/build/core/types";

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
      this.provisionResourcesRequest.bind(this),
      this.deployArtifactsRequest.bind(this),
      this.buildArtifactsRequest.bind(this),
      this.publishApplicationRequest.bind(this),
      this.deployTeamsAppManifestRequest.bind(this),
      this.getSideloadingStatusRequest.bind(this),

      this.customizeLocalFuncRequest.bind(this),
      this.customizeValidateFuncRequest.bind(this),
      this.customizeOnSelectionChangeFuncRequest.bind(this),
      this.addSsoRequest.bind(this),
      this.getProjectComponents.bind(this),
      this.getProjectMigrationStatusRequest.bind(this),
      this.migrateProjectRequest.bind(this),
      this.publishInDeveloperPortalRequest.bind(this),
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
  ): Promise<Result<string, FxError>> {
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
  ): Promise<Result<Void, FxError>> {
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

  public async provisionResourcesRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<Void, FxError>> {
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
  ): Promise<Result<Void, FxError>> {
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
    if (isV3Enabled()) {
      const manifestTemplatePath = `${inputs.projectPath}/${AppPackageFolderName}/manifest.json`;
      func = {
        namespace: "fx-solution-azure",
        method: "buildPackage",
        params: {
          manifestTemplatePath: manifestTemplatePath,
          outputZipPath: `${inputs.projectPath}/${BuildFolderName}/${AppPackageFolderName}/appPackage.${inputs.env}.zip`,
          outputJsonPath: `${inputs.projectPath}/${BuildFolderName}/${AppPackageFolderName}/manifest.${inputs.env}.json`,
          env: inputs.env,
        },
      };
    } else {
      func = {
        namespace: "fx-solution-azure",
        method: "buildPackage",
        params: {
          type: inputs.env == environmentManager.getLocalEnvName() ? "localDebug" : "remote",
          env: inputs.env,
        },
      };
    }

    const res = await Correlator.runWithId(
      corrId,
      (func, inputs) => this.core.executeUserTask(func, inputs),
      func,
      inputs
    );
    if (isV3Enabled() && res.isOk()) {
      return ok(undefined);
    } else {
      return standardizeResult(res);
    }
  }

  public async publishApplicationRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<Void, FxError>> {
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

    let res;
    if (isV3Enabled()) {
      res = await Correlator.runWithId(
        corrId,
        (inputs) => this.core.deployTeamsManifest(inputs),
        inputs
      );
    } else {
      const func: Func = {
        namespace: "fx-solution-azure/fx-resource-appstudio",
        method: "updateManifest",
        params: {
          envName: environmentManager.getDefaultEnvName(),
        },
      };
      res = await Correlator.runWithId(
        corrId,
        (func, inputs) => this.core.executeUserTask(func, inputs),
        func,
        inputs
      );
    }

    return standardizeResult(
      res.map((_) => {
        return Void;
      })
    );
  }

  public async customizeLocalFuncRequest(
    funcId: number,
    params: Inputs,
    token: CancellationToken
  ): Promise<Result<Void, FxError>> {
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

  public async getProjectComponents(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<string | undefined, FxError>> {
    if (!inputs.projectPath) {
      return ok(undefined);
    }
    return ok(await coreGetProjectComponents(inputs.projectPath));
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
    console.log(res);
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
  ): Promise<Result<Void, FxError>> {
    const corrId = inputs.correlationId ? inputs.correlationId : "";
    const res = await Correlator.runWithId(
      corrId,
      (inputs) => this.core.publishInDeveloperPortal(inputs),
      inputs
    );
    return standardizeResult(res);
  }
}
