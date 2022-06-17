// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

const { exec } = require("child_process");
const fs = require("fs-extra");
const path = require("path");
const { promisify } = require("util");

(async () => {
  const execAsync = promisify(exec);
  const { stdout: globalPath } = await execAsync("npm config get prefix");
  const teamsfxPath = path.join(globalPath.trim(), "teamsfx.ps1");
  if (await fs.pathExists(teamsfxPath)) {
    try {
      await fs.unlink(teamsfxPath);
    } catch (e) {
      // console.error(e);
    }
  }
})();
