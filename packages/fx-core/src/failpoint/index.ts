// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// Please don't edit. This file is copied from packages/failpoint-ts/src
// We don't want failpoint-ts to be a package.json dependency.
// We tried to soft link the code, and it works well on linux. However, soft-linked git files don't naturally work on Windows.
export * from "./runtime";
export * from "./marker";
