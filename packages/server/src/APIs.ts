// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { FxError, Inputs, Void } from "@microsoft/teamsfx-api";
import { RequestHandler, RequestHandler2, RequestHandler3 } from "vscode-jsonrpc";

export type CustomizeFuncType = "LocalFunc" | "ValidateFunc" | "OnSelectionChangeFunc";

export interface CustomizeFuncRequestType {
  type: CustomizeFuncType;
  id: number;
}

export interface IServerConnection {
  createProjectRequest: RequestHandler<Inputs, string, FxError>;
  localDebugRequest: RequestHandler<Inputs, Void, FxError>;
  provisionResourcesRequest: RequestHandler<Inputs, Void, FxError>;
  deployArtifactsRequest: RequestHandler<Inputs, Void, FxError>;
  buildArtifactsRequest: RequestHandler<Inputs, Void, FxError>;
  publishApplicationRequest: RequestHandler<Inputs, Void, FxError>;

  customizeLocalFuncRequest: RequestHandler2<number, Inputs, any, FxError>;
  customizeValidateFuncRequest: RequestHandler3<
    number,
    any,
    Inputs | undefined,
    string | undefined,
    FxError
  >;
  customizeOnSelectionChangeFuncRequest: RequestHandler3<
    number,
    Set<string>,
    Set<string>,
    Set<string>,
    FxError
  >;
}
