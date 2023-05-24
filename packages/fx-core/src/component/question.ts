// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  CLIPlatforms,
  ContextV3,
  DynamicPlatforms,
  err,
  FolderQuestion,
  FuncQuestion,
  FxError,
  Inputs,
  InputsWithProjectPath,
  Json,
  MultiSelectQuestion,
  ok,
  OptionItem,
  Platform,
  ProjectSettingsV3,
  QTreeNode,
  ResourceContextV3,
  Result,
  SingleSelectQuestion,
  Stage,
  TextInputQuestion,
  UserError,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import path from "path";
import { HelpLinks, ResourcePlugins } from "../common/constants";
import { isBotNotificationEnabled, isCLIDotNetEnabled } from "../common/featureFlags";
import { getDefaultString, getLocalizedString } from "../common/localizeUtils";
import { isVSProject } from "../common/projectSettingsHelper";
import { hasAzureResourceV3 } from "../common/projectSettingsHelperV3";
import { NoCapabilityFoundError } from "../core/error";
import {
  CoreQuestionNames,
  selectM365HostQuestion,
  selectTeamsAppManifestQuestion,
  selectTeamsAppPackageQuestion,
} from "../core/question";
import {
  AzureResourceApim,
  AzureResourceApimNewUI,
  AzureResourceFunction,
  AzureResourceFunctionNewUI,
  AzureResourceKeyVault,
  AzureResourceKeyVaultNewUI,
  AzureResourceSQL,
  AzureResourceSQLNewUI,
  AzureSolutionQuestionNames,
  BotOptionItem,
  BuiltInFeaturePluginNames,
  CommandAndResponseOptionItem,
  ComponentNames,
  GLOBAL_CONFIG,
  MessageExtensionItem,
  NotificationOptionItem,
  Runtime,
  SOLUTION_PROVISION_SUCCEEDED,
  SPFxQuestionNames,
  TabOptionItem,
  validateAppPackageOption,
  validateSchemaOption,
} from "./constants";
import {
  createHostTypeTriggerQuestion,
  getConditionOfNotificationTriggerQuestion,
  showNotificationTriggerCondition,
} from "./feature/bot/question";
import { ComponentName2pluginName } from "./migrate";
import { Constants } from "./resource/aadApp/constants";
import { getQuestionsForDeployAPIM } from "./resource/apim/apim";
import { Constants as Constants1 } from "./resource/appManifest/constants";
import { buildQuestionNode } from "./resource/azureSql/questions";
import { webpartNameQuestion } from "./resource/spfx/utils/questions";

export async function getQuestionsForProvisionV3(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  if (inputs.platform === Platform.CLI_HELP) {
    const node = new QTreeNode({ type: "group" });
    node.addChild(new QTreeNode(AskSubscriptionQuestion));
    node.addChild(buildQuestionNode());
    return ok(node);
  } else {
    // const node = new QTreeNode({ type: "group" });
    // if (hasAzureResourceV3(context.projectSetting as ProjectSettingsV3)) {
    //   node.addChild(new QTreeNode(AskSubscriptionQuestion));
    // }
    // return ok(node);
    return ok(undefined);
  }
}

