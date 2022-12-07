// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import path from "path";
import fs from "fs-extra";
import { MigrationContext } from "../migrationContext";
import { CommentArray, CommentJSONValue, CommentObject, parse } from "comment-json";

export async function readJsonCommentFile(
  context: MigrationContext,
  filePath: string
): Promise<CommentJSONValue | undefined> {
  const filepath = path.join(context.projectPath, filePath);
  if (await fs.pathExists(filepath)) {
    const content = await fs.readFile(filepath);
    const data = parse(content.toString());
    return data;
  }
}

export function isCommentObject(data: CommentJSONValue | undefined): data is CommentObject {
  return typeof data === "object" && !Array.isArray(data) && !!data;
}

export function isCommentArray(
  data: CommentJSONValue | undefined
): data is CommentArray<CommentJSONValue> {
  return Array.isArray(data);
}
