// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CommentArray, CommentJSONValue, CommentObject, assign, parse } from "comment-json";
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
    if (task["args"]["prerequisites"].includes(Prerequisite.nodejs)) {
      newPrerequisites.push(`"${Prerequisite.nodejs}", // Validate if Node.js is installed.`);
    }
    if (task["args"]["prerequisites"].includes(Prerequisite.m365Account)) {
      newPrerequisites.push(
        `"${Prerequisite.m365Account}", // Sign-in prompt for Microsoft 365 account, then validate if the account enables the sideloading permission.`
      );
    }
    if (task["args"]["prerequisites"].includes(Prerequisite.portOccupancy)) {
      newPrerequisites.push(
        `"${Prerequisite.portOccupancy}", // Validate available ports to ensure those debug ones are not occupied.`
      );
    }

    task["args"]["prerequisites"] = parse(`[
      ${newPrerequisites.join("\n  ")}
    ]`);
  }

  if (typeof task["label"] === "string") {
    removeDependsOnWithLabel(task["label"], context.tasks);
  }
  return true;
}

export function migrateTransparentNpmInstall(
  task: CommentObject,
  context: DebugMigrationContext
): boolean {
  if (!(task["type"] === "teamsfx") || !(task["command"] === TaskCommand.npmInstall)) {
    return false;
  }

  if (typeof task["label"] === "string") {
    removeDependsOnWithLabel(task["label"], context.tasks);
  }
  return true;
}

function removeDependsOnWithLabel(label: string, tasks: CommentArray<CommentJSONValue>): void {
  for (const task of tasks) {
    if (isCommentObject(task)) {
      const dependsOn = task["dependsOn"];
      if (typeof dependsOn == "string" && dependsOn === label) {
        task["dependsOn"] = null;
      } else if (Array.isArray(dependsOn)) {
        const index = dependsOn.indexOf(label);
        if (index > -1) {
          dependsOn.splice(index, 1);
        }
      }
    }
  }
}
