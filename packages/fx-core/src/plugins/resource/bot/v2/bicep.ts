// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, ResourceTemplate } from "@microsoft/teamsfx-api";
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
import { BicepConfigs } from "./botSolution";
import * as utils from "../utils/common";

export function mergeTemplates(templates: ArmTemplateResult[]): ArmTemplateResult {
  const result: ArmTemplateResult = {
    Provision: {
      Orchestration: templates.map((template) => template.Provision?.Orchestration).join(""),
      Modules: templates
        .map((template) => template.Provision?.Modules)
        .reduce((result, current) => Object.assign(result, current), {}),
    },
    Configuration: {
      Orchestration: templates.map((template) => template.Configuration?.Orchestration).join(""),
      Modules: templates
        .map((template) => template.Configuration?.Modules)
        .reduce((result, current) => Object.assign(result, current), {}),
    },
    Parameters: Object.assign({}, ...templates.map((template) => template.Parameters)),
    Reference: Object.assign({}, ...templates.map((template) => template.Reference)),
  };
  return result;
}
