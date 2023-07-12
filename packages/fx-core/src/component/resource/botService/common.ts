// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * @author Qianhao Dong <qidon@microsoft.com>
 */
import { AxiosResponse } from "axios";

export function isHttpCodeOkOrCreated(code: number): boolean {
  return [200, 201].includes(code);
}

export function isHappyResponse(response: AxiosResponse<any> | undefined): boolean {
  return response && response.data && isHttpCodeOkOrCreated(response.status);
}
