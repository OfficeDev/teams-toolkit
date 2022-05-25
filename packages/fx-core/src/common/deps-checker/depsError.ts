// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class DepsCheckerError extends Error {
  public readonly helpLink: string;

  constructor(message: string, helpLink: string) {
    super(message);

    this.helpLink = helpLink;
    Object.setPrototypeOf(this, DepsCheckerError.prototype);
  }
}

export class NodeNotFoundError extends DepsCheckerError {
  constructor(message: string, helpLink: string) {
    super(message, helpLink);

    Object.setPrototypeOf(this, NodeNotFoundError.prototype);
  }
}

export class NodeNotSupportedError extends DepsCheckerError {
  constructor(message: string, helpLink: string) {
    super(message, helpLink);

    Object.setPrototypeOf(this, NodeNotSupportedError.prototype);
  }
}
export class LinuxNotSupportedError extends DepsCheckerError {
  constructor(helpLink: string) {
    super("Linux is not supported.", helpLink);

    Object.setPrototypeOf(this, LinuxNotSupportedError.prototype);
  }
}

export class FuncNodeNotMatchedError extends DepsCheckerError {
  constructor(message: string, helpLink: string) {
    super(message, helpLink);

    Object.setPrototypeOf(this, FuncNodeNotMatchedError.prototype);
  }
}

export class BackendExtensionsInstallError extends DepsCheckerError {
  constructor(message: string, helpLink: string) {
    super(message, helpLink);

    Object.setPrototypeOf(this, BackendExtensionsInstallError.prototype);
  }
}
