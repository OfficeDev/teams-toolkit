// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as os from "os";
import { LaunchBrowser, LaunchUrl } from "../constants";
import { TaskOverallLabel } from "../../../common/local/constants";

export function generateConfigurations(
  includeFrontend: boolean,
  includeBackend: boolean,
  includeBot: boolean
): Record<string, unknown>[] {
  let edgeOrder = 2,
    chromeOrder = 1;
  if (os.type() === "Windows_NT") {
    edgeOrder = 1;
    chromeOrder = 2;
  }

  const launchConfigurations: Record<string, unknown>[] = [
    launchRemote(LaunchBrowser.edge, "Edge", edgeOrder),
    launchRemote(LaunchBrowser.chrome, "Chrome", chromeOrder),
  ];

  if (includeFrontend) {
    launchConfigurations.push(
      startAndAttachToFrontend(LaunchBrowser.edge, "Edge", includeBackend, includeBot)
    );
    launchConfigurations.push(
      startAndAttachToFrontend(LaunchBrowser.chrome, "Chrome", includeBackend, includeBot)
    );
  } else if (includeBot) {
    launchConfigurations.push(launchBot(LaunchBrowser.edge, "Edge", includeBackend));
    launchConfigurations.push(launchBot(LaunchBrowser.chrome, "Chrome", includeBackend));
  }

  if (includeBot) {
    launchConfigurations.push(attachToBot());
  }

  if (includeBackend) {
    launchConfigurations.push(attachToBackend());
  }

  return launchConfigurations;
}

export function generateCompounds(
  includeFrontend: boolean,
  includeBackend: boolean,
  includeBot: boolean
): Record<string, unknown>[] {
  const launchCompounds: Record<string, unknown>[] = [];
  let edgeOrder = 2,
    chromeOrder = 1;
  if (os.type() === "Windows_NT") {
    edgeOrder = 1;
    chromeOrder = 2;
  }

  launchCompounds.push(debug(includeFrontend, includeBackend, includeBot, "Edge", edgeOrder));
  launchCompounds.push(debug(includeFrontend, includeBackend, includeBot, "Chrome", chromeOrder));

  return launchCompounds;
}

