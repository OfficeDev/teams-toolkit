// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { ProductName } from "teamsfx-api";
import { LaunchBrowser } from "./constants";

export function generateConfigurations(includeFrontend: boolean, includeBackend: boolean, includeBot: boolean): Record<string, unknown>[] {
    /* No attach until CLI ready
    let launchConfigurations: object[] = [
        {
            name: "Attach to Frontend (Chrome)",
            type: LaunchBrowser.chrome,
            request: "launch",
            url: "https://teams.microsoft.com/_#/l/app/${input:teamsAppId}?installAppPackage=true",
            presentation: {
                group: "partial",
                order: 2
            }
        },
        {
            name: "Attach to Frontend (Edge)",
            type: LaunchBrowser.edge,
            request: "launch",
            url: "https://teams.microsoft.com/_#/l/app/${input:teamsAppId}?installAppPackage=true",
            presentation: {
                group: "partial",
                order: 4
            }
        }
    ];

    if (includeBackend) {
        launchConfigurations.push(
            {
                name: "Attach to backend",
                type: "node",
                request: "attach",
                port: 9229,
                restart: true,
                presentation: {
                    group: "partial",
                }
            }
        );
    }
    */
    const launchConfigurations: Record<string, unknown>[] = [
        {
            name: "Launch Remote (Edge)",
            type: LaunchBrowser.edge,
            request: "launch",
            url: "https://teams.microsoft.com/_#/l/app/${teamsAppId}?installAppPackage=true",
            presentation: {
                group: "remote",
                order: 1,
            },
        },
        {
            name: "Launch Remote (Chrome)",
            type: LaunchBrowser.chrome,
            request: "launch",
            url: "https://teams.microsoft.com/_#/l/app/${teamsAppId}?installAppPackage=true",
            presentation: {
                group: "remote",
                order: 2,
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
                    url: "https://teams.microsoft.com/_#/l/app/${localTeamsAppId}?installAppPackage=true",
                    preLaunchTask: "Start Frontend",
                    postDebugTask: "Stop All Services",
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
                    url: "https://teams.microsoft.com/_#/l/app/${localTeamsAppId}?installAppPackage=true",
                    preLaunchTask: "Start Frontend",
                    postDebugTask: "Stop All Services",
                    cascadeTerminateToConfigurations: ["Start and Attach to Backend"],
                    presentation: {
                        group: "all",
                        hidden: true,
                    },
                },
                {
                    name: "Start and Attach to Backend",
                    type: "node",
                    request: "attach",
                    port: 9229,
                    restart: true,
                    preLaunchTask: `${ProductName}: backend start`,
                    presentation: {
                        group: "all",
                        hidden: true,
                    },
                    internalConsoleOptions: "neverOpen",
                },
            );
        } else {
            launchConfigurations.push(
                {
                    name: "Start and Attach to Frontend (Edge)",
                    type: LaunchBrowser.edge,
                    request: "launch",
                    url: "https://teams.microsoft.com/_#/l/app/${localTeamsAppId}?installAppPackage=true",
                    preLaunchTask: "Start Frontend",
                    postDebugTask: "Stop All Services",
                    presentation: {
                        group: "all",
                        hidden: true,
                    },
                },
                {
                    name: "Start and Attach to Frontend (Chrome)",
                    type: LaunchBrowser.chrome,
                    request: "launch",
                    url: "https://teams.microsoft.com/_#/l/app/${localTeamsAppId}?installAppPackage=true",
                    preLaunchTask: "Start Frontend",
                    postDebugTask: "Stop All Services",
                    presentation: {
                        group: "all",
                        hidden: true,
                    },
                },
            );
        }
    }

    // Bot only
    if (!includeFrontend && includeBot) {
        launchConfigurations.push(
            {
                name: "Lauch Bot (Edge)",
                type: LaunchBrowser.edge,
                request: "launch",
                url: "https://teams.microsoft.com/_#/l/app/${localTeamsAppId}?installAppPackage=true",
                preLaunchTask: `${ProductName}: auth start`,
                postDebugTask: "Stop All Services",
                cascadeTerminateToConfigurations: ["Start and Attach to Bot"],
                presentation: {
                    group: "all",
                    hidden: true,
                },
            },
            {
                name: "Lauch Bot (Chrome)",
                type: LaunchBrowser.chrome,
                request: "launch",
                url: "https://teams.microsoft.com/_#/l/app/${localTeamsAppId}?installAppPackage=true",
                postDebugTask: "Stop All Services",
                cascadeTerminateToConfigurations: ["Start and Attach to Bot"],
                presentation: {
                    group: "all",
                    hidden: true,
                },
            },
            {
                name: "Start and Attach to Bot",
                type: "node",
                request: "attach",
                port: 9239,
                restart: true,
                preLaunchTask: `${ProductName}: bot start`,
                presentation: {
                    group: "all",
                    hidden: true,
                }
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
                url: "https://teams.microsoft.com/_#/l/app/${localTeamsAppId}?installAppPackage=true",
                preLaunchTask: "Start Frontend",
                postDebugTask: "Stop All Services",
                cascadeTerminateToConfigurations: includeBackend ? ["Start and Attach to Bot", "Start and Attach to Backend"]: ["Start and Attach to Bot"],
                presentation: {
                    group: "all",
                    hidden: true,
                },
            },
            {
                name: "Start and Attach to Frontend (Chrome)",
                type: LaunchBrowser.chrome,
                request: "launch",
                url: "https://teams.microsoft.com/_#/l/app/${localTeamsAppId}?installAppPackage=true",
                preLaunchTask: "Start Frontend",
                postDebugTask: "Stop All Services",
                cascadeTerminateToConfigurations: includeBackend ? ["Start and Attach to Bot", "Start and Attach to Backend"]: ["Start and Attach to Bot"],
                presentation: {
                    group: "all",
                    hidden: true,
                },
            },
            {
                name: "Start and Attach to Bot",
                type: "node",
                request: "attach",
                port: 9239,
                restart: true,
                preLaunchTask: `${ProductName}: bot start`,
                presentation: {
                    group: "all",
                    hidden: true,
                },
                internalConsoleOptions: "neverOpen",
            }
        );
        if (includeBackend) {
            launchConfigurations.push(
                {
                    name: "Start and Attach to Backend",
                    type: "node",
                    request: "attach",
                    port: 9229,
                    restart: true,
                    preLaunchTask: `${ProductName}: backend start`,
                    presentation: {
                        group: "all",
                        hidden: true,
                    },
                    internalConsoleOptions: "neverOpen",
                },
            );
        }
    }

    return launchConfigurations;
}

