// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import fs from "fs-extra";
import { CommentArray, CommentJSONValue, CommentObject, parse } from "comment-json";
import { FileType, namingConverterV3 } from "../MigrationUtils";
import { MigrationContext } from "../migrationContext";
import { readBicepContent } from "../v3MigrationUtils";

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

// TODO: use static placeholder name instead
export function getPlaceholderMappings(context: MigrationContext): {
  tabDomain?: string;
  tabEndpoint?: string;
  tabIndexPath?: string;
  botDomain?: string;
  botEndpoint?: string;
} {
  const bicepContent = readBicepContent(context);
  const getName = (name: string) => {
    const res = namingConverterV3(name, FileType.STATE, bicepContent);
    return res.isOk() ? res.value : undefined;
  };
  return {
    tabDomain: getName("state.fx-resource-frontend-hosting.domain"),
    tabEndpoint: getName("state.fx-resource-frontend-hosting.endpoint"),
    tabIndexPath: getName("state.fx-resource-frontend-hosting.indexPath"),
    botDomain: getName("state.fx-resource-bot.domain"),
    botEndpoint: getName("state.fx-resource-bot.siteEndpoint"),
  };
}
