// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assembleError, err, FxError, ok, Result } from "@microsoft/teamsfx-api";
import { HandlerResult, MessageConnection, ResponseError } from "vscode-jsonrpc";

export async function sendRequest(
  connection: MessageConnection,
  type: any,
  ...args: any[]
): Promise<Result<any, FxError>> {
  return new Promise(async (resolve) => {
    let promise;
    if (args.length === 0) {
      promise = connection.sendRequest(type);
    } else if (args.length === 1) promise = connection.sendRequest(type, args[0]);
    else if (args.length === 2) promise = connection.sendRequest(type, args[0], args[1]);
    else if (args.length === 3) promise = connection.sendRequest(type, args[0], args[1], args[2]);
    else if (args.length === 4)
      promise = connection.sendRequest(type, args[0], args[1], args[2], args[3]);
    else if (args.length === 5)
      promise = connection.sendRequest(type, args[0], args[1], args[2], args[3], args[4]);
    else if (args.length === 6)
      promise = connection.sendRequest(type, args[0], args[1], args[2], args[3], args[4], args[5]);
    else if (args.length === 7)
      promise = connection.sendRequest(
        type,
        args[0],
        args[1],
        args[2],
        args[3],
        args[4],
        args[5],
        args[6]
      );
    else if (args.length === 8)
      promise = connection.sendRequest(
        type,
        args[0],
        args[1],
        args[2],
        args[3],
        args[4],
        args[5],
        args[6],
        args[7]
      );
    else
      promise = connection.sendRequest(
        type,
        args[0],
        args[1],
        args[2],
        args[3],
        args[4],
        args[5],
        args[6],
        args[7],
        args[8]
      );
    promise
      .then((v) => {
        resolve(ok(v));
      })
      .catch((e) => {
        if (e.data) {
          const fxError = e.data as FxError;
          fxError.source = "VS";
          resolve(err(fxError));
        } else resolve(err(assembleError(e)));
      });
  });
}

export function sendNotification(connection: MessageConnection, type: any, ...args: any[]): void {
  if (args.length === 0) {
    connection.sendNotification(type);
  } else if (args.length === 1) connection.sendNotification(type, args[0]);
  else if (args.length === 2) connection.sendNotification(type, args[0], args[1]);
  else if (args.length === 3) connection.sendNotification(type, args[0], args[1], args[2]);
  else if (args.length === 4) connection.sendNotification(type, args[0], args[1], args[2], args[3]);
  else if (args.length === 5)
    connection.sendNotification(type, args[0], args[1], args[2], args[3], args[4]);
  else if (args.length === 6)
    connection.sendNotification(type, args[0], args[1], args[2], args[3], args[4], args[5]);
  else if (args.length === 7)
    connection.sendNotification(
      type,
      args[0],
      args[1],
      args[2],
      args[3],
      args[4],
      args[5],
      args[6]
    );
  else if (args.length === 8)
    connection.sendNotification(
      type,
      args[0],
      args[1],
      args[2],
      args[3],
      args[4],
      args[5],
      args[6],
      args[7]
    );
  else
    connection.sendNotification(
      type,
      args[0],
      args[1],
      args[2],
      args[3],
      args[4],
      args[5],
      args[6],
      args[7],
      args[8]
    );
}

export function convertToHandlerResult<R>(result: Result<R, FxError>): HandlerResult<R, FxError> {
  if (result.isOk()) return result.value;
  else {
    const fxError: FxError = result.error;
    return new ResponseError(-32000, fxError.message, fxError);
  }
}
