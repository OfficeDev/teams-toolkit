// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CancellationToken, MessageConnection } from "vscode-jsonrpc";

import { FxError, Inputs, Void, Tools, Result } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";

import { IServerConnection, Namespaces } from "./apis";
import LogProvider from "./providers/logger";
import TokenProvider from "./providers/tokenProvider";
import TelemetryReporter from "./providers/telemetry";
import UserInteraction from "./providers/userInteraction";
import { callFunc } from "./customizedFuncAdapter";
import { standardizeResult } from "./utils";

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
      this.createProjectRequest.bind(this),
      this.localDebugRequest.bind(this),
      this.provisionResourcesRequest.bind(this),
      this.deployArtifactsRequest.bind(this),
      this.buildArtifactsRequest.bind(this),
      this.publishApplicationRequest.bind(this),

      this.customizeLocalFuncRequest.bind(this),
      this.customizeValidateFuncRequest.bind(this),
      this.customizeOnSelectionChangeFuncRequest.bind(this),
    ].forEach((fn) => {
      /// fn.name = `bound ${functionName}`
      connection.onRequest(`${ServerConnection.namespace}/${fn.name.split(" ")[1]}`, fn);
    });
  }

  public listen() {
    this.connection.listen();
  }

  public async createProjectRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<string, FxError>> {
    const res = await this.core.createProject(inputs);
    return standardizeResult(res);
  }

  public async localDebugRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<Void, FxError>> {
    const res = await this.core.localDebug(inputs);
    return standardizeResult(res);
  }

  public async provisionResourcesRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<Void, FxError>> {
    const res = await this.core.provisionResources(inputs);
    return standardizeResult(res);
  }

  public async deployArtifactsRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<Void, FxError>> {
    const res = await this.core.deployArtifacts(inputs);
    return standardizeResult(res);
  }

  public async buildArtifactsRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<Void, FxError>> {
    const res = await this.core.buildArtifacts(inputs);
    return standardizeResult(res);
  }

  public async publishApplicationRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Result<Void, FxError>> {
    const res = await this.core.publishApplication(inputs);
    return standardizeResult(res);
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
}
