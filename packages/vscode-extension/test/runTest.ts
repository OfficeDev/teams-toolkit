// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import * as path from "path";
import { runTests } from "vscode-test";

import { testWorkspace } from "./globalVaribles";

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");
    const extensionTestsPath1 = path.resolve(__dirname, "./index.noFolder");
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath: extensionTestsPath1,
    });

    const extensionTestsPath2 = path.resolve(__dirname, "./index.folder");
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath: extensionTestsPath2,
      launchArgs: [testWorkspace],
    });
  } catch (err) {
    console.error("Failed to run tests");
    process.exit(1);
  }
}

main();
