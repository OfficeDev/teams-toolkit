// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, IQTreeNode, OptionItem, Platform, UserError } from "@microsoft/teamsfx-api";
import { featureFlagManager, FeatureFlags } from "../../common/featureFlags";
import { getLocalizedString } from "../../common/localizeUtils";
import {
  HostType,
  HostTypeTriggerOptionItem,
  NotificationTriggers,
  ProgrammingLanguage,
  QuestionNames,
  SPFxVersionOptionIds,
} from "../constants";
import {
  apiOperationQuestion,
  apiSpecLocationQuestion,
  appNameQuestion,
  folderQuestion,
} from "../create";
import { TemplateNames, Templates } from "../templates";
import { Constants } from "../../component/generator/spfx/utils/constants";
import { Utils } from "../../component/generator/spfx/utils/utils";
import { DevEnvironmentSetupError } from "../../component/generator/spfx/error";
import * as jsonschema from "jsonschema";
import * as os from "os";
import { pluginManifestUtils } from "../../component/driver/teamsApp/utils/PluginManifestUtils";
import {
  ApiSpecTelemetryPropertis,
  getQuestionValidationErrorEventName,
  sendTelemetryErrorEvent,
} from "../../common/telemetry";
import { CoreSource, FileNotSupportError } from "../../error/common";
import { Correlator } from "../../common/correlator";
import { validateSourcePluginManifest } from "../../component/generator/copilotExtension/helper";
import * as path from "path";
import { ErrorType, ProjectType, SpecParser } from "@microsoft/m365-spec-parser";
import { getParserOptions } from "../../component/generator/apiSpec/helper";
import { SpecParserSource } from "../../common/constants";

function onDidSelectionCapability(selected: string | OptionItem, inputs: Inputs): void {
  if ((selected as OptionItem).data) {
    inputs[QuestionNames.TemplateName] = (selected as OptionItem).data as string;
  }
}

/**
 *
 * FxCore API for scaffold: scaffold(questionModel: IQTreeNode, generators: DefaultTemplateGenerator[]): Promise<Result<any, FxError>>
 *
 */

