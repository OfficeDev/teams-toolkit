// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import {
  Inputs,
  Platform,
  ProjectSettingsV3,
  SystemError,
  UserError,
} from "@microsoft/teamsfx-api";
import * as utils from "../../../../src/component/resource/botService/common";
import * as fs from "fs-extra";
import path from "path";
import Mustache from "mustache";
import { ProviderKind, TemplateKind } from "../../../../src/component/feature/cicd/provider/enums";
import { CICDProviderFactory } from "../../../../src/component/feature/cicd/provider/factory";
import { generateBuildScript } from "../../../../src/component/feature/cicd/utils/buildScripts";
import { CICDImpl } from "../../../../src/component/feature/cicd/CICDImpl";
import { ComponentNames } from "../../../../src/component/constants";
import { MockTelemetryReporter, MockUserInteraction } from "../../../core/utils";
import { expect } from "chai";
import {
  hasAPIM,
  hasAzureResourceV3,
  hasSPFxTab,
  hasSQL,
} from "../../../../src/common/projectSettingsHelperV3";
import { convertToAlphanumericOnly } from "../../../../src/common/utils";
import { EnvInfoV3 } from "@microsoft/teamsfx-api/build/v3";
import sinon from "sinon";
import { getTemplatesFolder } from "../../../../src/folder";