export async function getQuestionsForDeployV3(
  ctx: ContextV3,
  inputs: Inputs,
  envInfo?: v3.EnvInfoV3
): Promise<Result<QTreeNode | undefined, FxError>> {
  //VS project has no selection interaction, and will deploy all selectable components by default.
  if (isVSProject(ctx.projectSetting)) {
    return ok(undefined);
  }
  if (inputs.platform === Platform.VSCode && inputs[Constants.INCLUDE_AAD_MANIFEST] === "yes") {
    return ok(undefined);
  }
  const isDynamicQuestion = DynamicPlatforms.includes(inputs.platform);
  const projectSetting = ctx.projectSetting as ProjectSettingsV3;
  const deployableComponents = [
    ComponentNames.TeamsTab,
    ComponentNames.TeamsBot,
    ComponentNames.TeamsApi,
    ComponentNames.APIM,
    ComponentNames.AppManifest,
  ];
  const componentDisplayNames = {
    [ComponentNames.TeamsTab]: "NodeJS Tab frontend",
    [ComponentNames.TeamsBot]: "Bot",
    [ComponentNames.TeamsApi]: "Azure Function",
    [ComponentNames.APIM]: "API Management",
    [ComponentNames.AppManifest]: "App Studio",
    [ComponentNames.AadApp]: "AAD",
  };

  if (CLIPlatforms.includes(inputs.platform)) {
    deployableComponents.push(ComponentNames.AadApp);
  }

  let selectableComponents: string[];
  if (!isDynamicQuestion) {
    selectableComponents = deployableComponents;
  } else {
    const hasAzureResource = hasAzureResourceV3(projectSetting);
    const provisioned = checkWetherProvisionSucceeded(envInfo!.state);
    if (hasAzureResource && !provisioned) {
      return err(
        new UserError({
          source: "Solution",
          name: "CannotDeployBeforeProvision",
          message: getDefaultString("core.deploy.FailedToDeployBeforeProvision"),
          displayMessage: getLocalizedString("core.deploy.FailedToDeployBeforeProvision"),
          helpLink: HelpLinks.WhyNeedProvision,
        })
      );
    }
    selectableComponents = projectSetting.components
      .filter((component) => component.deploy && deployableComponents.includes(component.name))
      .map((component) => component.name) as string[];
    if (CLIPlatforms.includes(inputs.platform)) {
      selectableComponents.push(ComponentNames.AppManifest);
    }
  }
  const options = selectableComponents.map((c) => {
    const pluginName = ComponentName2pluginName(c);
    const item: OptionItem = {
      id: pluginName,
      label: componentDisplayNames[c],
      cliName: getPluginCLIName(pluginName),
    };
    return item;
  });
  if (options.length === 0) {
    return err(new NoCapabilityFoundError(Stage.deploy));
  }
  const selectQuestion = DeployPluginSelectQuestion;
  selectQuestion.staticOptions = options;
  selectQuestion.default = options.map((i) => i.id);
  const node = new QTreeNode(selectQuestion);
  if (selectableComponents.includes(ComponentNames.APIM)) {
    const resourceContext = ctx as ContextV3;
    resourceContext.envInfo = envInfo;
    resourceContext.tokenProvider = ctx.tokenProvider;
    const apimDeployNodeRes = await getQuestionsForDeployAPIM(
      resourceContext as ResourceContextV3,
      inputs as InputsWithProjectPath
    );
    if (apimDeployNodeRes.isErr()) return err(apimDeployNodeRes.error);
    if (apimDeployNodeRes.value) {
      const apimNode = apimDeployNodeRes.value;
      apimNode.condition = { contains: BuiltInFeaturePluginNames.apim };
      node.addChild(apimNode);
    }
  }
  if (selectableComponents.includes(ComponentNames.AadApp)) {
    const aadNode = new QTreeNode({
      name: Constants.INCLUDE_AAD_MANIFEST,
      type: "singleSelect",
      staticOptions: ["yes", "no"],
      title: getLocalizedString("core.aad.includeAadQuestionTitle"),
      default: "no",
    });
    node.addChild(aadNode);
    if (CLIPlatforms.includes(inputs.platform)) {
      // this question only works on CLI.
      const aadManifestFilePathNode = new QTreeNode({
        name: Constants.AAD_MANIFEST_FILE,
        type: "singleFile",
        title: getLocalizedString("core.aad.aadManifestFilePath"),
        default: "",
      });
      node.addChild(aadManifestFilePathNode);
    }
  }
  if (selectableComponents.includes(ComponentNames.AppManifest)) {
    const appManifestNode = new QTreeNode({
      name: Constants1.INCLUDE_APP_MANIFEST,
      type: "singleSelect",
      staticOptions: ["yes", "no"],
      title: getLocalizedString("plugins.appstudio.whetherToDeployManifest"),
      default: "no",
    });
    node.addChild(appManifestNode);
  }
  return ok(node);
}
export function checkWetherProvisionSucceeded(config: Json): boolean {
  return config[GLOBAL_CONFIG] && config[GLOBAL_CONFIG][SOLUTION_PROVISION_SUCCEEDED];
}

export enum FeatureId {
  Tab = "Tab",
  TabNonSso = "TabNonSso",
  TabSPFx = "TabSPFx",
  Notification = "Notification",
  CommandAndResponse = "command-bot",
  Workflow = "workflow-bot",
  Bot = "Bot",
  MessagingExtension = "MessagingExtension",
  function = "function",
  apim = "apim",
  sql = "sql",
  keyvault = "keyvault",
  sso = "sso",
  ApiConnector = "api-connection",
  cicd = "cicd",
  M365SearchApp = "M365SearchApp",
  M365SsoLaunchPage = "M365SsoLaunchPage",
}

export const FeatureIdToComponent = {
  [FeatureId.Tab]: ComponentNames.TeamsTab,
  [FeatureId.TabNonSso]: ComponentNames.TeamsTab,
  [FeatureId.TabSPFx]: ComponentNames.SPFxTab,
  [FeatureId.M365SsoLaunchPage]: ComponentNames.TeamsTab,
  [FeatureId.Notification]: ComponentNames.TeamsBot,
  [FeatureId.CommandAndResponse]: ComponentNames.TeamsBot,
  [FeatureId.Workflow]: ComponentNames.TeamsBot,
  [FeatureId.Bot]: ComponentNames.TeamsBot,
  [FeatureId.M365SearchApp]: ComponentNames.TeamsBot,
  [FeatureId.MessagingExtension]: ComponentNames.TeamsBot,
  [FeatureId.function]: ComponentNames.TeamsApi,
  [FeatureId.apim]: ComponentNames.APIMFeature,
  [FeatureId.sql]: ComponentNames.AzureSQL,
  [FeatureId.keyvault]: ComponentNames.KeyVault,
  [FeatureId.sso]: ComponentNames.SSO,
  [FeatureId.ApiConnector]: ComponentNames.ApiConnector,
  [FeatureId.cicd]: ComponentNames.CICD,
};

