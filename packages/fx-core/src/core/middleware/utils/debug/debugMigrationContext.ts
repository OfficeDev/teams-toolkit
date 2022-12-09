// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CommentArray, CommentJSONValue } from "comment-json";
import { AppLocalYmlConfig } from "./appLocalYmlGenerator";

export class DebugMigrationContext {
  public tasks: CommentArray<CommentJSONValue>;
  public appYmlConfig: AppLocalYmlConfig;

  constructor(tasks: CommentArray<CommentJSONValue>) {
    this.tasks = tasks;
    this.appYmlConfig = new AppLocalYmlConfig();
  }
}
