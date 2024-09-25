// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface DepsLogger {
  debug(message: string): void;

  info(message: string): void;

  warning(message: string): void;

  error(message: string): void;

  append(message: string): void;

  appendLine(message: string): void;

  printDetailLog(): void;

  cleanup(): void;
}

export class EmptyLogger implements DepsLogger {
  append(message: string): void {}

  appendLine(message: string): void {}

  cleanup(): void {}

  debug(message: string): void {}

  error(message: string): void {}

  info(message: string): void {}

  printDetailLog(): void {}

  warning(message: string): void {}
}