export function generateSpfxConfigurations(): Record<string, unknown>[] {
  let edgeOrder = 2,
    chromeOrder = 1;
  if (os.type() === "Windows_NT") {
    edgeOrder = 1;
    chromeOrder = 2;
  }

  const configurations: Record<string, unknown>[] = [
    {
      name: "Hosted workbench (Edge)",
      type: LaunchBrowser.edge,
      request: "launch",
      url: "https://enter-your-SharePoint-site/_layouts/workbench.aspx",
      webRoot: "${workspaceRoot}/SPFx",
      sourceMaps: true,
      sourceMapPathOverrides: {
        "webpack:///.././src/*": "${webRoot}/src/*",
        "webpack:///../../../src/*": "${webRoot}/src/*",
        "webpack:///../../../../src/*": "${webRoot}/src/*",
        "webpack:///../../../../../src/*": "${webRoot}/src/*",
      },
      runtimeArgs: ["--remote-debugging-port=9222", "-incognito"],
      preLaunchTask: "gulp serve",
      postDebugTask: "Terminate All Tasks",
      presentation: {
        group: "remote",
        order: edgeOrder,
      },
    },
    {
      name: "Hosted workbench (Chrome)",
      type: LaunchBrowser.chrome,
      request: "launch",
      url: "https://enter-your-SharePoint-site/_layouts/workbench.aspx",
      webRoot: "${workspaceRoot}/SPFx",
      sourceMaps: true,
      sourceMapPathOverrides: {
        "webpack:///.././src/*": "${webRoot}/src/*",
        "webpack:///../../../src/*": "${webRoot}/src/*",
        "webpack:///../../../../src/*": "${webRoot}/src/*",
        "webpack:///../../../../../src/*": "${webRoot}/src/*",
      },
      runtimeArgs: ["--remote-debugging-port=9222", "-incognito"],
      preLaunchTask: "gulp serve",
      postDebugTask: "Terminate All Tasks",
      presentation: {
        group: "remote",
        order: chromeOrder,
      },
    },
    {
      name: "Start Teams workbench (Edge)",
      type: "pwa-msedge",
      request: "launch",
      url: LaunchUrl.teamsLocal,
      webRoot: "${workspaceRoot}/SPFx",
      sourceMaps: true,
      sourceMapPathOverrides: {
        "webpack:///.././src/*": "${webRoot}/src/*",
        "webpack:///../../../src/*": "${webRoot}/src/*",
        "webpack:///../../../../src/*": "${webRoot}/src/*",
        "webpack:///../../../../../src/*": "${webRoot}/src/*",
      },
      postDebugTask: "Terminate All Tasks",
      presentation: {
        hidden: true,
      },
      internalConsoleOptions: "neverOpen",
    },
    {
      name: "Start Teams workbench (Chrome)",
      type: "pwa-chrome",
      request: "launch",
      url: LaunchUrl.teamsLocal,
      webRoot: "${workspaceRoot}/SPFx",
      sourceMaps: true,
      sourceMapPathOverrides: {
        "webpack:///.././src/*": "${webRoot}/src/*",
        "webpack:///../../../src/*": "${webRoot}/src/*",
        "webpack:///../../../../src/*": "${webRoot}/src/*",
        "webpack:///../../../../../src/*": "${webRoot}/src/*",
      },
      postDebugTask: "Terminate All Tasks",
      presentation: {
        hidden: true,
      },
      internalConsoleOptions: "neverOpen",
    },
    {
      name: "Attach to Frontend in Outlook (Edge)",
      type: "pwa-msedge",
      request: "launch",
      url: LaunchUrl.outlookLocalTab,
      webRoot: "${workspaceRoot}/SPFx",
      sourceMaps: true,
      sourceMapPathOverrides: {
        "webpack:///.././src/*": "${webRoot}/src/*",
        "webpack:///../../../src/*": "${webRoot}/src/*",
        "webpack:///../../../../src/*": "${webRoot}/src/*",
        "webpack:///../../../../../src/*": "${webRoot}/src/*",
      },
      postDebugTask: "Terminate All Tasks",
      presentation: {
        group: "all",
        hidden: true,
      },
      internalConsoleOptions: "neverOpen",
    },
    {
      name: "Attach to Frontend in Outlook (Chrome)",
      type: "pwa-chrome",
      request: "launch",
      url: LaunchUrl.outlookLocalTab,
      webRoot: "${workspaceRoot}/SPFx",
      sourceMaps: true,
      sourceMapPathOverrides: {
        "webpack:///.././src/*": "${webRoot}/src/*",
        "webpack:///../../../src/*": "${webRoot}/src/*",
        "webpack:///../../../../src/*": "${webRoot}/src/*",
        "webpack:///../../../../../src/*": "${webRoot}/src/*",
      },
      postDebugTask: "Terminate All Tasks",
      presentation: {
        group: "all",
        hidden: true,
      },
      internalConsoleOptions: "neverOpen",
    },
    {
      name: "Attach to Frontend in the Microsoft 365 app (Edge)",
      type: "pwa-msedge",
      request: "launch",
      url: LaunchUrl.officeLocalTab,
      webRoot: "${workspaceRoot}/SPFx",
      sourceMaps: true,
      sourceMapPathOverrides: {
        "webpack:///.././src/*": "${webRoot}/src/*",
        "webpack:///../../../src/*": "${webRoot}/src/*",
        "webpack:///../../../../src/*": "${webRoot}/src/*",
        "webpack:///../../../../../src/*": "${webRoot}/src/*",
      },
      postDebugTask: "Terminate All Tasks",
      presentation: {
        group: "all",
        hidden: true,
      },
      internalConsoleOptions: "neverOpen",
    },
    {
      name: "Attach to Frontend in the Microsoft 365 app (Chrome)",
      type: "pwa-chrome",
      request: "launch",
      url: LaunchUrl.officeLocalTab,
      webRoot: "${workspaceRoot}/SPFx",
      sourceMaps: true,
      sourceMapPathOverrides: {
        "webpack:///.././src/*": "${webRoot}/src/*",
        "webpack:///../../../src/*": "${webRoot}/src/*",
        "webpack:///../../../../src/*": "${webRoot}/src/*",
        "webpack:///../../../../../src/*": "${webRoot}/src/*",
      },
      postDebugTask: "Terminate All Tasks",
      presentation: {
        group: "all",
        hidden: true,
      },
      internalConsoleOptions: "neverOpen",
    },
  ];
  return configurations;
}

