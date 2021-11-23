// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, Void } from "@microsoft/teamsfx-api";
import { FxCore } from "@microsoft/teamsfx-core";
import { CancellationToken, MessageConnection, ResponseError } from "vscode-jsonrpc";
import { IServerConnection } from "./APIs";
import { Namespaces } from "./namespace";
import { callFunc } from "./questionAdapter";
import { RemoteTools } from "./tools";
import { convertToHandlerResult } from "./utils";

export default class ServerConnection implements IServerConnection {
  public static readonly namespace = Namespaces.Server;
  private readonly connection: MessageConnection;
  private readonly tools: RemoteTools;
  private readonly core: FxCore;

  constructor(connection: MessageConnection) {
    this.connection = connection;
    this.tools = new RemoteTools(connection);
    this.core = new FxCore(this.tools);
    [
      this.createProjectRequest,
      this.localDebugRequest,
      this.provisionResourcesRequest,
      this.deployArtifactsRequest,
      this.buildArtifactsRequest,
      this.publishApplicationRequest,

      this.customizeLocalFuncRequest,
      this.customizeValidateFuncRequest,
      this.customizeOnSelectionChangeFuncRequest,
    ].forEach((fn) => {
      connection.onRequest(`${ServerConnection.namespace}/${fn.name}`, fn.bind(this));
    });
  }

  public listen() {
    this.connection.listen();
  }

  public async createProjectRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<string | ResponseError<FxError>> {
    const res = await this.core.createProject(inputs);
    return convertToHandlerResult(res);
  }

  public async localDebugRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Void | ResponseError<FxError>> {
    const res = await this.core.localDebug(inputs);
    return convertToHandlerResult(res);
  }

  public async provisionResourcesRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Void | ResponseError<FxError>> {
    const res = await this.core.provisionResources(inputs);
    return convertToHandlerResult(res);
  }

  public async deployArtifactsRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Void | ResponseError<FxError>> {
    const res = await this.core.deployArtifacts(inputs);
    return convertToHandlerResult(res);
  }

  public async buildArtifactsRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Void | ResponseError<FxError>> {
    const res = await this.core.buildArtifacts(inputs);
    return convertToHandlerResult(res);
  }

  public async publishApplicationRequest(
    inputs: Inputs,
    token: CancellationToken
  ): Promise<Void | ResponseError<FxError>> {
    const res = await this.core.publishApplication(inputs);
    return convertToHandlerResult(res);
  }

  public async customizeLocalFuncRequest(
    funcId: number,
    params: Inputs,
    token: CancellationToken
  ): Promise<any | ResponseError<FxError>> {
    const res = await callFunc("LocalFunc", funcId, params);
    return convertToHandlerResult(res);
  }

  public async customizeValidateFuncRequest(
    funcId: number,
    answer: any,
    previousAnswers: Inputs | undefined,
    token: CancellationToken
  ): Promise<any | ResponseError<FxError>> {
    const res = await callFunc("ValidateFunc", funcId, answer, previousAnswers);
    return convertToHandlerResult(res);
  }

  public async customizeOnSelectionChangeFuncRequest(
    funcId: number,
    currentSelectedIds: Set<string>,
    previousSelectedIds: Set<string>,
    token: CancellationToken
  ): Promise<any | ResponseError<FxError>> {
    const res = await callFunc(
      "OnSelectionChangeFunc",
      funcId,
      currentSelectedIds,
      previousSelectedIds
    );
    return convertToHandlerResult(res);
  }
}
