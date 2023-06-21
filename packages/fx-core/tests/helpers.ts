import { environmentManager } from "../src/core/environment";

export function newEnvInfoV3(envName?: string, config?: any, state?: any): any {
  return {
    envName: envName ?? environmentManager.getDefaultEnvName(),
    config: config ?? {
      manifest: {
        appName: {
          short: "teamsfx_app",
        },
        description: {
          short: `Short description of teamsfx_app`,
          full: `Full description of teamsfx_app`,
        },
        icons: {
          color: "resources/color.png",
          outline: "resources/outline.png",
        },
      },
    },
    state: state ?? { solution: {} },
  };
}