export function generateSpfxCompounds(): Record<string, unknown>[] {
  const launchCompounds: Record<string, unknown>[] = [];
  let edgeOrder = 2,
    chromeOrder = 1;
  if (os.type() === "Windows_NT") {
    edgeOrder = 1;
    chromeOrder = 2;
  }
  launchCompounds.push(
    {
      name: "Teams workbench (Edge)",
      configurations: ["Start Teams workbench (Edge)"],
      preLaunchTask: TaskOverallLabel.TransparentDefault,
      presentation: {
        group: "group1: Teams",
        order: edgeOrder,
      },
      stopAll: true,
    },
    {
      name: "Teams workbench (Chrome)",
      configurations: ["Start Teams workbench (Chrome)"],
      preLaunchTask: TaskOverallLabel.TransparentDefault,
      presentation: {
        group: "group1: Teams",
        order: chromeOrder,
      },
      stopAll: true,
    },
    {
      name: "Outlook workbench (Edge)",
      configurations: ["Attach to Frontend in Outlook (Edge)"],
      preLaunchTask: TaskOverallLabel.TransparentM365,
      presentation: {
        group: "group2: Outlook",
        order: edgeOrder + 2,
      },
      stopAll: true,
    },
    {
      name: "Outlook workbench (Chrome)",
      configurations: ["Attach to Frontend in Outlook (Chrome)"],
      preLaunchTask: TaskOverallLabel.TransparentM365,
      presentation: {
        group: "group2: Outlook",
        order: chromeOrder + 2,
      },
      stopAll: true,
    },
    {
      name: "The Microsoft 365 app workbench (Edge)",
      configurations: ["Attach to Frontend in the Microsoft 365 app (Edge)"],
      preLaunchTask: TaskOverallLabel.TransparentM365,
      presentation: {
        group: "group3: the Microsoft 365 app",
        order: edgeOrder + 4,
      },
      stopAll: true,
    },
    {
      name: "The Microsoft 365 app workbench (Chrome)",
      configurations: ["Attach to Frontend in the Microsoft 365 app (Chrome)"],
      preLaunchTask: TaskOverallLabel.TransparentM365,
      presentation: {
        group: "group3: the Microsoft 365 app",
        order: chromeOrder + 4,
      },
      stopAll: true,
    }
  );
  return launchCompounds;
}

function launchRemote(
  browserType: string,
  browserName: string,
  order: number
): Record<string, unknown> {
  return {
    name: `Launch Remote (${browserName})`,
    type: browserType,
    request: "launch",
    url: "https://teams.microsoft.com/l/app/${teamsAppId}?installAppPackage=true&webjoin=true&${account-hint}",
    presentation: {
      group: "remote",
      order: order,
    },
    internalConsoleOptions: "neverOpen",
  };
}

function startAndAttachToFrontend(
  browserType: string,
  browserName: string,
  includeBackend: boolean,
  includeBot: boolean
): Record<string, unknown> {
  const cascadeTerminateToConfigurations = [];
  if (includeBackend) {
    cascadeTerminateToConfigurations.push("Attach to Backend");
  }
  if (includeBot) {
    cascadeTerminateToConfigurations.push("Attach to Bot");
  }
  return {
    name: `Start and Attach to Frontend (${browserName})`,
    type: browserType,
    request: "launch",
    url: "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&webjoin=true&${account-hint}",
    preLaunchTask: "Start Frontend",
    cascadeTerminateToConfigurations,
    presentation: {
      group: "all",
      hidden: true,
    },
    internalConsoleOptions: "neverOpen",
  };
}

function launchBot(
  browserType: string,
  browserName: string,
  includeBackend: boolean
): Record<string, unknown> {
  const cascadeTerminateToConfigurations = ["Attach to Bot"];
  if (includeBackend) {
    cascadeTerminateToConfigurations.push("Attach to Backend");
  }
  return {
    name: `Launch Bot (${browserName})`,
    type: browserType,
    request: "launch",
    url: "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&webjoin=true&${account-hint}",
    cascadeTerminateToConfigurations,
    presentation: {
      group: "all",
      hidden: true,
    },
    internalConsoleOptions: "neverOpen",
  };
}

function attachToBot(): Record<string, unknown> {
  return {
    name: "Start and Attach to Bot",
    type: "pwa-node",
    request: "attach",
    port: 9239,
    restart: true,
    preLaunchTask: "Start Bot",
    presentation: {
      group: "all",
      hidden: true,
    },
    internalConsoleOptions: "neverOpen",
  };
}

function attachToBackend(): Record<string, unknown> {
  return {
    name: "Start and Attach to Backend",
    type: "pwa-node",
    request: "attach",
    port: 9229,
    restart: true,
    preLaunchTask: "Start Backend",
    presentation: {
      group: "all",
      hidden: true,
    },
    internalConsoleOptions: "neverOpen",
  };
}

function debug(
  includeFrontend: boolean,
  includeBackend: boolean,
  includeBot: boolean,
  browserName: string,
  order: number
): Record<string, unknown> {
  const configurations: string[] = [];
  if (includeFrontend) {
    configurations.push(`Start and Attach to Frontend (${browserName})`);
  } else if (includeBot) {
    configurations.push(`Launch Bot (${browserName})`);
  }
  if (includeBot) {
    configurations.push("Start and Attach to Bot");
  }
  if (includeBackend) {
    configurations.push("Start and Attach to Backend");
  }
  return {
    name: `Debug (${browserName})`,
    configurations,
    preLaunchTask: "Pre Debug Check",
    presentation: {
      group: "all",
      order: order,
    },
    stopAll: true,
  };
}
