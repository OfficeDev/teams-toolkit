// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import { CICDPluginV2 } from "../../../../src/plugins/resource/cicd/index";
import { Inputs, Platform, ProjectSettings } from "@microsoft/teamsfx-api";
import { Context, EnvInfoV2 } from "@microsoft/teamsfx-api/build/v2";
import * as utils from "../../../../src/plugins/resource/bot/utils/common";
import * as fs from "fs-extra";
import path from "path";
import { getTemplatesFolder } from "../../../../src";
import { CICDProviderFactory } from "../../../../src/plugins/resource/cicd/providers/factory";
import { ProviderKind, TemplateKind } from "../../../../src/plugins/resource/cicd/providers/enums";
import { sameContents } from "./utils";
import { MockedV2Context } from "../../solution/util";
import { generateBuildScript } from "../../../../src/plugins/resource/cicd/utils/buildScripts";
import Mustache from "mustache";

describe("Verify Generated Templates & README", () => {
  const cicdPlugin: CICDPluginV2 = new CICDPluginV2();

  const testFolder: string = path.resolve(__dirname, utils.genUUID());

  after(async () => {
    await fs.remove(testFolder);
  });

  describe("Verify Templates for GitHub, AzDo, Jekinks separately", () => {
    it("Content of Templates & README should be expected", async () => {
      for (const providerKind of Object.values(ProviderKind)) {
        const projectSettings: ProjectSettings = {
          appName: "my app",
          projectId: "1232343534",
          solutionSettings: {
            name: "solution",
            version: "3.0.0",
            capabilities: ["Bot"],
            hostType: "Azure",
            azureResources: [],
            activeResourcePlugins: ["bot"],
          },
        };
        const context: Context = new MockedV2Context(projectSettings);
        const inputs: Inputs = {
          platform: Platform.VSCode,
          projectPath: path.join(testFolder, utils.genUUID()),
          "target-env": "staging",
          template: ["ci", "cd", "provision", "publish"],
          provider: providerKind,
        };
        await fs.ensureDir(inputs.projectPath!);
        const envInfo: EnvInfoV2 = {
          envName: "staging",
          state: {},
          config: {},
        };
        const localTemplatePath = path.join(
          getTemplatesFolder(),
          "plugins",
          "resource",
          "cicd",
          providerKind
        );

        const provider = CICDProviderFactory.create(providerKind);

        await cicdPlugin.addCICDWorkflows(context, inputs, envInfo);
        // Assert
        const filesToBeCompared = Object.values(TemplateKind).map((templateKind, index, arr) => {
          //return [actual, expected].
          const solutionSettings = context.projectSetting.solutionSettings;
          const hostType = solutionSettings?.hostType;
          const capabilities = solutionSettings?.capabilities;
          const programmingLanguage = solutionSettings?.programmingLanguage;
          const replacements = {
            env_name: envInfo.envName,
            build_script: generateBuildScript(capabilities, programmingLanguage),
            hosting_type_contains_spfx: hostType == "SPFx",
            hosting_type_contains_azure: hostType == "Azure",
          };
          const sourceTemplatePath = path.join(
            localTemplatePath,
            provider.sourceTemplateName!(templateKind)
          );
          const renderedContent = Mustache.render(
            fs.readFileSync(sourceTemplatePath).toString(),
            replacements
          );
          const targetExpectedTemplatePath = path.join(
            inputs.projectPath!,
            provider.targetTemplateName!(templateKind, inputs["target-env"])
          );
          fs.writeFileSync(targetExpectedTemplatePath, renderedContent);

          return [
            path.join(
              inputs.projectPath!,
              provider.scaffoldTo,
              provider.targetTemplateName!(templateKind, inputs["target-env"])
            ),
            targetExpectedTemplatePath,
          ];
        });

        for (const filePair of filesToBeCompared) {
          chai.assert(sameContents(filePair[0], filePair[1]));
        }
      }
    });
  });

  describe("Verify Incremental Cases", () => {
    it("Add GitHub then Jenkins, Content of Templates & README should be expected", async () => {
      const projectSettings: ProjectSettings = {
        appName: "my app",
        projectId: "1232343534",
        solutionSettings: {
          name: "solution",
          version: "3.0.0",
          capabilities: ["Bot"],
          hostType: "Azure",
          azureResources: [],
          activeResourcePlugins: ["bot"],
        },
      };
      const context: Context = new MockedV2Context(projectSettings);
      const inputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: path.join(testFolder, utils.genUUID()),
        "target-env": "staging",
        template: ["ci", "cd", "provision", "publish"],
        provider: ProviderKind.GitHub,
      };
      await fs.ensureDir(inputs.projectPath!);
      const envInfo: EnvInfoV2 = {
        envName: "staging",
        state: {},
        config: {},
      };

      await cicdPlugin.addCICDWorkflows(context, inputs, envInfo);
      inputs["provider"] = ProviderKind.Jenkins;
      await cicdPlugin.addCICDWorkflows(context, inputs, envInfo);

      // Assert
      const filesToBeCompared = Object.values(TemplateKind).map((templateKind) => {
        return [ProviderKind.GitHub, ProviderKind.Jenkins].map((providerKind) => {
          const provider = CICDProviderFactory.create(providerKind);
          const localTemplatePath = path.join(
            getTemplatesFolder(),
            "plugins",
            "resource",
            "cicd",
            providerKind
          );

          const solutionSettings = context.projectSetting.solutionSettings;
          const hostType = solutionSettings?.hostType;
          const capabilities = solutionSettings?.capabilities;
          const programmingLanguage = solutionSettings?.programmingLanguage;
          const replacements = {
            env_name: envInfo.envName,
            build_script: generateBuildScript(capabilities, programmingLanguage),
            hosting_type_contains_spfx: hostType == "SPFx",
            hosting_type_contains_azure: hostType == "Azure",
          };
          const sourceTemplatePath = path.join(
            localTemplatePath,
            provider.sourceTemplateName!(templateKind)
          );
          const renderedContent = Mustache.render(
            fs.readFileSync(sourceTemplatePath).toString(),
            replacements
          );
          const targetExpectedTemplatePath = path.join(
            inputs.projectPath!,
            provider.targetTemplateName!(templateKind, inputs["target-env"])
          );
          fs.writeFileSync(targetExpectedTemplatePath, renderedContent);
          //return [actual, expected].
          return [
            path.join(
              inputs.projectPath!,
              provider.scaffoldTo,
              provider.targetTemplateName!(templateKind, inputs["target-env"])
            ),
            targetExpectedTemplatePath,
          ];
        });
      });

      for (const templateFiles of filesToBeCompared) {
        for (const filePair of templateFiles) {
          chai.assert(sameContents(filePair[0], filePair[1]));
        }
      }
    });
  });
});
