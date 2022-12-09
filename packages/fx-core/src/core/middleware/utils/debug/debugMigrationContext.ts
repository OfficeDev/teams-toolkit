// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CommentArray, CommentJSONValue } from "comment-json";
import { AppLocalYmlConfig } from "./appLocalYmlGenerator";

export class DebugMigrationContext {
  public tasks: CommentArray<CommentJSONValue>;
  public appYmlConfig: AppLocalYmlConfig;
  public placeholderMapping: DebugPlaceholderMapping;

  constructor(tasks: CommentArray<CommentJSONValue>, placeholderMapping: DebugPlaceholderMapping) {
    this.tasks = tasks;
    this.appYmlConfig = new AppLocalYmlConfig();
    this.placeholderMapping = placeholderMapping;
  }
}

export interface DebugPlaceholderMapping {
  tabDomain?: string;
  tabEndpoint?: string;
  tabIndexPath?: string;
  botDomain?: string;
  botEndpoint?: string;
}
