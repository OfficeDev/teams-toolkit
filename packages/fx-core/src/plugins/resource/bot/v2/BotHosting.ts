// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, ResourceTemplate, Void } from "@microsoft/teamsfx-api";
import { Context } from "@microsoft/teamsfx-api/build/v2";
import * as fs from "fs-extra";
import path from "path";
import { BotHostTypes, generateBicepFromFile } from "../../../../common";
import { ArmTemplateResult } from "../../../../common/armInterface";
import { Bicep } from "../../../../common/constants";
import { getTemplatesFolder } from "../../../../folder";
import { getActivatedV2ResourcePlugins } from "../../../solution/fx-solution/ResourcePluginContainer";
import { NamedArmResourcePluginAdaptor } from "../../../solution/fx-solution/v2/adaptor";
import { HostTypes, PluginBot } from "../resources/strings";
import * as utils from "../utils/common";
import { AzureHosting, BicepFiles, BicepModules } from "./azureHosting";

export class BotHosting extends AzureHosting {
  bicepFolderRelativeDir = path.join("plugins", "resource", "botv2", "bicep", "botservice");
  configurable = false;
  hostType = "botservice";

  constructor(pluginId: string) {
    super(pluginId);
  }
}
