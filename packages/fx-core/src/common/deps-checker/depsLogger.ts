// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface DepsLogger {
  debug(message: string): Promise<boolean>;

  info(message: string): Promise<boolean>;

  warning(message: string): Promise<boolean>;

  error(message: string): Promise<boolean>;

  append(message: string): Promise<boolean>;

  appendLine(message: string): Promise<boolean>;

  printDetailLog(): Promise<void>;

  cleanup(): void;
}
