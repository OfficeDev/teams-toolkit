// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ProjectSettings } from "@microsoft/teamsfx-api";
import { CommentArray, CommentJSONValue } from "comment-json";
import { MigrationContext } from "../migrationContext";
import { AppLocalYmlConfig } from "./appLocalYmlGenerator";
import { DebugPlaceholderMapping } from "./debugV3MigrationUtils";

export class DebugMigrationContext {
  public migrationContext: MigrationContext;
  public tasks: CommentArray<CommentJSONValue>;
  public appYmlConfig: AppLocalYmlConfig;
  public oldProjectSettings: ProjectSettings;
  public placeholderMapping: DebugPlaceholderMapping;
  public generatedLabels: string[] = [];

  constructor(
    migrationContext: MigrationContext,
    tasks: CommentArray<CommentJSONValue>,
    oldProjectSettings: ProjectSettings,
    placeholderMapping: DebugPlaceholderMapping
  ) {
    this.migrationContext = migrationContext;
    this.tasks = tasks;
    this.appYmlConfig = new AppLocalYmlConfig();
    this.oldProjectSettings = oldProjectSettings;
    this.placeholderMapping = placeholderMapping;
  }
}
