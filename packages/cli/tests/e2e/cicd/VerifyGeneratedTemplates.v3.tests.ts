// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author Ivan Jobs <ruhe@microsoft.com>
 */

import path from "path";
import "mocha";
import * as chai from "chai";
import { getTestFolder, getUniqueAppName, cleanUp } from "../commonUtils";
import { CliHelper } from "../../commonlib/cliHelper";
import { Capability } from "../../commonlib/constants";
import { getTemplatesFolder } from "@microsoft/teamsfx-core/build/folder";
import { it } from "@microsoft/extra-shot-mocha";
import Mustache from "mustache";
import * as fs from "fs-extra";
import { CICDProviderFactory } from "../../../../fx-core/src/component/feature/cicd/provider/factory";
import { isV3Enabled } from "@microsoft/teamsfx-core";

describe("Verify generated templates & readme V3", function () {
  const testFolder = getTestFolder();
  const appName = getUniqueAppName();
  const projectPath = path.resolve(testFolder, appName);
  after(async () => {
    await cleanUp(appName, projectPath, false, false, false);
  });

  it(`Verify generated templates & readme`, { testPlanCaseId: 15685915 }, async function () {
    if (isV3Enabled()) {
      this.skip();
    }
    await CliHelper.createProjectWithCapability(appName, testFolder, Capability.Bot);

    // Add CICD Workflows.
    for (const provider of ["github", "azdo", "jenkins"]) {
      await CliHelper.addCICDWorkflows(
        projectPath,
        ` --env dev --provider ${provider} --template ci cd provision publish --interactive false`
      );
    }

    const providerPromises = ["github", "azdo", "jenkins"].map(async (providerName) => {
      const provider = CICDProviderFactory.create(providerName as any);
      const localTemplatePath = path.join(
        getTemplatesFolder(),
        "plugins",
        "resource",
        isV3Enabled() ? "cicd" : "cicd_v2",
        providerName
      );
      const templatePromises = ["ci", "cd", "provision", "publish"].map(async (template) => {
        const replacements = {
          env_name: "dev",
          build_script: "cd bot; npm ci; cd -;",
          hosting_type_contains_spfx: false,
          hosting_type_contains_azure: true,
          cloud_resources_contains_sql: false,
        };
        const sourceTemplatePath = path.join(
          localTemplatePath,
          provider.sourceTemplateName!(template)
        );
        const renderedContent = Mustache.render(
          fs.readFileSync(sourceTemplatePath).toString(),
          replacements
        );

        return [
          (
            await fs.readFile(
              path.join(
                projectPath,
                provider.scaffoldTo,
                provider.targetTemplateName!(template, "dev")
              )
            )
          ).toString(),
          renderedContent,
        ];
      });

      // Add promises for README.
      templatePromises.push(
        Promise.resolve([
          (await fs.readFile(path.join(projectPath, provider.scaffoldTo, "README.md"))).toString(),
          (await fs.readFile(path.join(localTemplatePath, "README.md"))).toString(),
        ])
      );

      return templatePromises;
    });

    // Assert
    for (const contentsToBeComparedPromises of await Promise.all(providerPromises)) {
      for (const contents of await Promise.all(contentsToBeComparedPromises)) {
        chai.assert(contents[0] == contents[1]);
      }
    }
  });
});
