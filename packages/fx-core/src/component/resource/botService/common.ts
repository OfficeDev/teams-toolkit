// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * @author zhijie <zhihuan@microsoft.com>
 */
import { Uuid } from "node-ts-uuid";
import { AxiosResponse } from "axios";

export function genUUID(): string {
  return Uuid.generate();
}

export function isHttpCodeOkOrCreated(code: number): boolean {
  return [200, 201].includes(code);
}

export function isHappyResponse(response: AxiosResponse<any> | undefined): boolean {
  return response && response.data && isHttpCodeOkOrCreated(response.status);
}
