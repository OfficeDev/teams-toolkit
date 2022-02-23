// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Jobs <ruhe@microsoft.com>
 */

import path from "path";
import "mocha";
import { getSubscriptionId, getTestFolder, getUniqueAppName, cleanUp } from "../commonUtils";
import { environmentManager } from "@microsoft/teamsfx-core";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";
import { generateBuildScript } from "@microsoft/teamsfx-core/src/plugins/resource/cicd/utils/buildScripts";
import { getTemplatesFolder } from "@microsoft/teamsfx-core/src";
import Mustache from "@microsoft/teamsfx-core/node_modules/@types/mustache";
import { CICDProviderFactory } from "@microsoft/teamsfx-core/src/plugins/resource/cicd/providers/factory";
import { ProviderKind } from "@microsoft/teamsfx-core/src/plugins/resource/cicd/providers/enums";
import * as fs from "fs-extra";
import { sameContents } from "@microsoft/teamsfx-core/tests/plugins/resource/cicd/utils";

describe("Verify generated templates & readme", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);

  after(async () => {
    await cleanUp(appName, projectPath, true, true, false, true);
  });

  it(`Verify generated templates & readme`, async function () {
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Bot);

    // Provision
    for (const provider of ["github", "azdo", "jenkins"]) {
      await CliHelper.addCICDWorkflows(
        projectPath,
        ` --env dev --provider ${provider} --template ci cd provision publish --interactive false`
      );
    }
    // Assert
    for (const providerName of ["github", "azdo", "jenkins"]) {
      for (const template of ["ci", "cd", "provision", "publish"]) {
        const provider = CICDProviderFactory.create(providerName as ProviderKind);
        const localTemplatePath = path.join(
          getTemplatesFolder(),
          "plugins",
          "resource",
          "cicd",
          providerName
        );
        const replacements = {
          env_name: "dev",
          build_script: generateBuildScript(["bot"], "javascript"),
          hosting_type_contains_spfx: false,
          hosting_type_contains_azure: true,
        };
        const sourceTemplatePath = path.join(
          localTemplatePath,
          provider.sourceTemplateName!(template)
        );
        const renderedContent = Mustache.render(
          fs.readFileSync(sourceTemplatePath).toString(),
          replacements
        );
        const targetExpectedTemplatePath = path.join(
          projectPath,
          provider.targetTemplateName!(template, "dev")
        );
        fs.writeFileSync(targetExpectedTemplatePath, renderedContent);

        chai.assert(
          sameContents(
            path.join(
              projectPath,
              provider.scaffoldTo,
              provider.targetTemplateName!(template, "dev")
            ),
            targetExpectedTemplatePath
          )
        );
      }
    }
  });
});
