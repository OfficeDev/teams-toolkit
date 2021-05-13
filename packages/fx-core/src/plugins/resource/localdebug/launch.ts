// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as os from "os";
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

    let edgeOrder = 2, chromeOrder = 1;
    if (os.type() === "Windows_NT") {
        edgeOrder = 1;
        chromeOrder = 2;
    }

    const launchConfigurations: Record<string, unknown>[] = [
        {
            name: "Launch Remote (Edge)",
            type: LaunchBrowser.edge,
            request: "launch",
            url: "https://teams.microsoft.com/l/app/${teamsAppId}?installAppPackage=true",
            presentation: {
                group: "remote",
                order: edgeOrder,
            },
        },
        {
            name: "Launch Remote (Chrome)",
            type: LaunchBrowser.chrome,
            request: "launch",
            url: "https://teams.microsoft.com/l/app/${teamsAppId}?installAppPackage=true",
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
                    url: "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&${account-hint}",
                    preLaunchTask: "Start Frontend",
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
                    url: "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&${account-hint}",
                    preLaunchTask: "Start Frontend",
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
                    preLaunchTask: "Start Backend",
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
                    url: "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&${account-hint}",
                    preLaunchTask: "Start Frontend",
                    presentation: {
                        group: "all",
                        hidden: true,
                    },
                },
                {
                    name: "Start and Attach to Frontend (Chrome)",
                    type: LaunchBrowser.chrome,
                    request: "launch",
                    url: "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&${account-hint}",
                    preLaunchTask: "Start Frontend",
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
                name: "Launch Bot (Edge)",
                type: LaunchBrowser.edge,
                request: "launch",
                url: "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&${account-hint}",
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
                url: "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&${account-hint}",
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
                preLaunchTask: "Start Bot",
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
                url: "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&${account-hint}",
                preLaunchTask: "Start Frontend",
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
                url: "https://teams.microsoft.com/l/app/${localTeamsAppId}?installAppPackage=true&${account-hint}",
                preLaunchTask: "Start Frontend",
                cascadeTerminateToConfigurations: includeBackend ? ["Start and Attach to Bot", "Start and Attach to Backend"]: ["Start and Attach to Bot"],
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
                preLaunchTask: "Start Bot",
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
                },
            );
        }
    }

    return launchConfigurations;
}

export function generateCompounds(includeFrontend: boolean, includeBackend: boolean, includeBot: boolean): Record<string, unknown>[] {
    const launchCompounds: Record<string, unknown>[] = [];
    let edgeOrder = 2, chromeOrder = 1;
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
                preLaunchTask: "Pre Debug Check",
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
                preLaunchTask: "Pre Debug Check",
                presentation: {
                    group: "all",
                    order: chromeOrder,
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
                configurations: ["Launch Bot (Edge)", "Start and Attach to Bot"],
                preLaunchTask: "Pre Debug Check",
                presentation: {
                    group: "all",
                    order: edgeOrder,
                },
                stopAll: true,
            },
            {
                name: "Debug (Chrome)",
                configurations: ["Launch Bot (Chrome)", "Start and Attach to Bot"],
                preLaunchTask: "Pre Debug Check",
                presentation: {
                    group: "all",
                    order: chromeOrder,
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
                    order: edgeOrder,
                },
                stopAll: true,
            },
            {
                name: "Debug (Chrome)",
                configurations: includeBackend ? ["Start and Attach to Frontend (Chrome)", "Start and Attach to Bot", "Start and Attach to Backend", ] : ["Start and Attach to Frontend (Chrome)", "Start and Attach to Bot"],
                preLaunchTask: "Pre Debug Check",
                presentation: {
                    group: "all",
                    order: chromeOrder,
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
    let edgeOrder = 2, chromeOrder = 1;
    if (os.type() === "Windows_NT") {
        edgeOrder = 1;
        chromeOrder = 2;
    }

    return [
        {
            name: "Local workbench (Edge)",
            type: LaunchBrowser.edge,
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
            presentation: {
                group: "all",
                order: edgeOrder,
            },
        },
        {
            name: "Local workbench (Chrome)",
            type: LaunchBrowser.chrome,
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
            presentation: {
                group: "all",
                order: chromeOrder,
            },
        },
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
    ];
}
