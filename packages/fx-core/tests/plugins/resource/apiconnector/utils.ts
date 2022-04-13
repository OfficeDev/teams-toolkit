import path from "path";
import { newEnvInfo } from "../../../../src";
import {
  BasicAuthConfig,
  AADAuthConfig,
} from "../../../../src/plugins/resource/apiconnector/config";
import { AuthType } from "../../../../src/plugins/resource/apiconnector/constants";
import { DependentPluginInfo } from "../../../../src/plugins/resource/function/constants";

export function MockContext(): any {
  return {
    envInfo: newEnvInfo(
      undefined,
      undefined,
      new Map<string, Map<string, string>>([
        [
          DependentPluginInfo.solutionPluginName,
          new Map<string, string>([
            [DependentPluginInfo.resourceGroupName, "ut"],
            [DependentPluginInfo.subscriptionId, "ut"],
            [DependentPluginInfo.resourceNameSuffix, "ut"],
          ]),
        ],
      ])
    ),
    app: {
      name: {
        short: "ut",
      },
    },
    projectSetting: {
      appName: "ut",
      programmingLanguage: "javascript",
    },
    config: new Map(),
    root: path.join(__dirname, "ut"),
  };
}

export const SampleCodeCases = [
  {
    AuthConfig: {
      AuthType: AuthType.BASIC,
      UserName: "fake_api_user_name",
    } as BasicAuthConfig,
    FileName: "basic",
  },
  {
    AuthConfig: {
      AuthType: AuthType.AAD,
      ReuseTeamsApp: true,
    } as AADAuthConfig,
    FileName: "aad",
  },
  {
    AuthConfig: {
      AuthType: AuthType.AAD,
      ReuseTeamsApp: false,
      TenantId: "fake_tenant_id",
      ClientId: "fake_client_id",
    } as AADAuthConfig,
    FileName: "aad-existing-app",
  },
  {
    AuthConfig: {
      AuthType: AuthType.CUSTOM,
    },
    FileName: "custom",
  },
];
