// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Uuid } from "node-ts-uuid";
import { MaxLengths } from "./constants";

export function genUUID(): string {
  return Uuid.generate();
}

export function isHttpCodeOkOrCreated(code: number): boolean {
  return [200, 201].includes(code);
}

export function makeBotName(raw: string): string {
  return raw.length > MaxLengths.BOT_NAME ? raw.substr(raw.length - MaxLengths.BOT_NAME) : raw;
}