export function getActionNameByFeatureId(featureId: FeatureId): string | undefined {
  const component = FeatureIdToComponent[featureId];
  if (component) {
    return `${component}.add`;
  }
}

export async function getNotificationTriggerQuestionNode(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const res = new QTreeNode({
    type: "group",
  });
  if (isCLIDotNetEnabled()) {
    Object.values(Runtime).forEach((runtime) => {
      const node = new QTreeNode(createHostTypeTriggerQuestion(inputs.platform, runtime));
      node.condition = getConditionOfNotificationTriggerQuestion(runtime);
      res.addChild(node);
    });
  } else {
    const runtime = getPlatformRuntime(inputs.platform);
    const node = new QTreeNode(createHostTypeTriggerQuestion(inputs.platform, runtime));
    res.addChild(node);
  }
  res.condition = showNotificationTriggerCondition;
  return ok(res);
}

export function getPluginCLIName(name: string): string {
  const pluginPrefix = "fx-resource-";
  if (name === ResourcePlugins.Aad) {
    return "aad-manifest";
  } else if (name === ResourcePlugins.AppStudio) {
    return "manifest";
  } else {
    return name.replace(pluginPrefix, "");
  }
}

const PlatformRuntimeMap: Map<Platform, Runtime> = new Map<Platform, Runtime>([
  [Platform.VS, Runtime.dotnet],
  [Platform.VSCode, Runtime.nodejs],
  [Platform.CLI, Runtime.nodejs],
  [Platform.CLI_HELP, Runtime.nodejs],
]);

function getKeyNotFoundInMapErrorMsg(key: any) {
  return `The key ${key} is not found in map.`;
}

export function getPlatformRuntime(platform: Platform): Runtime {
  const runtime = PlatformRuntimeMap.get(platform);
  if (runtime) {
    return runtime;
  }
  throw new Error(getKeyNotFoundInMapErrorMsg(platform));
}

export function createAddAzureResourceQuestion(
  alreadyHaveFunction: boolean,
  alreadyHaveSQL: boolean,
  alreadyHaveAPIM: boolean,
  alreadyHaveKeyVault: boolean
): MultiSelectQuestion {
  const options: OptionItem[] = [AzureResourceFunction, AzureResourceSQL];
  if (!alreadyHaveAPIM) options.push(AzureResourceApim);
  if (!alreadyHaveKeyVault) options.push(AzureResourceKeyVault);
  return {
    name: AzureSolutionQuestionNames.AddResources,
    title: "Cloud resources",
    type: "multiSelect",
    staticOptions: options,
    default: [],
    onDidChangeSelection: async function (
      currentSelectedIds: Set<string>,
      previousSelectedIds: Set<string>
    ): Promise<Set<string>> {
      const hasSQL = currentSelectedIds.has(AzureResourceSQL.id);
      const hasAPIM = currentSelectedIds.has(AzureResourceApim.id);
      if ((hasSQL || hasAPIM) && !alreadyHaveFunction) {
        currentSelectedIds.add(AzureResourceFunction.id);
      }
      return currentSelectedIds;
    },
  };
}

export function createAddCloudResourceOptions(
  alreadyHaveAPIM: boolean,
  alreadyHaveKeyVault: boolean
): OptionItem[] {
  const options: OptionItem[] = [AzureResourceFunctionNewUI];
  if (!alreadyHaveAPIM) options.push(AzureResourceApimNewUI);
  options.push(AzureResourceSQLNewUI);
  if (!alreadyHaveKeyVault) options.push(AzureResourceKeyVaultNewUI);
  return options;
}

export function addCapabilityQuestion(
  alreadyHaveTab: boolean,
  alreadyHaveBot: boolean
): MultiSelectQuestion {
  const options: OptionItem[] = [];
  if (!alreadyHaveTab) options.push(TabOptionItem());
  if (!alreadyHaveBot) {
    options.push(BotOptionItem());
    options.push(MessageExtensionItem());
    options.push(NotificationOptionItem());
    options.push(CommandAndResponseOptionItem());
  }
  return {
    name: AzureSolutionQuestionNames.Capabilities,
    title: isBotNotificationEnabled()
      ? getLocalizedString("core.addCapabilityQuestion.titleNew")
      : getLocalizedString("core.addCapabilityQuestion.title"),
    type: "multiSelect",
    staticOptions: options,
    default: [],
  };
}

