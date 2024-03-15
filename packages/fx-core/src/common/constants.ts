// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

export class ConstantString {
  static readonly UTF8Encoding = "utf-8";
  static readonly DeploymentResourceType = "Microsoft.Resources/deployments";
  static readonly DeploymentNotFound = "DeploymentNotFound";
  static readonly RootFolder = "TeamsApps";
}

export class HelpLinks {
  static readonly WhyNeedProvision = "https://aka.ms/teamsfx/whyneedprovision";
  static readonly ArmHelpLink = "https://aka.ms/teamsfx-arm-help";
  static readonly SwitchAccountOrSub = "https://aka.ms/teamsfx-switch-account-or-subscription-help";
  static readonly SwitchTenant = "https://aka.ms/teamsfx-switch-tenant";
}

export class VSCodeExtensionCommand {
  static readonly showOutputChannel = "command:fx-extension.showOutputChannel";
  static readonly openFolder = "command:fx-extension.openFolder";
  static readonly openReadme = "command:fx-extension.openReadMe?%5B%22Notification%22%5D";
}

export class TeamsClientId {
  static readonly MobileDesktop = "1fec8e78-bce4-4aaf-ab1b-5451cc387264";
  static readonly Web = "5e3ce6c0-2b1f-4285-8d4b-75ee78787346";
}

export class OfficeClientId {
  static readonly Desktop = "0ec893e0-5785-4de6-99da-4ed124e5296c";
  static readonly Web1 = "4345a7b9-9a63-4910-a426-35363201d503";
  static readonly Web2 = "4765445b-32c6-49b0-83e6-1d93765276ca";
}

export class OutlookClientId {
  static readonly Desktop = "d3590ed6-52b3-4102-aeff-aad2292ab01c";
  static readonly Web1 = "00000002-0000-0ff1-ce00-000000000000";
  static readonly Web2 = "bc59ab01-8403-45c6-8796-ac3ef710b3e3";
}
export class FeatureFlagName {
  static readonly BicepEnvCheckerEnable = "TEAMSFX_BICEP_ENV_CHECKER_ENABLE";
  // This will default to true and this environment is only for tests. It does not expose to user.
  static readonly InsiderPreview = "__TEAMSFX_INSIDER_PREVIEW";
  static readonly VSCallingCLI = "VS_CALLING_CLI";
  static readonly ExistingTabApp = "TEAMSFX_INIT_APP";
  static readonly AadManifest = "TEAMSFX_AAD_MANIFEST";
  static readonly DebugTemplate = "TEAMSFX_DEBUG_TEMPLATE";
  static readonly BotNotification = "BOT_NOTIFICATION_ENABLED";
  static readonly M365App = "TEAMSFX_M365_APP";
  static readonly ApiConnect = "TEAMSFX_API_CONNECT_ENABLE";
  static readonly DeployManifest = "TEAMSFX_DEPLOY_MANIFEST";
  static readonly Preview = "TEAMSFX_PREVIEW";
  static readonly CLIDotNet = "TEAMSFX_CLI_DOTNET";
  static readonly V3 = "TEAMSFX_V3";
  static readonly V3Migration = "TEAMSFX_V3_MIGRATION";
  static readonly VideoFilter = "TEAMSFX_VIDEO_FILTER";
  static readonly OfficeAddin = "TEAMSFX_OFFICE_ADDIN";
  static readonly OfficeXMLAddin = "TEAMSFX_OFFICE_XML_ADDIN";
  static readonly CopilotPlugin = "DEVELOP_COPILOT_PLUGIN";
  static readonly ApiCopilotPlugin = "API_COPILOT_PLUGIN";
  static readonly TeamsSampleConfigBranch = "TEAMSFX_SAMPLE_CONFIG_BRANCH";
  static readonly OfficeSampleConfigBranch = "TEAMSFX_OFFICE_SAMPLE_CONFIG_BRANCH";
  static readonly TestTool = "TEAMSFX_TEST_TOOL";
  static readonly ApiKey = "API_COPILOT_API_KEY";
  static readonly MultipleParameters = "API_COPILOT_MULTIPLE_PARAMETERS";
  static readonly TeamsFxRebranding = "TEAMSFX_REBRANDING";
  static readonly TdpTemplateCliTest = "TEAMSFX_TDP_TEMPLATE_CLI_TEST";
  static readonly AsyncAppValidation = "TEAMSFX_ASYNC_APP_VALIDATION";
  static readonly NewProjectType = "TEAMSFX_NEW_PROJECT_TYPE";
  static readonly ApiMeSSO = "API_ME_SSO";
}
