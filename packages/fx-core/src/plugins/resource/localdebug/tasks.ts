// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { ProductName } from "fx-api";
import { ProgrammingLanguage } from "./constants";

export function generateTasks(includeFrontend: boolean, includeBackend: boolean, includeBot: boolean, programmingLanguage: string): Record<string, unknown>[] {
    /**
     * Referenced by launch.json
     *   - Pre Debug Check
     *   - Start Frontend
     *   - Stop All Services
     *
     * Referenced inside tasks.json
     *   - prepare dev env
     *   - prepare local environment
     *   - frontend npm install
     *   - backend npm install
     *   - backend extensions install
     */
    const tasks: Record<string, unknown>[] = [
        {
            label: "Stop All Services",
            type: "shell",
            command: "echo ${input:terminate}",
        },
    ];

    // Tab only
    if (includeFrontend && !includeBot) {
        tasks.push(
            {
                label: "Pre Debug Check",
                dependsOn: [
                    "dependency check",
                    "prepare dev env",
                ],
                dependsOrder: "sequence",
            },
            {
                label: "Start Frontend",
                dependsOn: [`${ProductName}: frontend start`, `${ProductName}: auth start`],
                dependsOrder: "parallel",
            },
            {
                label: "dependency check",
                type: "shell",
                command: "echo ${command:fx-extension.validate-dependencies}",
            },
            {
                label: "prepare dev env",
                dependsOn: includeBackend
                    ? ["prepare local environment", "backend npm install", "frontend npm install"]
                    : ["prepare local environment", "frontend npm install"],
                dependsOrder: "parallel",
            },
            {
                label: "prepare local environment",
                type: "shell",
                command: "echo ${command:fx-extension.pre-debug-check}",
            },
            {
                label: "frontend npm install",
                type: "shell",
                command: "npm install",
                options: {
                    cwd: "${workspaceFolder}/tabs",
                },
            },
        );
        if (includeBackend) {
            if (programmingLanguage === ProgrammingLanguage.typescript) {
                tasks.push(
                    {
                        label: "Start Backend",
                        dependsOn: [
                            `${ProductName}: backend watch`,
                            `${ProductName}: backend start`,
                        ],
                        dependsOrder: "sequence",
                    },
                );
            } else {
                tasks.push(
                    {
                        label: "Start Backend",
                        dependsOn: `${ProductName}: backend start`,
                    },
                );
            }
            tasks.push(
                {
                    label: "backend npm install",
                    type: "shell",
                    command: "npm install",
                    options: {
                        cwd: "${workspaceFolder}/api",
                    },
                    presentation: {
                        reveal: "silent",
                    },
                    dependsOn: "backend extensions install",
                },
                {
                    label: "backend extensions install",
                    type: "shell",
                    command: "echo ${command:fx-extension.backend-extensions-install}",
                },
            );
        }
    }

    // Bot only
    if (!includeFrontend && includeBot) {
        tasks.push(
            {
                label: "Pre Debug Check",
                dependsOn: [
                    "dependency check",
                    "start ngrok",
                    "prepare dev env",
                ],
                dependsOrder: "sequence",
            },
            {
                label: "Start Bot",
                dependsOn: `${ProductName}: bot start`,
            },
            {
                label: "dependency check",
                type: "shell",
                command: "echo ${command:fx-extension.validate-dependencies}",
            },
            {
                label: "start ngrok",
                type: ProductName,
                command: "ngrok start",
                isBackground: true,
                presentation: {
                    panel: "new",
                },
                dependsOn: ["bot npm install"],
            },
            {
                label: "prepare dev env",
                dependsOn: [
                    "prepare local environment",
                    "bot npm install",
                ],
                dependsOrder: "parallel",
            },
            {
                label: "bot npm install",
                type: "shell",
                command: "npm install",
                options: {
                    cwd: "${workspaceFolder}/bot",
                },
            },
            {
                label: "prepare local environment",
                type: "shell",
                command: "echo ${command:fx-extension.pre-debug-check}",
            },
        );
    }

    // Tab and bot
    if (includeFrontend && includeBot) {
        tasks.push(
            {
                label: "Pre Debug Check",
                dependsOn: [
                    "dependency check",
                    "start ngrok",
                    "prepare dev env",
                ],
                dependsOrder: "sequence",
            },
            {
                label: "Start Frontend",
                dependsOn: [`${ProductName}: frontend start`, `${ProductName}: auth start`],
                dependsOrder: "parallel",
            },
            {
                label: "Start Bot",
                dependsOn: `${ProductName}: bot start`,
            },
            {
                label: "dependency check",
                type: "shell",
                command: "echo ${command:fx-extension.validate-dependencies}",
            },
            {
                label: "start ngrok",
                type: ProductName,
                command: "ngrok start",
                isBackground: true,
                presentation: {
                    panel: "new",
                },
                dependsOn: ["bot npm install"],
            },
            {
                label: "prepare dev env",
                dependsOn: includeBackend
                    ? ["prepare local environment", "backend npm install", "frontend npm install", "bot npm install"]
                    : ["prepare local environment", "frontend npm install", "bot npm install"],
                dependsOrder: "parallel",
            },
            {
                label: "bot npm install",
                type: "shell",
                command: "npm install",
                options: {
                    cwd: "${workspaceFolder}/bot",
                },
            },
            {
                label: "prepare local environment",
                type: "shell",
                command: "echo ${command:fx-extension.pre-debug-check}",
            },
            {
                label: "frontend npm install",
                type: "shell",
                command: "npm install",
                options: {
                    cwd: "${workspaceFolder}/tabs",
                },
            },
        );

        if (includeBackend) {
            if (programmingLanguage === ProgrammingLanguage.typescript) {
                tasks.push(
                    {
                        label: "Start Backend",
                        dependsOn: [
                            `${ProductName}: backend watch`,
                            `${ProductName}: backend start`,
                        ],
                        dependsOrder: "sequence",
                    },
                );
            } else {
                tasks.push(
                    {
                        label: "Start Backend",
                        dependsOn: `${ProductName}: backend start`,
                    },
                );
            }
            tasks.push(
                {
                    label: "backend npm install",
                    type: "shell",
                    command: "npm install",
                    options: {
                        cwd: "${workspaceFolder}/api",
                    },
                    presentation: {
                        reveal: "silent",
                    },
                    dependsOn: "backend extensions install",
                },
                {
                    label: "backend extensions install",
                    type: "shell",
                    command: "echo ${command:fx-extension.backend-extensions-install}",
                },
            );
        }
    }

    return tasks;
}

