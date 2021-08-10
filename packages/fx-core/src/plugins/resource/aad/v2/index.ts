// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  AzureSolutionSettings
} from "@microsoft/teamsfx-api";
import {
  ResourcePlugin
} from "@microsoft/teamsfx-api/build/v2";
import { Inject, Service } from "typedi";
import { AadAppForTeamsPlugin } from "..";
import {
  ResourcePlugins,
  ResourcePluginsV2
} from "../../../solution/fx-solution/ResourcePluginContainer";

@Service(ResourcePluginsV2.AadPlugin)
export class AadPluginV2 implements ResourcePlugin {
  name = "fx-resource-aad-app-for-teams";
  displayName = "AAD";
  @Inject(ResourcePlugins.AadPlugin)
  plugin!: AadAppForTeamsPlugin;
  activate(solutionSettings: AzureSolutionSettings): boolean {
    return this.plugin.activate(solutionSettings);
  }
}
