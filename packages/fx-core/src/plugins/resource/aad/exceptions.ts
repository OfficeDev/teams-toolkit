// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class UserException extends Error {
  constructor(m: string) {
    super(m);
    Object.setPrototypeOf(this, UserException.prototype);
  }
}

export class SystemException extends Error {
  constructor(m: string) {
    super(m);
    Object.setPrototypeOf(this, SystemException.prototype);
  }
}