describe("Add ci cd workflow", () => {
  const cicdPlugin: CICDImpl = new CICDImpl();
  const testFolder: string = path.resolve(__dirname, utils.genUUID());
  const sandbox = sinon.createSandbox();
  after(async () => {
    await fs.remove(testFolder);
    sandbox.restore();
  });

  describe("Verify Templates for GitHub, AzDo, Jekinks separately", () => {
    it("Content of Templates & README should be expected", async () => {
      const providerPromises = Object.values(ProviderKind).map(async (providerKind) => {
        const projectSetting: ProjectSettingsV3 = {
          appName: "my app",
          projectId: "1232343534",
          solutionSettings: {
            name: "solution",
            version: "3.0.0",
            azureResources: [],
            programmingLanguage: "javascript",
          },
          components: [{ name: ComponentNames.TeamsBot }],
        };
        const envInfo: EnvInfoV3 = {
          envName: "staging",
          state: { solution: {} },
          config: {},
        };
        const context: any = {
          projectSetting,
          userInteraction: new MockUserInteraction(),
          envInfo,
          telemetryReporter: new MockTelemetryReporter(),
        };
        const inputs: Inputs = {
          platform: Platform.VSCode,
          projectPath: path.join(testFolder, utils.genUUID()),
          "target-env": "staging",
          template: ["ci", "cd", "provision", "publish"],
          provider: providerKind,
        };
        await fs.ensureDir(inputs.projectPath!);

        const envName = "staging";
        const localTemplatePath = path.join(
          getTemplatesFolder(),
          "plugins",
          "resource",
          "cicd",
          providerKind
        );

        const provider = CICDProviderFactory.create(providerKind);

        await cicdPlugin.addCICDWorkflows(context, inputs, envName);
        // Assert
        const contentsToBeComparedPromises = Object.values(TemplateKind).map(
          async (templateKind, index, arr) => {
            //return [actual, expected].
            const replacements = {
              env_name: envName,
              build_script: generateBuildScript(context.projectSetting),
              hosting_type_contains_spfx: hasSPFxTab(projectSetting),
              hosting_type_contains_azure: hasAzureResourceV3(projectSetting),
              cloud_resources_contains_sql: hasSQL(projectSetting),
              api_prefix: convertToAlphanumericOnly(context.projectSetting.appName),
              cloud_resources_contains_apim: hasAPIM(projectSetting),
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
          expect(contents[0]).equals(contents[1]);
        }
      }
    });
  });

  describe("Verify Incremental Cases", () => {
    it("Add GitHub then Jenkins, Content of Templates should be expected", async () => {
      const projectSetting: ProjectSettingsV3 = {
        appName: "my app",
        projectId: "1232343534",
        solutionSettings: {
          name: "solution",
          version: "3.0.0",
          azureResources: [],
          programmingLanguage: "javascript",
        },
        components: [{ name: ComponentNames.TeamsBot }],
      };
      const envInfo: EnvInfoV3 = {
        envName: "staging",
        state: { solution: {} },
        config: {},
      };
      const context: any = {
        projectSetting,
        userInteraction: new MockUserInteraction(),
        envInfo,
        telemetryReporter: new MockTelemetryReporter(),
      };
      const inputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: path.join(testFolder, utils.genUUID()),
        "target-env": "staging",
        template: ["ci", "cd", "provision", "publish"],
        provider: ProviderKind.GitHub,
      };
      await fs.ensureDir(inputs.projectPath!);
      const envName = "staging";

      await cicdPlugin.addCICDWorkflows(context, inputs, envName);
      inputs["provider"] = ProviderKind.Jenkins;
      await cicdPlugin.addCICDWorkflows(context, inputs, envName);

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

          const replacements = {
            env_name: envName,
            build_script: generateBuildScript(context.projectSetting),
            hosting_type_contains_spfx: hasSPFxTab(projectSetting),
            hosting_type_contains_azure: hasAzureResourceV3(projectSetting),
            cloud_resources_contains_sql: hasSQL(projectSetting),
            api_prefix: convertToAlphanumericOnly(context.projectSetting.appName),
            cloud_resources_contains_apim: hasAPIM(projectSetting),
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
          expect(contents[0]).equals(contents[1]);
        }
      }
    });

    it("Should skip if the files has already be created", async () => {
      const projectSetting: ProjectSettingsV3 = {
        appName: "my app",
        projectId: "1232343534",
        solutionSettings: {
          name: "solution",
          version: "3.0.0",
          azureResources: [],
          programmingLanguage: "javascript",
        },
        components: [{ name: ComponentNames.TeamsBot }],
      };
      const envInfo: EnvInfoV3 = {
        envName: "staging",
        state: { solution: {} },
        config: {},
      };
      const context: any = {
        projectSetting,
        userInteraction: new MockUserInteraction(),
        envInfo,
        telemetryReporter: new MockTelemetryReporter(),
      };
      const projectFolderName = utils.genUUID();
      const inputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: path.join(testFolder, projectFolderName),
        "target-env": "staging",
        template: ["ci"],
        provider: ProviderKind.GitHub,
      };
      const envName = "staging";
      const projectPath: string = inputs.projectPath!;
      const targetTemplate = path.join(
        projectPath,
        ".github/workflows",
        `${inputs.template[0]}.${envName}.yml`
      );
      await fs.ensureDir(path.join(projectPath, ".github/workflows"));
      await fs.createFile(targetTemplate);

      const res = await cicdPlugin.addCICDWorkflows(context, inputs, envName);

      // Assert
      expect(res.isOk()).equal(true);
      const content = await fs.readFile(targetTemplate);
      expect(content.length).equal(0);
    });
  });

  describe("Errors when adding CI CD workflows", () => {
    it("Missing project path", async () => {
      const projectSetting: ProjectSettingsV3 = {
        appName: "my app",
        projectId: "1232343534",
        solutionSettings: {
          name: "solution",
          version: "3.0.0",
          azureResources: [],
          programmingLanguage: "javascript",
        },
        components: [{ name: ComponentNames.TeamsBot }],
      };
      const envInfo: EnvInfoV3 = {
        envName: "staging",
        state: { solution: {} },
        config: {},
      };
      const context: any = {
        projectSetting,
        userInteraction: new MockUserInteraction(),
        envInfo,
        telemetryReporter: new MockTelemetryReporter(),
      };
      const inputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: "",
        "target-env": "staging",
        template: ["ci", "cd", "provision", "publish"],
        provider: ProviderKind.GitHub,
      };

      const envName = "staging";

      const res = await cicdPlugin.addCICDWorkflows(context, inputs, envName);
      expect(res.isErr()).equal(true);
      if (res.isErr()) {
        const error = res.error as any;
        expect(error.displayMessage).equal(
          "No project opened. Suggestions: You can create a new project or open an existing one."
        );
        expect(error instanceof UserError).equal(true);
      }
    });

    it("Missing env name", async () => {
      const projectSetting: ProjectSettingsV3 = {
        appName: "my app",
        projectId: "1232343534",
        solutionSettings: {
          name: "solution",
          version: "3.0.0",
          azureResources: [],
          programmingLanguage: "javascript",
        },
        components: [{ name: ComponentNames.TeamsBot }],
      };
      const envInfo: EnvInfoV3 = {
        envName: "staging",
        state: { solution: {} },
        config: {},
      };
      const context: any = {
        projectSetting,
        userInteraction: new MockUserInteraction(),
        envInfo,
        telemetryReporter: new MockTelemetryReporter(),
      };
      const inputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: path.join(testFolder, utils.genUUID()),
        "target-env": "staging",
        template: ["ci", "cd", "provision", "publish"],
        provider: ProviderKind.GitHub,
      };

      const res = await cicdPlugin.addCICDWorkflows(context, inputs, "");
      expect(res.isErr()).equal(true);
      if (res.isErr()) {
        const error = res.error as any;
        expect(error instanceof SystemError).equal(true);
      }
    });

    it("Missing provider name", async () => {
      const projectSetting: ProjectSettingsV3 = {
        appName: "my app",
        projectId: "1232343534",
        solutionSettings: {
          name: "solution",
          version: "3.0.0",
          azureResources: [],
          programmingLanguage: "javascript",
        },
        components: [{ name: ComponentNames.TeamsBot }],
      };
      const envInfo: EnvInfoV3 = {
        envName: "staging",
        state: { solution: {} },
        config: {},
      };
      const context: any = {
        projectSetting,
        userInteraction: new MockUserInteraction(),
        envInfo,
        telemetryReporter: new MockTelemetryReporter(),
      };
      const inputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: path.join(testFolder, utils.genUUID()),
        "target-env": "staging",
        template: ["ci", "cd", "provision", "publish"],
        provider: "",
      };

      const res = await cicdPlugin.addCICDWorkflows(context, inputs, "staging");
      expect(res.isErr()).equal(true);
      if (res.isErr()) {
        const error = res.error as any;
        expect(error instanceof SystemError).equal(true);
      }
    });

    it("Missing templateNames", async () => {
      const projectSetting: ProjectSettingsV3 = {
        appName: "my app",
        projectId: "1232343534",
        solutionSettings: {
          name: "solution",
          version: "3.0.0",
          azureResources: [],
          programmingLanguage: "javascript",
        },
        components: [{ name: ComponentNames.TeamsBot }],
      };
      const envInfo: EnvInfoV3 = {
        envName: "staging",
        state: { solution: {} },
        config: {},
      };
      const context: any = {
        projectSetting,
        userInteraction: new MockUserInteraction(),
        envInfo,
        telemetryReporter: new MockTelemetryReporter(),
      };
      const inputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: path.join(testFolder, utils.genUUID()),
        "target-env": "staging",
        template: [],
        provider: ProviderKind.GitHub,
      };

      const res = await cicdPlugin.addCICDWorkflows(context, inputs, "staging");
      expect(res.isErr()).equal(true);
      if (res.isErr()) {
        const error = res.error as any;
        expect(error instanceof SystemError).equal(true);
      }
    });

    it("Unhandled error", async () => {
      const projectSetting: ProjectSettingsV3 = {
        appName: "my app",
        projectId: "1232343534",
        solutionSettings: {
          name: "solution",
          version: "3.0.0",
          azureResources: [],
          programmingLanguage: "javascript",
        },
        components: [{ name: ComponentNames.TeamsBot }],
      };
      const envInfo: EnvInfoV3 = {
        envName: "staging",
        state: { solution: {} },
        config: {},
      };
      const context: any = {
        projectSetting,
        userInteraction: new MockUserInteraction(),
        envInfo,
        telemetryReporter: new MockTelemetryReporter(),
      };
      const inputs: Inputs = {
        platform: Platform.VSCode,
        projectPath: path.join(testFolder, utils.genUUID()),
        "target-env": "staging",
        template: ["ci", "cd", "provision", "publish"],
        provider: ProviderKind.GitHub,
      };

      const error = new Error("some fake error");
      sandbox.stub(CICDProviderFactory, "create").throws(error);
      const res = await cicdPlugin.addCICDWorkflows(context, inputs, "staging");
      expect(res.isErr()).equal(true);
      if (res.isErr()) {
        const error = res.error as any;
        expect(error instanceof SystemError).equal(true);
      }
    });
  });
});
