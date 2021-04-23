// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from "os";
import * as path from "path";

import * as dotnetCheckerUtils from "../utils/dotnet";
import { ConfigFolderName } from "fx-api";

const dotnetConfigPath = path.join(os.homedir(), "." + ConfigFolderName, "dotnet.json");

suite("DotnetChecker E2E Test", async () => {
  test("Dotnet SDK is not installed, whether globally or in home dir", async function(this: Mocha.Context) {
    if (await dotnetCheckerUtils.getDotnetExecPathFromConfig(dotnetConfigPath) !== null) {
      this.skip();
    }
    if (await dotnetCheckerUtils.hasDotnetVersion("dotnet", "3.1")) {
      this.skip();
    }
    if (await dotnetCheckerUtils.hasDotnetVersion("dotnet", "5.0")) {
      this.skip();
    }
  });

  test("Dotnet SDK supported version is installed globally", async function(this: Mocha.Context) {
    if (await dotnetCheckerUtils.getDotnetExecPathFromConfig(dotnetConfigPath) !== null) {
      this.skip();
    }
    if (!(await dotnetCheckerUtils.hasDotnetVersion("dotnet", "3.1") || await dotnetCheckerUtils.hasDotnetVersion("dotnet", "5.0"))) {
      this.skip();
    }
  });
});