export function scaffoldQuestionForVSCode(): IQTreeNode {
  const node: IQTreeNode = {
    data: { type: "group" },
    children: [
      // 1. category level 1
      {
        data: {
          name: QuestionNames.ProjectType,
          title: getLocalizedString("core.createProjectQuestion.title"),
          type: "singleSelect",
          staticOptions: [
            ProjectTypeOptions.Agent(),
            ProjectTypeOptions.customCopilot(),
            ProjectTypeOptions.bot(),
            ProjectTypeOptions.tab(),
            ProjectTypeOptions.me(),
            featureFlagManager.getBooleanValue(FeatureFlags.OfficeMetaOS)
              ? ProjectTypeOptions.officeMetaOS()
              : featureFlagManager.getBooleanValue(FeatureFlags.OfficeAddin)
              ? ProjectTypeOptions.officeAddin()
              : ProjectTypeOptions.outlookAddin(),
          ],
        },
      },
      // 2. category level 2
      {
        // 2.1 Agent sub tree
        condition: (inputs: Inputs) =>
          inputs[QuestionNames.ProjectType] === ProjectTypeOptions.Agent().id,
        data: {
          name: QuestionNames.Capabilities,
          title: getLocalizedString(
            "core.createProjectQuestion.projectType.copilotExtension.title"
          ),
          type: "singleSelect",
          staticOptions: [CapabilityOptions.declarativeAgent()],
          placeholder: getLocalizedString(
            "core.createProjectQuestion.projectType.copilotExtension.placeholder"
          ),
        },
      },
      {
        // 2.2 customCopilots sub tree
        condition: (inputs: Inputs) =>
          inputs[QuestionNames.ProjectType] === ProjectTypeOptions.customCopilot().id,
        data: {
          name: QuestionNames.Capabilities,
          title: getLocalizedString("core.createProjectQuestion.projectType.customCopilot.title"),
          type: "singleSelect",
          staticOptions: [
            CapabilityOptions.customCopilotBasic(),
            CapabilityOptions.customCopilotRag(),
            CapabilityOptions.customCopilotAssistant(),
          ],
          placeholder: getLocalizedString(
            "core.createProjectQuestion.projectType.customCopilot.placeholder"
          ),
        },
      },
      {
        // 2.3 Bot sub tree
        condition: (inputs: Inputs) =>
          inputs[QuestionNames.ProjectType] === ProjectTypeOptions.bot().id,
        data: {
          name: QuestionNames.Capabilities,
          title: getLocalizedString("core.createProjectQuestion.projectType.bot.title"),
          type: "singleSelect",
          staticOptions: [
            CapabilityOptions.basicBot(),
            CapabilityOptions.notificationBot(),
            CapabilityOptions.commandBot(),
            CapabilityOptions.workflowBot(),
          ],
          placeholder: getLocalizedString("core.createCapabilityQuestion.placeholder"),
          onDidSelection: onDidSelectionCapability,
        },
      },
      {
        // 2.4 Tab sub tree
        condition: (inputs: Inputs) =>
          inputs[QuestionNames.ProjectType] === ProjectTypeOptions.tab().id,
        data: {
          name: QuestionNames.Capabilities,
          title: getLocalizedString("core.createProjectQuestion.projectType.tab.title"),
          type: "singleSelect",
          staticOptions: [
            CapabilityOptions.nonSsoTab(),
            CapabilityOptions.m365SsoLaunchPage(),
            CapabilityOptions.dashboardTab(),
            CapabilityOptions.SPFxTab(),
          ],
          placeholder: getLocalizedString("core.createCapabilityQuestion.placeholder"),
          onDidSelection: onDidSelectionCapability,
        },
      },
      {
        // 2.5 Messaging Extension sub tree
        condition: (inputs: Inputs) =>
          inputs[QuestionNames.ProjectType] === ProjectTypeOptions.me().id,
        data: {
          name: QuestionNames.Capabilities,
          title: getLocalizedString(
            "core.createProjectQuestion.projectType.messageExtension.title"
          ),
          type: "singleSelect",
          staticOptions: [
            CapabilityOptions.m365SearchMe(),
            CapabilityOptions.collectFormMe(),
            CapabilityOptions.linkUnfurling(),
          ],
          placeholder: getLocalizedString("core.createCapabilityQuestion.placeholder"),
          onDidSelection: onDidSelectionCapability,
        },
      },
      {
        // 2.6 Office Add-in
        condition: (inputs: Inputs) =>
          inputs[QuestionNames.ProjectType] === ProjectTypeOptions.officeMetaOS().id ||
          inputs[QuestionNames.ProjectType] === ProjectTypeOptions.officeAddin().id ||
          inputs[QuestionNames.ProjectType] === ProjectTypeOptions.outlookAddin().id,
        data: {
          name: QuestionNames.Capabilities,
          title: (inputs: Inputs) => {
            const projectType = inputs[QuestionNames.ProjectType];
            switch (projectType) {
              case ProjectTypeOptions.outlookAddin().id:
                return getLocalizedString(
                  "core.createProjectQuestion.projectType.outlookAddin.title"
                );
              case ProjectTypeOptions.officeMetaOS().id:
              case ProjectTypeOptions.officeAddin().id:
                return getLocalizedString(
                  "core.createProjectQuestion.projectType.officeAddin.title"
                );
              default:
                return getLocalizedString("core.createCapabilityQuestion.titleNew");
            }
          },
          type: "singleSelect",
          staticOptions: [
            CapabilityOptions.jsonTaskPane(),
            ...(featureFlagManager.getBooleanValue(FeatureFlags.OfficeMetaOS)
              ? [CapabilityOptions.officeAddinImport()]
              : featureFlagManager.getBooleanValue(FeatureFlags.OfficeAddin)
              ? [CapabilityOptions.officeContentAddin(), CapabilityOptions.officeAddinImport()]
              : [CapabilityOptions.outlookAddinImport()]),
          ],
          placeholder: getLocalizedString("core.createCapabilityQuestion.placeholder"),
          forgetLastValue: true,
        },
      },
      // category level 3
      {
        // 2.3.1 Notification bot trigger sub-tree
        condition: (input: Inputs) =>
          input[QuestionNames.Capabilities] === CapabilityOptions.notificationBot().id,
        data: {
          name: QuestionNames.BotTrigger,
          title: getLocalizedString("plugins.bot.questionHostTypeTrigger.title"),
          type: "singleSelect",
          staticOptions: [
            NotificationTriggerOptions.appService(),
            NotificationTriggerOptions.functionsHttpAndTimerTrigger(),
            NotificationTriggerOptions.functionsHttpTrigger(),
            NotificationTriggerOptions.functionsTimerTrigger(),
          ],
          placeholder: getLocalizedString("plugins.bot.questionHostTypeTrigger.placeholder"),
          onDidSelection: onDidSelectionCapability,
        },
      },
      {
        // 2.4.1 SPFx sub-tree
        // TODO
        condition: (input: Inputs) =>
          input[QuestionNames.Capabilities] === CapabilityOptions.SPFxTab().id,
        data: {
          type: "singleSelect",
          name: QuestionNames.SPFxSolution,
          title: getLocalizedString("plugins.spfx.questions.spfxSolution.title"),
          cliDescription: "Create a new or import an existing SharePoint Framework solution.",
          cliShortName: "s",
          staticOptions: [
            {
              id: "new",
              label: getLocalizedString("plugins.spfx.questions.spfxSolution.createNew"),
              detail: getLocalizedString("plugins.spfx.questions.spfxSolution.createNew.detail"),
            },
            {
              id: "import",
              label: getLocalizedString("plugins.spfx.questions.spfxSolution.importExisting"),
              detail: getLocalizedString(
                "plugins.spfx.questions.spfxSolution.importExisting.detail"
              ),
            },
          ],
          default: "new",
        },
        children: [
          {
            data: { type: "group" },
            children: [
              {
                data: {
                  type: "singleSelect",
                  name: QuestionNames.SPFxInstallPackage,
                  title: getLocalizedString("plugins.spfx.questions.packageSelect.title"),
                  staticOptions: [],
                  placeholder: getLocalizedString(
                    "plugins.spfx.questions.packageSelect.placeholder"
                  ),
                  dynamicOptions: async (inputs: Inputs): Promise<OptionItem[]> => {
                    const versions = await Promise.all([
                      Utils.findGloballyInstalledVersion(
                        undefined,
                        Constants.GeneratorPackageName,
                        0,
                        false
                      ),
                      Utils.findLatestVersion(undefined, Constants.GeneratorPackageName, 5),
                      Utils.findGloballyInstalledVersion(
                        undefined,
                        Constants.YeomanPackageName,
                        0,
                        false
                      ),
                    ]);

                    inputs.globalSpfxPackageVersion = versions[0];
                    inputs.latestSpfxPackageVersion = versions[1];
                    inputs.globalYeomanPackageVersion = versions[2];

                    return [
                      {
                        id: SPFxVersionOptionIds.installLocally,

                        label:
                          versions[1] !== undefined
                            ? getLocalizedString(
                                "plugins.spfx.questions.packageSelect.installLocally.withVersion.label",
                                "v" + versions[1]
                              )
                            : getLocalizedString(
                                "plugins.spfx.questions.packageSelect.installLocally.noVersion.label"
                              ),
                      },
                      {
                        id: SPFxVersionOptionIds.globalPackage,
                        label:
                          versions[0] !== undefined
                            ? getLocalizedString(
                                "plugins.spfx.questions.packageSelect.useGlobalPackage.withVersion.label",
                                "v" + versions[0]
                              )
                            : getLocalizedString(
                                "plugins.spfx.questions.packageSelect.useGlobalPackage.noVersion.label"
                              ),
                        description: getLocalizedString(
                          "plugins.spfx.questions.packageSelect.useGlobalPackage.detail",
                          Constants.RecommendedLowestSpfxVersion
                        ),
                      },
                    ];
                  },
                  default: SPFxVersionOptionIds.installLocally,
                  validation: {
                    validFunc: (
                      input: string,
                      previousInputs?: Inputs
                    ): Promise<string | undefined> => {
                      if (input === SPFxVersionOptionIds.globalPackage) {
                        const hasPackagesInstalled =
                          !!previousInputs &&
                          !!previousInputs.globalSpfxPackageVersion &&
                          !!previousInputs.globalYeomanPackageVersion;
                        if (!hasPackagesInstalled) {
                          return Promise.reject(DevEnvironmentSetupError());
                        }
                      }
                      return Promise.resolve(undefined);
                    },
                  },
                  isBoolean: true,
                },
              },
              {
                data: {
                  type: "singleSelect",
                  name: QuestionNames.SPFxFramework,
                  cliShortName: "k",
                  cliDescription: "Framework.",
                  title: getLocalizedString("plugins.spfx.questions.framework.title"),
                  staticOptions: [
                    { id: "react", label: "React" },
                    { id: "minimal", label: "Minimal" },
                    { id: "none", label: "None" },
                  ],
                  placeholder: "Select an option",
                  default: "react",
                },
              },
              {
                data: {
                  type: "text",
                  name: QuestionNames.SPFxWebpartName,
                  title: getLocalizedString("plugins.spfx.questions.webpartName"),
                  default: Constants.DEFAULT_WEBPART_NAME,
                  validation: {
                    validFunc: (input: string): string | undefined => {
                      const schema = {
                        pattern: "^[a-zA-Z_][a-zA-Z0-9_]*$",
                      };
                      const validateRes = jsonschema.validate(input, schema);
                      if (validateRes.errors && validateRes.errors.length > 0) {
                        return getLocalizedString(
                          "plugins.spfx.questions.webpartName.error.notMatch",
                          input,
                          schema.pattern
                        );
                      }
                      return undefined;
                    },
                  },
                },
              },
            ],
            condition: { equals: "new" },
          },
          {
            data: {
              type: "folder",
              name: QuestionNames.SPFxFolder,
              title: getLocalizedString("core.spfxFolder.title"),
              cliDescription:
                "Directory or Path that contains the existing SharePoint Framework solution.",
              placeholder: getLocalizedString("core.spfxFolder.placeholder"),
            },
            condition: { equals: "import" },
          },
        ],
      },
      {
        // 2.5.1 Search ME sub-tree
        condition: (input: Inputs) =>
          input[QuestionNames.Capabilities] === CapabilityOptions.m365SearchMe().id,
        data: {
          name: QuestionNames.MeArchitectureType,
          title: getLocalizedString("core.createProjectQuestion.meArchitecture.title"),
          type: "singleSelect",
          staticOptions: [
            MeArchitectureOptions.newApi(),
            MeArchitectureOptions.apiSpec(),
            MeArchitectureOptions.botPlugin(),
          ],
          default: MeArchitectureOptions.newApi().id,
          placeholder: getLocalizedString(
            "core.createProjectQuestion.projectType.copilotExtension.placeholder"
          ),
          forgetLastValue: true,
          skipSingleOption: true,
          onDidSelection: onDidSelectionCapability,
        },
      },
      {
        // 2.1.1 declarativeAgent
        condition: (input: Inputs) =>
          input[QuestionNames.Capabilities] === CapabilityOptions.declarativeAgent().id,
        data: {
          type: "singleSelect",
          name: QuestionNames.WithPlugin,
          title: getLocalizedString("core.createProjectQuestion.declarativeCopilot.title"),
          placeholder: getLocalizedString(
            "core.createProjectQuestion.declarativeCopilot.placeholder"
          ),
          cliDescription: "Whether to add API plugin for your declarative Copilot.",
          staticOptions: [
            DeclarativeCopilotTypeOptions.noPlugin(),
            DeclarativeCopilotTypeOptions.withPlugin(),
          ],
          default: DeclarativeCopilotTypeOptions.noPlugin().id,
        },
        children: [
          {
            condition: { equals: DeclarativeCopilotTypeOptions.withPlugin().id },
            data: {
              type: "singleSelect",
              name: QuestionNames.ApiPluginType,
              title: getLocalizedString("core.createProjectQuestion.createApiPlugin.title"),
              placeholder: getLocalizedString(
                "core.createProjectQuestion.projectType.copilotExtension.placeholder"
              ),
              staticOptions: [
                ApiPluginStartOptions.newApi(),
                ApiPluginStartOptions.apiSpec(),
                ApiPluginStartOptions.existingPlugin(),
              ],
              default: ApiPluginStartOptions.newApi().id,
            },
            children: [
              {
                condition: { equals: ApiPluginStartOptions.existingPlugin().id },
                data: { type: "group", name: QuestionNames.ImportPlugin },
                children: [
                  {
                    data: {
                      type: "singleFile",
                      name: QuestionNames.PluginManifestFilePath,
                      title: getLocalizedString(
                        "core.createProjectQuestion.addExistingPlugin.pluginManifest.title"
                      ),
                      placeholder: getLocalizedString(
                        "core.createProjectQuestion.addExistingPlugin.pluginManifest.placeholder"
                      ),
                      filters: {
                        files: ["json"],
                      },
                      defaultFolder: os.homedir(),
                      validation: {
                        validFunc: async (input: string) => {
                          const manifestRes = await pluginManifestUtils.readPluginManifestFile(
                            input.trim()
                          );
                          if (manifestRes.isErr()) {
                            sendTelemetryErrorEvent(
                              CoreSource,
                              getQuestionValidationErrorEventName(
                                QuestionNames.PluginManifestFilePath
                              ),
                              manifestRes.error,
                              {
                                "correlation-id": Correlator.getId(),
                              }
                            );
                            return (manifestRes.error as UserError).displayMessage;
                          } else {
                            const manifest = manifestRes.value;

                            const checkRes = validateSourcePluginManifest(
                              manifest,
                              QuestionNames.PluginManifestFilePath
                            );
                            if (checkRes.isErr()) {
                              sendTelemetryErrorEvent(
                                CoreSource,
                                getQuestionValidationErrorEventName(
                                  QuestionNames.PluginManifestFilePath
                                ),
                                checkRes.error,
                                {
                                  "correlation-id": Correlator.getId(),
                                }
                              );
                              return checkRes.error.displayMessage;
                            }
                          }
                        },
                      },
                    },
                  },
                  {
                    data: {
                      type: "singleFile",
                      name: QuestionNames.PluginOpenApiSpecFilePath,
                      title: getLocalizedString(
                        "core.createProjectQuestion.addExistingPlugin.apiSpec.title"
                      ),
                      placeholder: getLocalizedString(
                        "core.createProjectQuestion.addExistingPlugin.openApiSpec.placeholder"
                      ),
                      cliDescription: "OpenAPI description document used for your API plugin.",
                      filters: {
                        files: ["json", "yml", "yaml"],
                      },
                      defaultFolder: (inputs: Inputs) =>
                        path.dirname(inputs[QuestionNames.PluginManifestFilePath] as string),
                      validation: {
                        validFunc: async (input: string, inputs?: Inputs) => {
                          if (!inputs) {
                            throw new Error("inputs is undefined"); // should never happen
                          }
                          const filePath = input.trim();

                          const ext = path.extname(filePath).toLowerCase();
                          if (![".json", ".yml", ".yaml"].includes(ext)) {
                            const error = new FileNotSupportError(
                              CoreSource,
                              ["json", "yml", "yaml"].join(", ")
                            );
                            sendTelemetryErrorEvent(
                              CoreSource,
                              getQuestionValidationErrorEventName(
                                QuestionNames.PluginOpenApiSpecFilePath
                              ),
                              error,
                              {
                                "correlation-id": Correlator.getId(),
                              }
                            );
                            return error.displayMessage;
                          }

                          const specParser = new SpecParser(
                            filePath,
                            getParserOptions(ProjectType.Copilot)
                          );
                          const validationRes = await specParser.validate();
                          const invalidSpecError = validationRes.errors.find(
                            (o) => o.type === ErrorType.SpecNotValid
                          );

                          if (invalidSpecError) {
                            const error = new UserError(
                              SpecParserSource,
                              ApiSpecTelemetryPropertis.InvalidApiSpec,
                              invalidSpecError.content,
                              invalidSpecError.content
                            );
                            sendTelemetryErrorEvent(
                              CoreSource,
                              getQuestionValidationErrorEventName(
                                QuestionNames.PluginOpenApiSpecFilePath
                              ),
                              error,
                              {
                                "correlation-id": Correlator.getId(),
                                [ApiSpecTelemetryPropertis.SpecNotValidDetails]:
                                  invalidSpecError.content,
                              }
                            );
                          }
                          return invalidSpecError?.content;
                        },
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        condition: (inputs: Inputs) => {
          return (
            inputs[QuestionNames.MeArchitectureType] == MeArchitectureOptions.newApi().id ||
            inputs[QuestionNames.ApiPluginType] == ApiPluginStartOptions.newApi().id
          );
        },
        data: {
          type: "singleSelect",
          name: QuestionNames.ApiAuth,
          title: getLocalizedString("core.createProjectQuestion.apiMessageExtensionAuth.title"),
          placeholder: getLocalizedString(
            "core.createProjectQuestion.apiMessageExtensionAuth.placeholder"
          ),
          staticOptions: [],
          dynamicOptions: (inputs: Inputs) => {
            const options: OptionItem[] = [ApiAuthOptions.none()];
            if (inputs[QuestionNames.MeArchitectureType] === MeArchitectureOptions.newApi().id) {
              options.push(ApiAuthOptions.apiKey(), ApiAuthOptions.microsoftEntra());
            } else if (inputs[QuestionNames.ApiPluginType] === ApiPluginStartOptions.newApi().id) {
              options.push(ApiAuthOptions.apiKey());
              if (featureFlagManager.getBooleanValue(FeatureFlags.ApiPluginAAD)) {
                options.push(ApiAuthOptions.microsoftEntra());
              }
              options.push(ApiAuthOptions.oauth());
            }
            return options;
          },
          default: ApiAuthOptions.none().id,
        },
      },
      {
        condition: (inputs: Inputs) => {
          return inputs[QuestionNames.Capabilities] == CapabilityOptions.customCopilotRag().id;
        },
        data: {
          type: "singleSelect",
          name: QuestionNames.CustomCopilotRag,
          title: getLocalizedString("core.createProjectQuestion.capability.customCopilotRag.title"),
          placeholder: getLocalizedString(
            "core.createProjectQuestion.capability.customCopilotRag.placeholder"
          ),
          staticOptions: [
            CustomCopilotRagOptions.customize(),
            CustomCopilotRagOptions.azureAISearch(),
            CustomCopilotRagOptions.customApi(),
            CustomCopilotRagOptions.microsoft365(),
          ],
          default: CustomCopilotRagOptions.customize().id,
        },
      },
      {
        // from API spec
        condition: (inputs: Inputs) => {
          return (
            (inputs[QuestionNames.ApiPluginType] === ApiPluginStartOptions.apiSpec().id ||
              inputs[QuestionNames.MeArchitectureType] === MeArchitectureOptions.apiSpec().id ||
              inputs[QuestionNames.CustomCopilotRag] === CustomCopilotRagOptions.customApi().id) &&
            !(
              // Only skip this project when need to rediect to Kiota: 1. Feature flag enabled 2. Creating plugin/declarative copilot from existing spec
              (
                featureFlagManager.getBooleanValue(FeatureFlags.KiotaIntegration) &&
                inputs[QuestionNames.ApiPluginType] === ApiPluginStartOptions.apiSpec().id &&
                inputs[QuestionNames.Capabilities] === CapabilityOptions.declarativeAgent().id
              )
            )
          );
        },
        data: { type: "group", name: QuestionNames.FromExistingApi },
        children: [
          {
            data: apiSpecLocationQuestion(),
          },
          {
            data: apiOperationQuestion(),
            condition: (inputs: Inputs) => {
              return !inputs[QuestionNames.ApiPluginManifestPath];
            },
          },
        ],
      },
      {
        condition: (inputs: Inputs) => {
          return (
            inputs[QuestionNames.Capabilities] == CapabilityOptions.customCopilotAssistant().id
          );
        },
        data: {
          type: "singleSelect",
          name: QuestionNames.CustomCopilotAssistant,
          title: getLocalizedString(
            "core.createProjectQuestion.capability.customCopilotAssistant.title"
          ),
          placeholder: getLocalizedString(
            "core.createProjectQuestion.capability.customCopilotAssistant.placeholder"
          ),
          staticOptions: [
            CustomCopilotAssistantOptions.new(),
            CustomCopilotAssistantOptions.assistantsApi(),
          ],
          default: CustomCopilotAssistantOptions.new().id,
        },
      },
      {
        // office addin import sub-tree (capabilities=office-addin-import | outlook-addin-import)
        // TODO
        condition: (input: Inputs) =>
          input[QuestionNames.Capabilities] === CapabilityOptions.outlookAddinImport().id ||
          input[QuestionNames.Capabilities] === CapabilityOptions.officeAddinImport().id,
        data: { type: "group", name: QuestionNames.OfficeAddinImport },
        children: [
          {
            data: {
              type: "folder",
              name: QuestionNames.OfficeAddinFolder,
              title: "Existing add-in project folder",
            },
          },
          {
            data: {
              type: "singleFile",
              name: QuestionNames.OfficeAddinManifest,
              title: "Select import project manifest file",
            },
          },
        ],
      },
      {
        // 3. language
        data: {
          type: "singleSelect",
          title: getLocalizedString("core.ProgrammingLanguageQuestion.title"),
          name: QuestionNames.ProgrammingLanguage,
          staticOptions: [
            { id: ProgrammingLanguage.JS, label: "JavaScript" },
            { id: ProgrammingLanguage.TS, label: "TypeScript" },
            { id: ProgrammingLanguage.CSharp, label: "C#" },
            { id: ProgrammingLanguage.PY, label: "Python" },
          ],
          dynamicOptions: (inputs: Inputs) => {
            const templateName = inputs[QuestionNames.TemplateName];
            const languages = Templates.filter((t) => t.name === templateName).map(
              (t) => t.language
            );
            return languages;
          },
          skipSingleOption: true,
        },
      },
      {
        // 4. root folder
        data: folderQuestion(),
      },
      {
        // 5. app name
        data: appNameQuestion(),
      },
    ],
  };
  return node;
}

export class ProjectTypeOptions {
  static getCreateGroupName(): string | undefined {
    return featureFlagManager.getBooleanValue(FeatureFlags.ChatParticipantUIEntries)
      ? getLocalizedString("core.createProjectQuestion.projectType.createGroup.title")
      : undefined;
  }
  static tab(): OptionItem {
    return {
      id: "tab-type",
      label: `$(browser) ${getLocalizedString("core.TabOption.label")}`,
      detail: getLocalizedString("core.createProjectQuestion.projectType.tab.detail"),
      groupName: ProjectTypeOptions.getCreateGroupName(),
    };
  }

  static bot(): OptionItem {
    return {
      id: "bot-type",
      label: `$(hubot) ${getLocalizedString("core.createProjectQuestion.projectType.bot.label")}`,
      detail: getLocalizedString("core.createProjectQuestion.projectType.bot.detail"),
      groupName: ProjectTypeOptions.getCreateGroupName(),
    };
  }

  static me(): OptionItem {
    return {
      id: "me-type",
      label: `$(symbol-keyword) ${getLocalizedString("core.MessageExtensionOption.label")}`,
      detail: getLocalizedString(
        "core.createProjectQuestion.projectType.messageExtension.copilotEnabled.detail"
      ),
      groupName: ProjectTypeOptions.getCreateGroupName(),
    };
  }

  static outlookAddin(): OptionItem {
    return {
      id: "outlook-addin-type",
      label: `$(mail) ${getLocalizedString(
        "core.createProjectQuestion.projectType.outlookAddin.label"
      )}`,
      detail: getLocalizedString("core.createProjectQuestion.projectType.outlookAddin.detail"),
      groupName: ProjectTypeOptions.getCreateGroupName(),
    };
  }

  static officeMetaOS(): OptionItem {
    return {
      id: "office-meta-os-type",
      label: `$(teamsfx-m365) ${getLocalizedString(
        "core.createProjectQuestion.projectType.officeAddin.label"
      )}`,
      detail: getLocalizedString("core.createProjectQuestion.projectType.officeAddin.detail"),
      groupName: ProjectTypeOptions.getCreateGroupName(),
    };
  }

  static officeAddin(): OptionItem {
    return {
      id: "office-addin-type",
      label: `$(extensions) ${getLocalizedString(
        "core.createProjectQuestion.projectType.officeAddin.label"
      )}`,
      detail: getLocalizedString("core.createProjectQuestion.projectType.officeAddin.detail"),
      groupName: ProjectTypeOptions.getCreateGroupName(),
    };
  }

  static Agent(): OptionItem {
    return {
      id: "copilot-agent-type",
      label: `$(teamsfx-agent) ${getLocalizedString(
        "core.createProjectQuestion.projectType.declarativeAgent.label"
      )}`,
      detail: getLocalizedString("core.createProjectQuestion.projectType.declarativeAgent.detail"),
      groupName: ProjectTypeOptions.getCreateGroupName(),
    };
  }

  static customCopilot(): OptionItem {
    return {
      id: "custom-copilot-type",
      label: `$(teamsfx-custom-copilot) ${getLocalizedString(
        "core.createProjectQuestion.projectType.customCopilot.label"
      )}`,
      detail: getLocalizedString("core.createProjectQuestion.projectType.customCopilot.detail"),
      groupName: ProjectTypeOptions.getCreateGroupName(),
    };
  }

  static startWithGithubCopilot(): OptionItem {
    return {
      id: "start-with-github-copilot",
      label: `$(comment-discussion) ${getLocalizedString(
        "core.createProjectQuestion.projectType.copilotHelp.label"
      )}`,
      detail: getLocalizedString("core.createProjectQuestion.projectType.copilotHelp.detail"),
      groupName: getLocalizedString("core.createProjectQuestion.projectType.copilotGroup.title"),
    };
  }
}

export class CapabilityOptions {
  static basicBot(): OptionItem {
    return {
      id: "bot",
      label: `${getLocalizedString("core.BotNewUIOption.label")}`,
      detail: getLocalizedString("core.BotNewUIOption.detail"),
      data: TemplateNames.DefaultBot,
    };
  }

  // need further sub-options to decide template name
  static notificationBot(): OptionItem {
    return {
      id: "notification",
      label: `${getLocalizedString("core.NotificationOption.label")}`,
      detail: getLocalizedString("core.NotificationOption.detail"),
      buttons: [
        {
          iconPath: "file-symlink-file",
          tooltip: getLocalizedString("core.option.github"),
          command: "fx-extension.openTutorial",
        },
      ],
    };
  }
  static commandBot(): OptionItem {
    return {
      // id must match cli `yargsHelp`
      id: "command-bot",
      label: `${getLocalizedString("core.CommandAndResponseOption.label")}`,
      detail: getLocalizedString("core.CommandAndResponseOption.detail"),
      data: TemplateNames.CommandAndResponse,
      buttons: [
        {
          iconPath: "file-symlink-file",
          tooltip: getLocalizedString("core.option.github"),
          command: "fx-extension.openTutorial",
        },
      ],
    };
  }

  static workflowBot(): OptionItem {
    const item: OptionItem = {
      id: "workflow-bot",
      label: `${getLocalizedString("core.WorkflowOption.label")}`,
      detail: getLocalizedString("core.WorkflowOption.detail"),
      data: TemplateNames.Workflow,
      buttons: [
        {
          iconPath: "file-symlink-file",
          tooltip: getLocalizedString("core.option.github"),
          command: "fx-extension.openTutorial",
        },
      ],
    };
    return item;
  }

  static nonSsoTab(): OptionItem {
    return {
      id: "tab-non-sso",
      label: `${getLocalizedString("core.TabNonSso.label")}`,
      detail: getLocalizedString("core.TabNonSso.detail"),
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.worksInOutlookM365"
      ),
      data: TemplateNames.Tab,
    };
  }

  static m365SsoLaunchPage(): OptionItem {
    return {
      id: "sso-launch-page",
      label: `${getLocalizedString("core.M365SsoLaunchPageOptionItem.label")}`,
      detail: getLocalizedString("core.M365SsoLaunchPageOptionItem.detail"),
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.worksInOutlookM365"
      ),
      data: TemplateNames.SsoTabObo,
    };
  }

  static dashboardTab(): OptionItem {
    return {
      id: "dashboard-tab",
      label: "core.DashboardOption.label",
      detail: getLocalizedString("core.DashboardOption.detail"),
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.worksInOutlookM365"
      ),
      data: TemplateNames.DashboardTab,
      buttons: [
        {
          iconPath: "file-symlink-file",
          tooltip: getLocalizedString("core.option.github"),
          command: "fx-extension.openTutorial",
        },
      ],
    };
  }

  // need further sub-options to decide template name
  static SPFxTab(): OptionItem {
    return {
      id: "tab-spfx",
      label: getLocalizedString("core.TabSPFxOption.labelNew"),
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.worksInOutlookM365"
      ),
      detail: getLocalizedString("core.TabSPFxOption.detailNew"),
    };
  }

  // need further sub-options to decide template name
  static m365SearchMe(): OptionItem {
    return {
      id: "search-app",
      label: `${getLocalizedString("core.M365SearchAppOptionItem.label")}`,
      detail: getLocalizedString("core.M365SearchAppOptionItem.copilot.detail"),
    };
  }

  static collectFormMe(): OptionItem {
    return {
      id: "collect-form-message-extension",
      label: `${getLocalizedString("core.MessageExtensionOption.labelNew")}`,
      detail: getLocalizedString("core.MessageExtensionOption.detail"),
      data: TemplateNames.MessageExtensionAction,
    };
  }

  static linkUnfurling(): OptionItem {
    return {
      id: "link-unfurling",
      label: `${getLocalizedString("core.LinkUnfurlingOption.label")}`,
      detail: getLocalizedString("core.LinkUnfurlingOption.detail"),
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.worksInOutlook"
      ),
      data: TemplateNames.LinkUnfurling,
    };
  }

  static outlookAddinImport(): OptionItem {
    return {
      id: "outlook-addin-import",
      label: getLocalizedString("core.importAddin.label"),
      detail: getLocalizedString("core.importAddin.detail"),
    };
  }
  static officeContentAddin(): OptionItem {
    return {
      id: "office-content-addin",
      label: getLocalizedString("core.officeContentAddin.label"),
      detail: getLocalizedString("core.officeContentAddin.detail"),
    };
  }
  static officeAddinImport(): OptionItem {
    return {
      id: "office-addin-import",
      label: getLocalizedString("core.importOfficeAddin.label"),
      detail: getLocalizedString("core.importAddin.detail"),
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.previewOnWindow"
      ),
    };
  }
  static jsonTaskPane(): OptionItem {
    return {
      id: "json-taskpane",
      label: getLocalizedString("core.newTaskpaneAddin.label"),
      detail: getLocalizedString("core.newTaskpaneAddin.detail"),
    };
  }
  static declarativeAgent(): OptionItem {
    return {
      id: "declarative-agent",
      label: getLocalizedString("core.createProjectQuestion.projectType.declarativeAgent.label"),
      detail: getLocalizedString("core.createProjectQuestion.projectType.declarativeAgent.detail"),
    };
  }

  // custom copilot
  static customCopilotBasic(): OptionItem {
    const description = featureFlagManager.getBooleanValue(FeatureFlags.CEAEnabled)
      ? getLocalizedString("core.createProjectQuestion.capability.customEngineAgent.description")
      : undefined;
    return {
      id: "custom-copilot-basic",
      label: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotBasicOption.label"
      ),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotBasicOption.detail"
      ),
      description: description,
    };
  }

  static customCopilotRag(): OptionItem {
    const description = featureFlagManager.getBooleanValue(FeatureFlags.CEAEnabled)
      ? getLocalizedString("core.createProjectQuestion.capability.customEngineAgent.description")
      : undefined;
    return {
      id: "custom-copilot-rag",
      label: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotRagOption.label"
      ),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotRagOption.detail"
      ),
      description: description,
    };
  }

  static customCopilotAssistant(): OptionItem {
    const description = featureFlagManager.getBooleanValue(FeatureFlags.CEAEnabled)
      ? getLocalizedString("core.createProjectQuestion.capability.customEngineAgent.description")
      : undefined;
    return {
      id: "custom-copilot-agent",
      label: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotAssistantOption.label"
      ),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotAssistantOption.detail"
      ),
      description: description,
    };
  }
}

