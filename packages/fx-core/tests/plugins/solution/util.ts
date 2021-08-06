import { FxError, ok, PluginContext, Result, Void, Plugin } from "@microsoft/teamsfx-api";

export const validManifest = {
  $schema:
    "https://developer.microsoft.com/en-us/json-schemas/teams/v1.9/MicrosoftTeams.schema.json",
  manifestVersion: "1.9",
  version: "1.0.0",
  id: "{appid}",
  packageName: "com.microsoft.teams.extension",
  developer: {
    name: "Teams App, Inc.",
    websiteUrl: "{baseUrl}",
    privacyUrl: "{baseUrl}/index.html#/privacy",
    termsOfUseUrl: "{baseUrl}/index.html#/termsofuse",
  },
  icons: {
    color: "color.png",
    outline: "outline.png",
  },
  name: {
    short: "MyApp",
    full: "This field is not used",
  },
  description: {
    short: "Short description of {appName}.",
    full: "Full description of {appName}.",
  },
  accentColor: "#FFFFFF",
  bots: [],
  composeExtensions: [],
  configurableTabs: [],
  staticTabs: [],
  permissions: ["identity", "messageTeamMembers"],
  validDomains: [],
  webApplicationInfo: {
    id: "{appClientId}",
    resource: "{webApplicationInfoResource}",
  },
};

export function mockPublishThatAlwaysSucceed(plugin: Plugin) {
  plugin.publish = async function (_ctx: PluginContext): Promise<Result<any, FxError>> {
    return ok(Void);
  };
}

export const mockedFehostScaffoldArmResult = {
  Modules: {
    frontendHostingProvision: {
      Content: "Mocked frontend hosting provision module content",
    },
  },
  Orchestration: {
    ParameterTemplate: {
      Content: "Mocked frontend hosting parameter content",
      ParameterJson: { FrontendParameter: "FrontendParameterValue" },
    },
    VariableTemplate: {
      Content: "Mocked frontend hosting variable content",
    },
    ModuleTemplate: {
      Content:
        "Mocked frontend hosting module content. Module path: {{PluginOutput.fx-resource-frontend-hosting.Modules.frontendHostingProvision.Path}}. Variable: {{PluginOutput.fx-resource-simple-auth.Outputs.endpoint}}",
      Outputs: {
        endpoint: "Mocked frontend hosting endpoint",
      },
    },
    OutputTemplate: {
      Content: "Mocked frontend hosting output content",
    },
  },
};

export const mockedSimpleAuthScaffoldArmResult = {
  Modules: {
    simpleAuthProvision: {
      Content: "Mocked simple auth provision module content",
    },
  },
  Orchestration: {
    ParameterTemplate: {
      Content: "Mocked simple auth parameter content",
      ParameterJson: { SimpleAuthParameter: "SimpleAuthParameterValue" },
    },
    VariableTemplate: {
      Content: "Mocked simple auth variable content",
    },
    ModuleTemplate: {
      Content:
        "Mocked simple auth module content. Module path: {{PluginOutput.fx-resource-simple-auth.Modules.simpleAuthProvision.Path}}. Variable: {{PluginOutput.fx-resource-frontend-hosting.Outputs.endpoint}}",
      Outputs: {
        endpoint: "Mocked simple auth endpoint",
      },
    },
    OutputTemplate: {
      Content: "Mocked simple auth output content",
    },
  },
};

export const mockedAadScaffoldArmResult = {
  Orchestration: {},
};
