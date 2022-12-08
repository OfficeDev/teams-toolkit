// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import { CommentArray, CommentJSONValue, CommentObject, parse } from "comment-json";

export async function readJsonCommentFile(filepath: string): Promise<CommentJSONValue | undefined> {
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
