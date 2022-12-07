// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CommentArray, CommentJSONValue, CommentObject, parse } from "comment-json";
import { DebugMigrationContext } from "./debugMigrationContext";
import { Prerequisite, TaskCommand } from "../../../../common/local";
import { isCommentArray, isCommentObject } from "./debugV3MigrationUtils";

export function migrateTransparentPrerequisite(
  task: CommentObject,
  context: DebugMigrationContext
): boolean {
  if (!(task["type"] === "teamsfx") || !(task["command"] === TaskCommand.checkPrerequisites)) {
    return false;
  }

  if (isCommentObject(task["args"]) && isCommentArray(task["args"]["prerequisites"])) {
    const newPrerequisites: string[] = [];
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
        context.appYmlConfig.deploy.tools.func = true;
      } else if (prerequisite === Prerequisite.devCert) {
        context.appYmlConfig.deploy.tools.devCert = {
          trust: true,
        };
      } else if (prerequisite === Prerequisite.dotnet) {
        context.appYmlConfig.deploy.tools.dotnet = true;
      }
    }

    task["args"]["prerequisites"] = parse(`[
      ${newPrerequisites.join("\n  ")}
    ]`);
  }

  return true;
}