export class NotificationTriggerOptions {
  static appService(): HostTypeTriggerOptionItem {
    return {
      id: "http-express",
      hostType: HostType.AppService,
      label: getLocalizedString("plugins.bot.triggers.http-express.label"),
      description: getLocalizedString("plugins.bot.triggers.http-express.description"),
      detail: getLocalizedString("plugins.bot.triggers.http-express.detail"),
      data: TemplateNames.NotificationExpress,
    };
  }

  static functionsTimerTrigger(): HostTypeTriggerOptionItem {
    return {
      id: "timer-functions",
      hostType: HostType.Functions,
      triggers: [NotificationTriggers.TIMER],
      label: getLocalizedString("plugins.bot.triggers.timer-functions.label"),
      description: getLocalizedString("plugins.bot.triggers.timer-functions.description"),
      detail: getLocalizedString("plugins.bot.triggers.timer-functions.detail"),
      data: TemplateNames.NotificationTimerTrigger,
    };
  }

  static functionsHttpAndTimerTrigger(): HostTypeTriggerOptionItem {
    return {
      id: "http-and-timer-functions",
      hostType: HostType.Functions,
      triggers: [NotificationTriggers.HTTP, NotificationTriggers.TIMER],
      label: getLocalizedString("plugins.bot.triggers.http-and-timer-functions.label"),
      description: getLocalizedString("plugins.bot.triggers.http-and-timer-functions.description"),
      detail: getLocalizedString("plugins.bot.triggers.http-and-timer-functions.detail"),
      data: TemplateNames.NotificationHttpTimerTrigger,
    };
  }