export function generateCompounds(includeFrontend: boolean, includeBackend: boolean, includeBot: boolean): Record<string, unknown>[] {
    const launchCompounds: Record<string, unknown>[] = [];

    // Tab only
    if (includeFrontend && !includeBot) {
        launchCompounds.push(
            {
                name: "Debug (Edge)",
                configurations: includeBackend
                    ? ["Start and Attach to Frontend (Edge)", "Start and Attach to Backend"]
                    : ["Start and Attach to Frontend (Edge)"],
                preLaunchTask: "Pre Debug Check",
                presentation: {
                    group: "all",
                    order: 1,
                },
                stopAll: true,
            },
            {
                name: "Debug (Chrome)",
                configurations: includeBackend
                    ? ["Start and Attach to Frontend (Chrome)", "Start and Attach to Backend"]
                    : ["Start and Attach to Frontend (Chrome)"],
                preLaunchTask: "Pre Debug Check",
                presentation: {
                    group: "all",
                    order: 2,
                },
                stopAll: true,
            },
        );
    }

    // Bot only
    if (!includeFrontend && includeBot) {
        launchCompounds.push(
            {
                name: "Debug (Edge)",
                configurations: ["Lauch Bot (Edge)", "Start and Attach to Bot"],
                preLaunchTask: "Pre Debug Check",
                presentation: {
                    group: "all",
                    order: 1,
                },
                stopAll: true,
            },
            {
                name: "Debug (Chrome)",
                configurations: ["Lauch Bot (Chrome)", "Start and Attach to Bot"],
                preLaunchTask: "Pre Debug Check",
                presentation: {
                    group: "all",
                    order: 2,
                },
                stopAll: true,
            },
        );
    }

    // Tab and bot
    if (includeFrontend && includeBot) {
        launchCompounds.push(
            {
                name: "Debug (Edge)",
                configurations: includeBackend ? ["Start and Attach to Frontend (Edge)", "Start and Attach to Bot", "Start and Attach to Backend", ] : ["Start and Attach to Frontend (Edge)", "Start and Attach to Bot"],
                preLaunchTask: "Pre Debug Check",
                presentation: {
                    group: "all",
                    order: 2,
                },
                stopAll: true,
            },
            {
                name: "Debug (Chrome)",
                configurations: includeBackend ? ["Start and Attach to Frontend (Chrome)", "Start and Attach to Bot", "Start and Attach to Backend", ] : ["Start and Attach to Frontend (Edge)", "Start and Attach to Bot"],
                preLaunchTask: "Pre Debug Check",
                presentation: {
                    group: "all",
                    order: 2,
                },
                stopAll: true,
            },
        );
    }

    /* No attach until CLI ready
    if (includeBackend) {
        launchCompounds.push(
            {
                name: "Attach to Frontend and Backend (Chrome)",
                configurations: [
                    "Attach to Frontend (Chrome)",
                    "Attach to Backend"
                ],
                presentation: {
                    group: "partial",
                    order: 1
                },
                stopAll: true
            },
            {
                name: "Attach to Frontend and Backend (Edge)",
                configurations: [
                    "Attach to Frontend (Edge)",
                    "Attach to Backend"
                ],
                presentation: {
                    group: "partial",
                    order: 3
                },
                stopAll: true
            }
        );
    }
    */

    return launchCompounds;
}

export function generateSpfxConfigurations(): Record<string, unknown>[] {
    return [
        {
            name: "Local workbench",
            type: "pwa-chrome",
            request: "launch",
            url: "https://localhost:5432/workbench",
            webRoot: "${workspaceRoot}/SPFx",
            sourceMaps: true,
            sourceMapPathOverrides: {
                "webpack:///.././src/*": "${webRoot}/src/*",
                "webpack:///../../../src/*": "${webRoot}/src/*",
                "webpack:///../../../../src/*": "${webRoot}/src/*",
                "webpack:///../../../../../src/*": "${webRoot}/src/*",
            },
            runtimeArgs: ["--remote-debugging-port=9222"],
            preLaunchTask: "gulp serve",
            postDebugTask: "Terminate All Tasks",
        },
        {
            name: "Hosted workbench",
            type: "pwa-chrome",
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
        },
    ];
}
