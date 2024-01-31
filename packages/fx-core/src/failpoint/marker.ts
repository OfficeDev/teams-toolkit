// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// Please don't edit. This file is copied from packages/failpoint-ts/src
// We don't want failpoint-ts to be a package.json dependency.
// We tried to soft link the code, and it works well on linux. However, soft-linked git files don't naturally work on Windows.
export type Value =
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean };

export function inject(name: string, body: () => unknown): void;
export function inject(name: string, body: (val: Value | undefined) => unknown): void;

export function inject(
  _name: string,
  _body: (() => unknown) | ((val: Value | undefined) => unknown)
) {}
