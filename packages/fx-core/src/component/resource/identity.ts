// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Action, ok } from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { ComponentNames, IdentityOutputs } from "../constants";
import { getComponent } from "../workflow";
import { AzureResource } from "./azureResource";
@Service(ComponentNames.Identity)
export class IdentityResource extends AzureResource {
  readonly name = ComponentNames.Identity;
  readonly bicepModuleName = ComponentNames.Identity;
  outputs = IdentityOutputs;
  finalOutputKeys = ["identityResourceId", "identityName", "identityClientId"];
}

export const identityAction: Action = {
  name: "call:identity.generateBicep",
  type: "call",
  required: true,
  targetAction: "identity.generateBicep",
  condition: (context, inputs) => {
    const needed: boolean =
      getComponent(context.projectSetting, ComponentNames.Identity) === undefined;
    if (needed) {
      inputs.componentId = "";
      inputs.scenario = "";
    }
    return ok(needed);
  },
  post: (context, inputs) => {
    if (!getComponent(context.projectSetting, ComponentNames.Identity)) {
      context.projectSetting.components.push({
        name: ComponentNames.Identity,
        provision: true,
      });
    }
    return ok(undefined);
  },
};
