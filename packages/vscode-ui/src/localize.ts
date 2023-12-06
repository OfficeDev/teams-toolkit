// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export interface Localizer {
  loadingOptionsPlaceholder(): string;
  loadingDefaultPlaceholder(): string;
  loadingOptionsTimeoutMessage(): string;
  multiSelectKeyboardPlaceholder(): string;
  defaultFolder(): string;
  browse(): string;
  emptyOptionErrorMessage(): string;
  emptyOptionErrorDisplayMessage(): string;
  cancelErrorMessage(): string;
  cancelErrorDisplayMessage(): string;
  internalErrorMessage(action: string): string;
  internalErrorDisplayMessage(action: string): string;
  commandTimeoutErrorMessage(command: string): string;
  commandTimeoutErrorDisplayMessage(command: string): string;
  invalidInputErrorMessage?(name: string, reason: string): string;
  invalidInputDisplayMessage?(name: string, reason: string): string;
  missingInputErrorMessage?(name: string): string;
  missingInputDisplayMessage?(name: string): string;
}

export class DefaultLocalizer implements Localizer {
  commandTimeoutErrorMessage(command: string): string {
    return "Execute command timeout: " + command;
  }
  commandTimeoutErrorDisplayMessage(command: string): string {
    return "Execute command timeout: " + command;
  }
  internalErrorDisplayMessage(action: string): string {
    return "VS Code failed to operate: " + action;
  }
  internalErrorMessage(action: string): string {
    return "VS Code failed to operate: " + action;
  }
  cancelErrorMessage(): string {
    return "User canceled.";
  }
  cancelErrorDisplayMessage(): string {
    return "User canceled.";
  }
  emptyOptionErrorMessage(): string {
    return "Empty options.";
  }
  emptyOptionErrorDisplayMessage(): string {
    return "Empty options.";
  }
  browse(): string {
    return "Browse...";
  }
  defaultFolder(): string {
    return "Default folder";
  }
  multiSelectKeyboardPlaceholder(): string {
    return " (Space key to check/uncheck)";
  }
  loadingOptionsTimeoutMessage(): string {
    return "Loading options timeout.";
  }
  loadingDefaultPlaceholder(): string {
    return "Loading default value...";
  }
  loadingOptionsPlaceholder(): string {
    return "Loading options...";
  }
  invalidInputErrorMessage(name: string, reason: string): string {
    return `Input '${name}' validation failed: ${reason}`;
  }
  invalidInputDisplayMessage(name: string, reason: string): string {
    return `Input '${name}' validation failed: ${reason}`;
  }
  missingInputErrorMessage(name: string): string {
    return `Missing required input: ${name}`;
  }
  missingInputDisplayMessage(name: string): string {
    return `Missing required input: ${name}`;
  }
}
