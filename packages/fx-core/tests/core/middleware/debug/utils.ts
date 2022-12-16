// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, Platform } from "@microsoft/teamsfx-api";
import { MigrationContext } from "../../../../src/core/middleware/utils/migrationContext";

export async function mockMigrationContext(projectPath: string): Promise<MigrationContext> {
  const inputs: Inputs = { platform: Platform.VSCode, ignoreEnvInfo: true };
  inputs.projectPath = projectPath;
  const ctx = {
    arguments: [inputs],
  };
  return await MigrationContext.create(ctx);
}