export function generateInputs(): Record<string, unknown>[] {
    // call terminate with terminateAll args in input to not require user to select which task(s) to terminate
    return [
        {
            id: "terminate",
            type: "command",
            command: "workbench.action.tasks.terminate",
            args: "terminateAll",
        },
    ];
}

export function generateSpfxTasks(): Record<string, unknown>[] {
    return [
        {
            label: "npm install",
            type: "shell",
            command: "npm install",
            options: {
                cwd: "${workspaceFolder}/SPFx",
            },
        },
        {
            label: "gulp trust-dev-cert",
            type: "process",
            command: "node",
            args: ["${workspaceFolder}/SPFx/node_modules/gulp/bin/gulp.js", "trust-dev-cert"],
            options: {
                cwd: "${workspaceFolder}/SPFx",
            },
            dependsOn: "npm install",
        },
        {
            label: "gulp serve",
            type: "process",
            command: "node",
            args: ["${workspaceFolder}/SPFx/node_modules/gulp/bin/gulp.js", "serve", "--nobrowser"],
            problemMatcher: [
                {
                    pattern: [
                        {
                            regexp: ".",
                            file: 1,
                            location: 2,
                            message: 3,
                        },
                    ],
                    background: {
                        activeOnStart: true,
                        beginsPattern: "^.*Starting gulp.*",
                        endsPattern: "^.*Finished subtask 'reload'.*",
                    },
                },
            ],
            isBackground: true,
            options: {
                cwd: "${workspaceFolder}/SPFx",
            },
            dependsOn: "gulp trust-dev-cert",
        },
        {
            label: "Terminate All Tasks",
            command: "echo ${input:terminate}",
            type: "shell",
            problemMatcher: [],
        },
    ];
}
