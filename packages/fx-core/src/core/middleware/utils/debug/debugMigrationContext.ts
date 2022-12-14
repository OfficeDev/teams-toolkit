// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CommentArray, CommentJSONValue } from "comment-json";
import { AppLocalYmlConfig } from "./appLocalYmlGenerator";
import { DebugPlaceholderMapping } from "./debugV3MigrationUtils";

export class DebugMigrationContext {
  public tasks: CommentArray<CommentJSONValue>;
  public appYmlConfig: AppLocalYmlConfig;
  public placeholderMapping: DebugPlaceholderMapping;
  public generatedLabels: string[] = [];

  constructor(tasks: CommentArray<CommentJSONValue>, placeholderMapping: DebugPlaceholderMapping) {
    this.tasks = tasks;
    this.appYmlConfig = new AppLocalYmlConfig();
    this.placeholderMapping = placeholderMapping;
  }
}
