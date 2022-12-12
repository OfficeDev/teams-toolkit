// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assign, CommentArray, CommentJSONValue, parse } from "comment-json";
import { DebugMigrationContext } from "./debugMigrationContext";
import { Prerequisite, TaskCommand } from "../../../../common/local";
import { isCommentArray, isCommentObject } from "./debugV3MigrationUtils";
import { InstallToolArgs } from "../../../../component/driver/tools/interfaces/InstallToolArgs";
import { BuildArgs } from "../../../../component/driver/interface/buildAndDeployArgs";

export function migrateTransparentPrerequisite(context: DebugMigrationContext): void {
  for (const task of context.tasks) {
    if (
      !isCommentObject(task) ||
      !(task["type"] === "teamsfx") ||
      !(task["command"] === TaskCommand.checkPrerequisites)
    ) {
      continue;
    }

    if (isCommentObject(task["args"]) && isCommentArray(task["args"]["prerequisites"])) {
      const newPrerequisites: string[] = [];
      const toolsArgs: InstallToolArgs = {};

      for (const prerequisite of task["args"]["prerequisites"]) {
        if (prerequisite === Prerequisite.nodejs) {
          newPrerequisites.push(`"${Prerequisite.nodejs}", // Validate if Node.js is installed.`);
        } else if (prerequisite === Prerequisite.m365Account) {
          newPrerequisites.push(
            `"${Prerequisite.m365Account}", // Sign-in prompt for Microsoft 365 account, then validate if the account enables the sideloading permission.`
          );
        } else if (prerequisite === Prerequisite.portOccupancy) {
          newPrerequisites.push(
            `"${Prerequisite.portOccupancy}", // Validate available ports to ensure those debug ones are not occupied.`
          );
        } else if (prerequisite === Prerequisite.func) {
          toolsArgs.func = true;
        } else if (prerequisite === Prerequisite.devCert) {
          toolsArgs.devCert = { trust: true };
        } else if (prerequisite === Prerequisite.dotnet) {
          toolsArgs.dotnet = true;
        }
      }

      task["args"]["prerequisites"] = parse(`[
        ${newPrerequisites.join("\n  ")}
      ]`);
      if (Object.keys(toolsArgs).length > 0) {
        if (!context.appYmlConfig.deploy) {
          context.appYmlConfig.deploy = {};
        }
        context.appYmlConfig.deploy.tools = toolsArgs;
      }
    }
  }
}

export function migrateTransparentLocalTunnel(context: DebugMigrationContext): void {
  for (const task of context.tasks) {
    if (
      !isCommentObject(task) ||
      !(task["type"] === "teamsfx") ||
      !(task["command"] === TaskCommand.startLocalTunnel)
    ) {
      continue;
    }

    if (isCommentObject(task["args"])) {
      const comment = `
        {
          // Keep consistency with migrated configuration.
        }
      `;
      task["args"]["env"] = "local";
      task["args"]["output"] = assign(parse(comment), {
        endpoint: context.placeholderMapping.botEndpoint,
        domain: context.placeholderMapping.botDomain,
      });
    }
  }
}

export function migrateTransparentNpmInstall(context: DebugMigrationContext): void {
  let index = 0;
  while (index < context.tasks.length) {
    const task = context.tasks[index];
    if (
      !isCommentObject(task) ||
      !(task["type"] === "teamsfx") ||
      !(task["command"] === TaskCommand.npmInstall)
    ) {
      ++index;
      continue;
    }

    if (isCommentObject(task["args"]) && isCommentArray(task["args"]["projects"])) {
      for (const npmArgs of task["args"]["projects"]) {
        if (!isCommentObject(npmArgs) || !(typeof npmArgs["cwd"] === "string")) {
          continue;
        }
        const npmInstallArg: BuildArgs = { args: "install" };
        npmInstallArg.workingDirectory = npmArgs["cwd"].replace("${workspaceFolder}", ".");

        if (typeof npmArgs["npmInstallArgs"] === "string") {
          npmInstallArg.args = `install ${npmArgs["npmInstallArgs"]}`;
        } else if (
          isCommentArray(npmArgs["npmInstallArgs"]) &&
          npmArgs["npmInstallArgs"].length > 0
        ) {
          npmInstallArg.args = `install ${npmArgs["npmInstallArgs"].join(" ")}`;
        }

        if (!context.appYmlConfig.deploy) {
          context.appYmlConfig.deploy = {};
        }
        if (!context.appYmlConfig.deploy.npmCommands) {
          context.appYmlConfig.deploy.npmCommands = [];
        }
        context.appYmlConfig.deploy.npmCommands.push(npmInstallArg);
      }
    }

    if (typeof task["label"] === "string") {
      // TODO: remove preLaunchTask in launch.json
      removeDependsOnWithLabel(task["label"], context.tasks);
    }
    context.tasks.splice(index, 1);
  }
}

function removeDependsOnWithLabel(label: string, tasks: CommentArray<CommentJSONValue>): void {
  for (const task of tasks) {
    if (isCommentObject(task)) {
      const dependsOn = task["dependsOn"];
      if (typeof dependsOn == "string" && dependsOn === label) {
        delete task["dependsOn"];
      } else if (Array.isArray(dependsOn)) {
        const index = dependsOn.indexOf(label);
        if (index > -1) {
          dependsOn.splice(index, 1);
        }
      }
    }
  }
}
