// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Uuid } from "node-ts-uuid";

export function genUUID(): string {
  return Uuid.generate();
}

export function isHttpCodeOkOrCreated(code: number): boolean {
  return [200, 201].includes(code);
}
