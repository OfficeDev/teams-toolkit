// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import { ProductName } from "@microsoft/teamsfx-api";
import { ProgrammingLanguage } from "../../../../../common/local/constants";

// TODO: add spfx tasks with "validate-local-prerequisites"
export function generateTasks(
  includeFrontend: boolean,
  includeBackend: boolean,
  includeBot: boolean,
  programmingLanguage: string
): Record<string, unknown>[] {
  /**
   * Referenced by launch.json
   *   - Pre Debug Check
   *   - Start Frontend
   *   - Start Backend
   *   - Start Bot
   *
   * Referenced inside tasks.json
   *   - validate local prerequisites
   *   - start ngrok
   *   - prepare local environment
   */
  const tasks: Record<string, unknown>[] = [
    preDebugCheck(includeBot),
    validateLocalPrerequisites(),
  ];

  if (includeBot) {
    tasks.push(startNgrok());
  }

  tasks.push(prepareLocalEnvironment());

  if (includeFrontend) {
    tasks.push(startFrontend());
    if (includeBackend) {
      tasks.push(startBackend(programmingLanguage));
      if (programmingLanguage === ProgrammingLanguage.typescript) {
        tasks.push(watchBackend());
      }
    }
  }

  if (includeBot) {
    tasks.push(startBot(includeFrontend));
  }

  return tasks;
}

function preDebugCheck(includeBot: boolean): Record<string, unknown> {
  return {
    label: "Pre Debug Check",
    dependsOn: includeBot
      ? ["validate local prerequisites", "start ngrok", "prepare local environment"]
      : ["validate local prerequisites", "prepare local environment"],
    dependsOrder: "sequence",
  };
}

function validateLocalPrerequisites(): Record<string, unknown> {
  return {
    label: "validate local prerequisites",
    type: "shell",
    command: "exit ${command:fx-extension.validate-local-prerequisites}",
  };
}

function prepareLocalEnvironment(): Record<string, unknown> {
  return {
    label: "prepare local environment",
    type: "shell",
    command: "exit ${command:fx-extension.pre-debug-check}",
  };
}

function startFrontend(): Record<string, unknown> {
  return {
    label: "Start Frontend",
    type: "shell",
    command: "npm run dev:teamsfx",
    isBackground: true,
    problemMatcher: "$teamsfx-frontend-watch",
    options: {
      cwd: "${workspaceFolder}/tabs",
    },
  };
}

function startBackend(programmingLanguage: string): Record<string, unknown> {
  const result = {
    label: "Start Backend",
    type: "shell",
    command: "npm run dev:teamsfx",
    isBackground: true,
    problemMatcher: "$teamsfx-backend-watch",
    options: {
      cwd: "${workspaceFolder}/api",
      env: {
        PATH: "${env:PATH}${command:fx-extension.get-func-path}",
      },
    },
    presentation: {
      reveal: "silent",
    },
  } as Record<string, unknown>;

  if (programmingLanguage === ProgrammingLanguage.typescript) {
    result.dependsOn = "Watch Backend";
  }

  return result;
}

function watchBackend(): Record<string, unknown> {
  return {
    label: "Watch Backend",
    type: "shell",
    command: "npm run watch:teamsfx",
    isBackground: true,
    problemMatcher: "$tsc-watch",
    options: {
      cwd: "${workspaceFolder}/api",
    },
    presentation: {
      reveal: "silent",
    },
  };
}

function startBot(includeFrontend: boolean): Record<string, unknown> {
  const result = {
    label: "Start Bot",
    type: "shell",
    command: "npm run dev:teamsfx",
    isBackground: true,
    problemMatcher: "$teamsfx-bot-watch",
    options: {
      cwd: "${workspaceFolder}/bot",
    },
  } as Record<string, unknown>;

  if (includeFrontend) {
    result.presentation = { reveal: "silent" };
  }

  return result;
}

function startNgrok(): Record<string, unknown> {
  return {
    label: "start ngrok",
    dependsOn: `${ProductName}: ngrok start`,
  };
}
