// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  CallAction,
  ContextV3,
  FxError,
  GroupAction,
  InputsWithProjectPath,
  MaybePromise,
  ok,
  Platform,
  ProjectSettingsV3,
  Result,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { format } from "util";
import { getLocalizedString } from "../../common/localizeUtils";
import { isVSProject } from "../../common/projectSettingsHelper";
import { globalVars } from "../../core/globalVars";
import { CoreQuestionNames } from "../../core/question";
import { TabNonSsoItem } from "../../plugins/solution/fx-solution/question";
import { ComponentNames, Scenarios } from "../constants";
import { identityAction } from "../resource/identity";
import { getComponent } from "../workflow";

@Service("teams-tab")
export class TeamsTab {
  name = "teams-tab";
  add(
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): MaybePromise<Result<Action | undefined, FxError>> {
    return ok(this.addTabAction(context, inputs));
  }
  configure(): MaybePromise<Result<Action | undefined, FxError>> {
    return ok(configureTab);
  }
  build(): MaybePromise<Result<Action | undefined, FxError>> {
    return ok(buildTab);
  }

  private addTabAction(context: ContextV3, inputs: InputsWithProjectPath): Action {
    const actions: Action[] = [];
    inputs.hosting = this.resolveHosting(inputs);
    this.setupConfiguration(actions, context, inputs);
    this.setupCode(actions, context);
    this.setupBicep(actions, context, inputs);
    this.setupCapabilities(actions, context);
    if (this.hasTab(context)) {
      actions.push(showTabAlreadyAddMessage);
    }
    return addTab(actions);
  }

  private resolveHosting(inputs: InputsWithProjectPath): string {
    return (
      inputs.hosting ||
      (inputs?.["programming-language"] === "csharp"
        ? ComponentNames.AzureWebApp
        : ComponentNames.AzureStorage)
    );
  }

  private hasTab(context: ContextV3): boolean {
    const tab = getComponent(context.projectSetting, this.name);
    return tab != undefined; // using != to match both undefined and null
  }

  private setupConfiguration(
    actions: Action[],
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Action[] {
    if (this.hasTab(context)) {
      return actions;
    }
    if (inputs.feature !== TabNonSsoItem.id) {
      actions.push(addSSO);
    }
    actions.push(configTab);
    return actions;
  }

  private setupCode(actions: Action[], context: ContextV3): Action[] {
    if (this.hasTab(context)) {
      return actions;
    }
    actions.push(generateCode);
    actions.push(initLocalDebug);
    return actions;
  }

  private setupBicep(
    actions: Action[],
    context: ContextV3,
    inputs: InputsWithProjectPath
  ): Action[] {
    if (this.hasTab(context)) {
      return actions;
    }
    const configActions: Action[] =
      getComponent(context.projectSetting, ComponentNames.APIM) !== undefined
        ? [
            {
              name: "call:apim-config.generateBicep",
              type: "call",
              required: true,
              targetAction: "apim-config.generateBicep",
            },
          ]
        : [];
    if (!getComponent(context.projectSetting, ComponentNames.Identity)) {
      configActions.push(identityAction);
    }
    actions.push(initBicep);
    actions.push(
      generateBicep(inputs.hosting, {
        componentId: this.name,
        scenario: "Tab",
      })
    );
    // TODO: connect AAD for blazor web app
    actions.push(...configActions);
    return actions;
  }

  private setupCapabilities(actions: Action[], context: ContextV3): Action[] {
    const capabilities = [{ name: "staticTab" }];
    if (!this.hasTab(context)) {
      capabilities.push({ name: "configurableTab" });
    }
    actions.push(addTabCapability(capabilities));
    return actions;
  }
}

const addTabCapability: (capabilities: { name: string }[]) => Action = (capabilities) => ({
  name: "call:app-manifest.addCapability",
  type: "call",
  required: true,
  targetAction: "app-manifest.addCapability",
  inputs: {
    capabilities: capabilities,
  },
});

const configTab: Action = {
  name: "fx.configTab",
  type: "function",
  plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
    const tabConfig = getComponent(context.projectSetting, ComponentNames.TeamsTab);
    if (tabConfig) {
      return ok([]);
    }
    return ok(["config Tab in projectSettings"]);
  },
  execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
    const projectSettings = context.projectSetting as ProjectSettingsV3;
    const tabConfig = getComponent(projectSettings, ComponentNames.TeamsTab);
    if (tabConfig) {
      return ok([]);
    }
    // add teams-tab
    projectSettings.components.push({
      name: ComponentNames.TeamsTab,
      hosting: inputs.hosting,
      deploy: true,
    });
    // add hosting component
    projectSettings.components.push({
      name: inputs.hosting,
      connections: [ComponentNames.TeamsTab],
      provision: true,
      scenario: Scenarios.Tab,
    });
    const apimConfig = getComponent(projectSettings, ComponentNames.APIM);
    if (apimConfig) {
      apimConfig.connections?.push(ComponentNames.TeamsTab);
    }
    // add default identity
    if (!getComponent(context.projectSetting, ComponentNames.Identity)) {
      projectSettings.components.push({
        name: ComponentNames.Identity,
        provision: true,
      });
    }
    projectSettings.programmingLanguage =
      projectSettings.programmingLanguage || inputs[CoreQuestionNames.ProgrammingLanguage];
    globalVars.isVS = isVSProject(projectSettings);
    return ok(["config Tab in projectSettings"]);
  },
};

const addSSO: Action = {
  type: "call",
  targetAction: "sso.add",
  required: true,
};

const showTabAlreadyAddMessage: Action = {
  name: "teams-tab.showTabAlreadyAddMessage",
  type: "function",
  plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
    return ok([]);
  },
  execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
    const msg =
      inputs.platform === Platform.CLI
        ? getLocalizedString("core.addCapability.addCapabilityNoticeForCli")
        : getLocalizedString("core.addCapability.addCapabilitiesNoticeForCli");
    context.userInteraction.showMessage("info", format(msg, "Tab"), false);
    return ok([]);
  },
};

const generateCode: Action = {
  name: "call:tab-code.generate",
  type: "call",
  required: true,
  targetAction: "tab-code.generate",
};
const initLocalDebug: Action = {
  name: "call:debug.generateLocalDebugSettings",
  type: "call",
  required: true,
  targetAction: "debug.generateLocalDebugSettings",
};

const initBicep: Action = {
  type: "call",
  targetAction: "bicep.init",
  required: true,
};
const generateBicep: (hosting: string, inputs: Record<string, unknown>) => Action = (
  hosting,
  inputs
) => ({
  name: `call:${hosting}.generateBicep`,
  type: "call",
  required: true,
  targetAction: `${hosting}.generateBicep`,
  inputs: inputs,
});

const configureTab: CallAction = {
  name: "teams-tab.configure",
  type: "call",
  targetAction: "tab-code.configure",
  required: true,
};
const buildTab: CallAction = {
  name: "teams-tab.build",
  type: "call",
  targetAction: "tab-code.build",
  required: true,
};
const addTab: (actions: Action[]) => GroupAction = (actions: Action[]) => ({
  type: "group",
  name: "teams-tab.add",
  mode: "sequential",
  actions: actions,
});
