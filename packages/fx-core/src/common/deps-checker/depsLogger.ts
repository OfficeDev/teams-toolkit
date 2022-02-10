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

export class EmptyLogger implements DepsLogger {
  append(message: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  appendLine(message: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  cleanup(): void {}

  debug(message: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  error(message: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  info(message: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  printDetailLog(): Promise<void> {
    return Promise.resolve(undefined);
  }

  warning(message: string): Promise<boolean> {
    return Promise.resolve(false);
  }
}
