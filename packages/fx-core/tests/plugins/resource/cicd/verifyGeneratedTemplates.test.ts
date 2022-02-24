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
      const providerPromises = Object.values(ProviderKind).map(async (providerKind) => {
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
            programmingLanguage: "javascript",
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
        const contentsToBeComparedPromises = Object.values(TemplateKind).map(
          async (templateKind, index, arr) => {
            //return [actual, expected].
            const hostType = context.projectSetting.solutionSettings?.hostType;
            const replacements = {
              env_name: envInfo.envName,
              build_script: generateBuildScript(context.projectSetting),
              hosting_type_contains_spfx: hostType == "SPFx",
              hosting_type_contains_azure: hostType == "Azure",
            };
            const sourceTemplatePath = path.join(
              localTemplatePath,
              provider.sourceTemplateName!(templateKind)
            );
            const renderedContent = Mustache.render(
              (await fs.readFile(sourceTemplatePath)).toString(),
              replacements
            );

            const actualTemplatePath = path.join(
              inputs.projectPath!,
              provider.scaffoldTo,
              provider.targetTemplateName!(templateKind, inputs["target-env"])
            );

            return [(await fs.readFile(actualTemplatePath)).toString(), renderedContent];
          }
        );

        // Add Promises for README.
        contentsToBeComparedPromises.push(
          Promise.resolve([
            (
              await fs.readFile(path.join(inputs.projectPath!, provider.scaffoldTo, "README.md"))
            ).toString(),
            (await fs.readFile(path.join(localTemplatePath, "README.md"))).toString(),
          ])
        );

        return contentsToBeComparedPromises;
      });

      // Assert
      for (const contentsToBeComparedPromises of await Promise.all(providerPromises)) {
        for (const contents of await Promise.all(contentsToBeComparedPromises)) {
          chai.assert(contents[0] == contents[1]);
        }
      }
    });
  });

  describe("Verify Incremental Cases", () => {
    it("Add GitHub then Jenkins, Content of Templates should be expected", async () => {
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
          programmingLanguage: "javascript",
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
      const templatePromises = Object.values(TemplateKind).map(async (templateKind) => {
        return [ProviderKind.GitHub, ProviderKind.Jenkins].map(async (providerKind) => {
          const provider = CICDProviderFactory.create(providerKind);
          const localTemplatePath = path.join(
            getTemplatesFolder(),
            "plugins",
            "resource",
            "cicd",
            providerKind
          );

          const hostType = context.projectSetting.solutionSettings?.hostType;
          const replacements = {
            env_name: envInfo.envName,
            build_script: generateBuildScript(context.projectSetting),
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
          const actualTemplatePath = path.join(
            inputs.projectPath!,
            provider.scaffoldTo,
            provider.targetTemplateName!(templateKind, inputs["target-env"])
          );
          //return [actual, expected].
          return [(await fs.readFile(actualTemplatePath)).toString(), renderedContent];
        });
      });

      for (const templateResult of await Promise.all(templatePromises)) {
        for (const contents of await Promise.all(templateResult)) {
          chai.assert(contents[0] == contents[1]);
        }
      }
    });
  });
});
