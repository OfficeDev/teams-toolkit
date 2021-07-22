// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { AsyncLocalStorage } from "async_hooks";
import * as uuid from "uuid";

const asyncLocalStorage = new AsyncLocalStorage<string>();

export class Correlator {
  static run<T extends unknown[], R>(work: (...args: [...T]) => R, ...args: [...T]): R {
    const id = uuid.v4();
    return asyncLocalStorage.run<R>(id, () => work(...args));
  }

  static runWithId<T extends unknown[], R>(
    id: string,
    work: (...args: [...T]) => R,
    ...args: [...T]
  ): R {
    id = id ? id : uuid.v4();
    return asyncLocalStorage.run<R>(id, () => work(...args));
  }

  static getId(): string {
    const store = asyncLocalStorage.getStore();
    return store ?? "";
  }
}
