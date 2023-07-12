// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { M365TokenProvider } from "@microsoft/teamsfx-api";
import { isValidProject } from "@microsoft/teamsfx-core";
import { AadManager } from "../commonlib";
import { AzureHelper } from "./azureHelper";
import {
  AADAppIdEnvNames,
  BotIdEnvName,
  M365TitleIdEnvName,
  ResourceGroupEnvName,
  TeamsAppIdEnvName,
} from "./constants";
import { M365TitleHelper } from "./m365TitleHelper";
import { ProjectEnvReader } from "./projectEnvReader";
import { TeamsAppHelper } from "./teamsAppHelper";

/// Clean up the resources created by the test cases for V3 projects.
export class Cleaner {
  static async clean(
    projectPath: string,
    m365TokenProvider?: M365TokenProvider
  ) {
    if (!isValidProject(projectPath)) {
      return Promise.resolve(true);
    }
    const envs = await ProjectEnvReader.readAllEnvFiles(projectPath);
    const azureHelper = AzureHelper.init();
    const aadManager = await AadManager.init(m365TokenProvider);
    const teamsAppHelper = await TeamsAppHelper.init(m365TokenProvider);
    const m365TitleHelper = await M365TitleHelper.init(
      undefined,
      undefined,
      m365TokenProvider
    );
    return envs.map(async (env) =>
      Promise.all([
        /// clean up resource group
        azureHelper
          .deleteResourceGroup(env[ResourceGroupEnvName])
          .then((result) => console.log(result)),
        /// clean up aad apps
        AADAppIdEnvNames.map((name) =>
          aadManager.deleteAadAppsByClientId(env[name])
        ),
        /// clean up teams app
        teamsAppHelper.deleteTeamsAppById(env[TeamsAppIdEnvName]),
        /// clean up bot framework app
        teamsAppHelper.deleteBotById(env[BotIdEnvName]),
        /// clean up published teams app
        teamsAppHelper.cancelStagedTeamsAppById(env[TeamsAppIdEnvName]),
        /// clean up m365 app
        m365TitleHelper.unacquire(env[M365TitleIdEnvName]),
      ])
    );
  }
}

(async () => {
  const projectPath = process.argv[2];
  if (!projectPath) {
    return;
  }
  await Cleaner.clean(projectPath);
})();