  static functionsHttpTrigger(): HostTypeTriggerOptionItem {
    return {
      id: "http-functions",
      hostType: HostType.Functions,
      triggers: [NotificationTriggers.HTTP],
      label: getLocalizedString("plugins.bot.triggers.http-functions.label"),
      description: getLocalizedString("plugins.bot.triggers.http-functions.description"),
      detail: getLocalizedString("plugins.bot.triggers.http-functions.detail"),
      data: TemplateNames.NotificationHttpTrigger,
    };
  }
}

export class MeArchitectureOptions {
  static botPlugin(): OptionItem {
    return {
      id: "bot-plugin",
      label: getLocalizedString("core.createProjectQuestion.capability.botMessageExtension.label"),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.botMessageExtension.detail"
      ),
      description: getLocalizedString(
        "core.createProjectQuestion.option.description.worksInOutlookCopilot"
      ),
      data: TemplateNames.MessageExtensionCopilot,
    };
  }

  static newApi(): OptionItem {
    return {
      id: "new-api",
      label: getLocalizedString(
        "core.createProjectQuestion.capability.copilotPluginNewApiOption.label"
      ),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.messageExtensionNewApiOption.detail"
      ),
    };
  }

  static apiSpec(): OptionItem {
    return {
      id: "api-spec",
      label: getLocalizedString(
        "core.createProjectQuestion.capability.copilotPluginApiSpecOption.label"
      ),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.messageExtensionApiSpecOption.detail"
      ),
    };
  }
}

