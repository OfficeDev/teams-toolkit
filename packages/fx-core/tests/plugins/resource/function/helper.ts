import path from "path";
import { newEnvInfo } from "../../../../src";
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
    projectSettings: {
      appName: "ut",
      programmingLanguage: "javascript",
    },
    config: new Map(),
    root: path.join(__dirname, "ut"),
  };
}
