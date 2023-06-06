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

export class NodeNotLtsError extends DepsCheckerError {
  constructor(message: string, helpLink: string) {
    super(message, helpLink);

    Object.setPrototypeOf(this, NodeNotLtsError.prototype);
  }
}

export class V3NodeNotSupportedError extends DepsCheckerError {
  constructor(message: string, helpLink: string) {
    super(message, helpLink);

    Object.setPrototypeOf(this, V3NodeNotSupportedError.prototype);
  }
}

export class LinuxNotSupportedError extends DepsCheckerError {
  constructor(message: string, helpLink: string) {
    super(message, helpLink);

    Object.setPrototypeOf(this, LinuxNotSupportedError.prototype);
  }
}

export class VxTestAppCheckError extends DepsCheckerError {
  constructor(message: string, helpLink: string) {
    super(message, helpLink);

    Object.setPrototypeOf(this, VxTestAppCheckError.prototype);
  }
}