export class DeclarativeCopilotTypeOptions {
  static noPlugin(): OptionItem {
    return {
      id: "no",
      label: getLocalizedString("core.createProjectQuestion.noPlugin.label"),
      detail: getLocalizedString("core.createProjectQuestion.noPlugin.detail"),
    };
  }
  static withPlugin(): OptionItem {
    return {
      id: "yes",
      label: getLocalizedString("core.createProjectQuestion.addPlugin.label"),
      detail: getLocalizedString("core.createProjectQuestion.addPlugin.detail"),
    };
  }
}

export class ApiPluginStartOptions {
  static newApi(): OptionItem {
    return {
      id: "new-api",
      label: getLocalizedString(
        "core.createProjectQuestion.capability.copilotPluginNewApiOption.label"
      ),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.copilotPluginNewApiOption.detail"
      ),
    };
  }

  static apiSpec(): OptionItem {
    return {
      id: "api-spec",
      label: getLocalizedString(
        "core.createProjectQuestion.capability.copilotPluginApiSpecOption.label"
      ),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.copilotPluginApiSpecOption.detail"
      ),
    };
  }

  static existingPlugin(): OptionItem {
    return {
      id: "existing-plugin",
      label: getLocalizedString("core.createProjectQuestion.apiPlugin.importPlugin.label"),
      detail: getLocalizedString("core.createProjectQuestion.apiPlugin.importPlugin.detail"),
    };
  }
}

