// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as os from "os";
import { LaunchBrowser } from "../constants";

export function generateConfigurations(
  includeFrontend: boolean,
  includeBackend: boolean,
  includeBot: boolean,
  isMigrateFromV1: boolean
): Record<string, unknown>[] {
  let edgeOrder = 2,
    chromeOrder = 1;
  if (os.type() === "Windows_NT") {
    edgeOrder = 1;
    chromeOrder = 2;
  }

  const launchConfigurations: Record<string, unknown>[] = isMigrateFromV1
    ? []
    : [
        {
          name: "Launch Remote (Edge)",
          type: LaunchBrowser.edge,
          request: "launch",
          url: "https://teams.microsoft.com/l/app/${teamsAppId}?installAppPackage=true&webjoin=true&${account-hint}",
          presentation: {
            group: "remote",
            order: edgeOrder,
          },
        },
        {
          name: "Launch Remote (Chrome)",
          type: LaunchBrowser.chrome,
          request: "launch",
          url: "https://teams.microsoft.com/l/app/${teamsAppId}?installAppPackage=true&webjoin=true&${account-hint}",
          presentation: {
            group: "remote",
            order: chromeOrder,
          },
        },
      ];

  // Tab only
  if (includeFrontend && !includeBot) {
    // hidden configurations
    if (includeBackend) {
      launchConfigurations.push(
        {
          name: "Start and Attach to Frontend (Edge)",
          type: LaunchBrowser.edge,
          request: "launch",
          url: "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&webjoin=true&${account-hint}",
          cascadeTerminateToConfigurations: ["Start and Attach to Backend"],
          presentation: {
            group: "all",
            hidden: true,
          },
        },
        {
          name: "Start and Attach to Frontend (Chrome)",
          type: LaunchBrowser.chrome,
          request: "launch",
          url: "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&webjoin=true&${account-hint}",
          cascadeTerminateToConfigurations: ["Start and Attach to Backend"],
          presentation: {
            group: "all",
            hidden: true,
          },
        },
        {
          name: "Start and Attach to Backend",
          type: "pwa-node",
          request: "attach",
          port: 9229,
          restart: true,
          presentation: {
            group: "all",
            hidden: true,
          },
          internalConsoleOptions: "neverOpen",
        }
      );
    } else {
      launchConfigurations.push(
        {
          name: "Start and Attach to Frontend (Edge)",
          type: LaunchBrowser.edge,
          request: "launch",
          url: "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&webjoin=true&${account-hint}",
          presentation: {
            group: "all",
            hidden: true,
          },
        },
        {
          name: "Start and Attach to Frontend (Chrome)",
          type: LaunchBrowser.chrome,
          request: "launch",
          url: "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&webjoin=true&${account-hint}",
          presentation: {
            group: "all",
            hidden: true,
          },
        }
      );
    }
  }

  // Bot only
  if (!includeFrontend && includeBot) {
    launchConfigurations.push(
      {
        name: "Launch Bot (Edge)",
        type: LaunchBrowser.edge,
        request: "launch",
        url: "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&webjoin=true&${account-hint}",
        cascadeTerminateToConfigurations: ["Start and Attach to Bot"],
        presentation: {
          group: "all",
          hidden: true,
        },
      },
      {
        name: "Launch Bot (Chrome)",
        type: LaunchBrowser.chrome,
        request: "launch",
        url: "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&webjoin=true&${account-hint}",
        cascadeTerminateToConfigurations: ["Start and Attach to Bot"],
        presentation: {
          group: "all",
          hidden: true,
        },
      },
      {
        name: "Start and Attach to Bot",
        type: "pwa-node",
        request: "attach",
        port: 9239,
        restart: true,
        presentation: {
          group: "all",
          hidden: true,
        },
      }
    );
  }

  // Tab and bot
  if (includeFrontend && includeBot) {
    launchConfigurations.push(
      {
        name: "Start and Attach to Frontend (Edge)",
        type: LaunchBrowser.edge,
        request: "launch",
        url: "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&webjoin=true&${account-hint}",
        cascadeTerminateToConfigurations: includeBackend
          ? ["Start and Attach to Bot", "Start and Attach to Backend"]
          : ["Start and Attach to Bot"],
        presentation: {
          group: "all",
          hidden: true,
        },
      },
      {
        name: "Start and Attach to Frontend (Chrome)",
        type: LaunchBrowser.chrome,
        request: "launch",
        url: "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&webjoin=true&${account-hint}",
        cascadeTerminateToConfigurations: includeBackend
          ? ["Start and Attach to Bot", "Start and Attach to Backend"]
          : ["Start and Attach to Bot"],
        presentation: {
          group: "all",
          hidden: true,
        },
      },
      {
        name: "Start and Attach to Bot",
        type: "pwa-node",
        request: "attach",
        port: 9239,
        restart: true,
        presentation: {
          group: "all",
          hidden: true,
        },
        internalConsoleOptions: "neverOpen",
      }
    );
    if (includeBackend) {
      launchConfigurations.push({
        name: "Start and Attach to Backend",
        type: "pwa-node",
        request: "attach",
        port: 9229,
        restart: true,
        presentation: {
          group: "all",
          hidden: true,
        },
        internalConsoleOptions: "neverOpen",
      });
    }
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

  // Tab only
  if (includeFrontend && !includeBot) {
    launchCompounds.push(
      {
        name: "Debug (Edge)",
        configurations: includeBackend
          ? ["Start and Attach to Frontend (Edge)", "Start and Attach to Backend"]
          : ["Start and Attach to Frontend (Edge)"],
        preLaunchTask: "Pre Debug Check & Start All",
        presentation: {
          group: "all",
          order: edgeOrder,
        },
        stopAll: true,
      },
      {
        name: "Debug (Chrome)",
        configurations: includeBackend
          ? ["Start and Attach to Frontend (Chrome)", "Start and Attach to Backend"]
          : ["Start and Attach to Frontend (Chrome)"],
        preLaunchTask: "Pre Debug Check & Start All",
        presentation: {
          group: "all",
          order: chromeOrder,
        },
        stopAll: true,
      }
    );
  }

  // Bot only
  if (!includeFrontend && includeBot) {
    launchCompounds.push(
      {
        name: "Debug (Edge)",
        configurations: ["Launch Bot (Edge)", "Start and Attach to Bot"],
        preLaunchTask: "Pre Debug Check & Start All",
        presentation: {
          group: "all",
          order: edgeOrder,
        },
        stopAll: true,
      },
      {
        name: "Debug (Chrome)",
        configurations: ["Launch Bot (Chrome)", "Start and Attach to Bot"],
        preLaunchTask: "Pre Debug Check & Start All",
        presentation: {
          group: "all",
          order: chromeOrder,
        },
        stopAll: true,
      }
    );
  }

  // Tab and bot
  if (includeFrontend && includeBot) {
    launchCompounds.push(
      {
        name: "Debug (Edge)",
        configurations: includeBackend
          ? [
              "Start and Attach to Frontend (Edge)",
              "Start and Attach to Bot",
              "Start and Attach to Backend",
            ]
          : ["Start and Attach to Frontend (Edge)", "Start and Attach to Bot"],
        preLaunchTask: "Pre Debug Check & Start All",
        presentation: {
          group: "all",
          order: edgeOrder,
        },
        stopAll: true,
      },
      {
        name: "Debug (Chrome)",
        configurations: includeBackend
          ? [
              "Start and Attach to Frontend (Chrome)",
              "Start and Attach to Bot",
              "Start and Attach to Backend",
            ]
          : ["Start and Attach to Frontend (Chrome)", "Start and Attach to Bot"],
        preLaunchTask: "Pre Debug Check & Start All",
        presentation: {
          group: "all",
          order: chromeOrder,
        },
        stopAll: true,
      }
    );
  }
  return launchCompounds;
}
