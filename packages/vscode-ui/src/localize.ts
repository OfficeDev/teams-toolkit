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
}