export class ApiAuthOptions {
  static none(): OptionItem {
    return {
      id: "none",
      label: "None",
    };
  }
  static apiKey(): OptionItem {
    return {
      id: "api-key",
      label: "API Key (Bearer Token Auth)",
    };
  }

  static microsoftEntra(): OptionItem {
    return {
      id: "microsoft-entra",
      label: "Microsoft Entra",
    };
  }

  static oauth(): OptionItem {
    return {
      id: "oauth",
      label: "OAuth",
    };
  }

  static all(): OptionItem[] {
    return [
      ApiAuthOptions.none(),
      ApiAuthOptions.apiKey(),
      ApiAuthOptions.microsoftEntra(),
      ApiAuthOptions.oauth(),
    ];
  }
}

export class CustomCopilotRagOptions {
  static customize(): OptionItem {
    return {
      id: "custom-copilot-rag-customize",
      label: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotRagCustomizeOption.label"
      ),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotRagCustomizeOption.detail"
      ),
    };
  }

  static azureAISearch(): OptionItem {
    return {
      id: "custom-copilot-rag-azureAISearch",
      label: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotRagAzureAISearchOption.label"
      ),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotRagAzureAISearchOption.detail"
      ),
    };
  }

  static customApi(): OptionItem {
    return {
      id: "custom-copilot-rag-customApi",
      label: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotRagCustomApiOption.label"
      ),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotRagCustomApiOption.detail"
      ),
      description: getLocalizedString("core.createProjectQuestion.option.description.preview"),
    };
  }

  static microsoft365(): OptionItem {
    return {
      id: "custom-copilot-rag-microsoft365",
      label: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotRagMicrosoft365Option.label"
      ),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotRagMicrosoft365Option.detail"
      ),
    };
  }
}

export class CustomCopilotAssistantOptions {
  static new(): OptionItem {
    return {
      id: "custom-copilot-agent-new",
      label: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotAssistantNewOption.label"
      ),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotAssistantNewOption.detail"
      ),
    };
  }

  static assistantsApi(): OptionItem {
    return {
      id: "custom-copilot-agent-assistants-api",
      label: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotAssistantAssistantsApiOption.label"
      ),
      detail: getLocalizedString(
        "core.createProjectQuestion.capability.customCopilotAssistantAssistantsApiOption.detail"
      ),
      description: getLocalizedString("core.createProjectQuestion.option.description.preview"),
    };
  }
}