export const DeployPluginSelectQuestion: MultiSelectQuestion = {
  name: AzureSolutionQuestionNames.PluginSelectionDeploy,
  title: `Select resources`,
  type: "multiSelect",
  skipSingleOption: true,
  staticOptions: [],
  default: [],
};

export const AskSubscriptionQuestion: FuncQuestion = {
  name: AzureSolutionQuestionNames.AskSub,
  type: "func",
  func: async (inputs: Inputs): Promise<Void> => {
    return ok(Void);
  },
};

export function getUserEmailQuestion(currentUserEmail: string): TextInputQuestion {
  let defaultUserEmail = "";
  if (currentUserEmail && currentUserEmail.indexOf("@") > 0) {
    defaultUserEmail = "[UserName]@" + currentUserEmail.split("@")[1];
  }
  return {
    name: "email",
    type: "text",
    title: getLocalizedString("core.getUserEmailQuestion.title"),
    default: defaultUserEmail,
    validation: {
      validFunc: (input: string, previousInputs?: Inputs): string | undefined => {
        if (!input || input.trim() === "") {
          return getLocalizedString("core.getUserEmailQuestion.validation1");
        }

        input = input.trim();

        if (input === defaultUserEmail) {
          return getLocalizedString("core.getUserEmailQuestion.validation2");
        }

        const re = /\S+@\S+\.\S+/;
        if (!re.test(input)) {
          return getLocalizedString("core.getUserEmailQuestion.validation3");
        }
        return undefined;
      },
    },
  };
}

export function SelectEnvQuestion(): SingleSelectQuestion {
  return {
    type: "singleSelect",
    name: "env",
    title: getLocalizedString("core.QuestionSelectTargetEnvironment.title"),
    staticOptions: [],
    skipSingleOption: true,
    forgetLastValue: true,
  };
}

export function spfxFolderQuestion(): FolderQuestion {
  return {
    type: "folder",
    name: SPFxQuestionNames.SPFxFolder,
    title: getLocalizedString("core.spfxFolder.title"),
    placeholder: getLocalizedString("core.spfxFolder.placeholder"),
    default: (inputs: Inputs) => {
      return path.join(inputs.projectPath!, "src");
    },
  };
}

export function getQuestionsForAddWebpart(inputs: Inputs): Result<QTreeNode | undefined, FxError> {
  const addWebpart = new QTreeNode({ type: "group" });

  const spfxFolder = new QTreeNode(spfxFolderQuestion());
  addWebpart.addChild(spfxFolder);

  const webpartName = new QTreeNode(webpartNameQuestion);
  spfxFolder.addChild(webpartName);

  const manifestFile = selectTeamsAppManifestQuestion(inputs);
  webpartName.addChild(manifestFile);

  const localManifestFile = selectTeamsAppManifestQuestion(inputs, true);
  manifestFile.addChild(localManifestFile);

  return ok(addWebpart);
}

export async function getQuestionsForValidateMethod(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const group = new QTreeNode({ type: "group" });
  const question: SingleSelectQuestion = {
    name: CoreQuestionNames.ValidateMethod,
    title: getLocalizedString("core.selectValidateMethodQuestion.validate.selectTitle"),
    staticOptions: [validateSchemaOption, validateAppPackageOption],
    type: "singleSelect",
  };
  const node = new QTreeNode(question);
  group.addChild(node);
  return ok(group);
}

export async function getQuestionsForValidateManifest(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const group = new QTreeNode({ type: "group" });
  // Manifest path node
  const teamsAppSelectNode = selectTeamsAppManifestQuestion(inputs);
  group.addChild(teamsAppSelectNode);
  return ok(group);
}

export async function getQuestionsForValidateAppPackage(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const group = new QTreeNode({ type: "group" });
  // App package path node
  const teamsAppSelectNode = new QTreeNode(selectTeamsAppPackageQuestion());
  group.addChild(teamsAppSelectNode);
  return ok(group);
}

export async function getQuestionsForCreateAppPackage(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const group = new QTreeNode({ type: "group" });
  // Manifest path node
  const teamsAppSelectNode = selectTeamsAppManifestQuestion(inputs);
  group.addChild(teamsAppSelectNode);
  return ok(group);
}

export async function getQuestionsForUpdateTeamsApp(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const group = new QTreeNode({ type: "group" });
  // Manifest path node
  const teamsAppSelectNode = selectTeamsAppManifestQuestion(inputs);
  group.addChild(teamsAppSelectNode);
  return ok(group);
}

export async function getQuestionsForPreviewWithManifest(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const group = new QTreeNode({ type: "group" });
  group.addChild(selectM365HostQuestion());
  group.addChild(selectTeamsAppManifestQuestion(inputs));
  return ok(group);
}
