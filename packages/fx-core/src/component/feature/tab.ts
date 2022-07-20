// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Action,
  CallAction,
  ContextV3,
  FxError,
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
import { Plans } from "../messages";
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
    this.setupConfiguration(actions);
    this.setupCode(actions, context);
    this.setupBicep(actions, inputs);
    this.setupCapabilities(actions);
    actions.push(showTabAlreadyAddMessage);
    return {
      type: "group",
      name: "teams-tab.add",
      mode: "sequential",
      actions: actions,
    };
  }

  private setupConfiguration(actions: Action[]): Action[] {
    actions.push(addSSO);
    actions.push(configTab);
    return actions;
  }

  private setupCode(actions: Action[], context: ContextV3): Action[] {
    actions.push(generateCode);
    actions.push(initLocalDebug);
    return actions;
  }

  private setupBicep(actions: Action[], inputs: InputsWithProjectPath): Action[] {
    const hosting = resolveHosting(inputs);
    actions.push(initBicep);
    actions.push(generateBicep(hosting, this.name));

    // TODO: connect AAD for blazor web app
    actions.push(identityAction);
    actions.push(configureApim);
    return actions;
  }

  private setupCapabilities(actions: Action[]): Action[] {
    actions.push(addTabCapability);
    return actions;
  }
}

function hasTab(context: ContextV3): boolean {
  const tab = getComponent(context.projectSetting, ComponentNames.TeamsTab);
  return tab != undefined; // using != to match both undefined and null
}

const addTabCapability: Action = {
  name: "call:app-manifest.addCapability",
  type: "call",
  required: true,
  targetAction: "app-manifest.addCapability",
  pre: (context: ContextV3, inputs: InputsWithProjectPath) => {
    const capabilities = [{ name: "staticTab" }];
    if (!hasTab(context)) {
      capabilities.push({ name: "configurableTab" });
    }
    inputs.capabilities = capabilities;
    return ok(undefined);
  },
};

const configTab: Action = {
  name: "fx.configTab",
  type: "function",
  condition: (context: ContextV3, inputs: InputsWithProjectPath) => {
    return ok(!hasTab(context));
  },
  plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
    const tabConfig = getComponent(context.projectSetting, ComponentNames.TeamsTab);
    if (tabConfig) {
      return ok([]);
    }
    return ok([Plans.addFeature("Tab")]);
  },
  execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
    const hosting = resolveHosting(inputs);
    const projectSettings = context.projectSetting as ProjectSettingsV3;
    const tabConfig = getComponent(projectSettings, ComponentNames.TeamsTab);
    if (tabConfig) {
      return ok([]);
    }
    // add teams-tab
    projectSettings.components.push({
      name: ComponentNames.TeamsTab,
      hosting: hosting,
      deploy: true,
    });
    // add hosting component
    projectSettings.components.push({
      name: hosting,
      connections: [ComponentNames.TeamsTab],
      provision: true,
      scenario: Scenarios.Tab,
    });
    // connect to existing apim
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
    globalVars.isVS = isVSProject(projectSettings);
    projectSettings.programmingLanguage ||= inputs[CoreQuestionNames.ProgrammingLanguage];
    return ok([Plans.addFeature("Tab")]);
  },
};

const addSSO: CallAction = {
  type: "call",
  name: "call:sso.add",
  targetAction: "sso.add",
  required: true,
  condition: (context: ContextV3, inputs: InputsWithProjectPath) => {
    return ok(inputs.feature !== TabNonSsoItem.id);
  },
};

const showTabAlreadyAddMessage: Action = {
  name: "teams-tab.showTabAlreadyAddMessage",
  type: "function",
  condition: (context: ContextV3, inputs: InputsWithProjectPath) => {
    return ok(hasTab(context));
  },
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
  condition: (context: ContextV3, inputs: InputsWithProjectPath) => {
    return ok(!hasTab(context));
  },
};
const initLocalDebug: Action = {
  name: "call:debug.generateLocalDebugSettings",
  type: "call",
  required: true,
  targetAction: "debug.generateLocalDebugSettings",
  condition: (context: ContextV3, inputs: InputsWithProjectPath) => {
    return ok(!hasTab(context));
  },
};

const initBicep: Action = {
  type: "call",
  targetAction: "bicep.init",
  required: true,
  condition: (context: ContextV3, inputs: InputsWithProjectPath) => {
    return ok(!hasTab(context));
  },
};

const generateBicep: (hosting: string, componentId: string) => Action = (hosting, componentId) => ({
  name: `call:${hosting}.generateBicep`,
  type: "call",
  required: true,
  targetAction: `${hosting}.generateBicep`,
  inputs: {
    scenario: "Tab",
    componentId: componentId,
  },
  condition: (context: ContextV3, inputs: InputsWithProjectPath) => {
    return ok(!hasTab(context));
  },
});

const configureApim: CallAction = {
  name: "call:apim-config.generateBicep",
  type: "call",
  required: true,
  targetAction: "apim-config.generateBicep",
  condition: (context, inputs) => {
    return ok(getComponent(context.projectSetting, ComponentNames.APIM) !== undefined);
  },
};

const configureTab: CallAction = {
  name: "teams-tab.configure",
  type: "call",
  targetAction: "tab-code.configure",
  required: true,
  condition: (context: ContextV3, inputs: InputsWithProjectPath) => {
    return ok(!hasTab(context));
  },
};
const buildTab: CallAction = {
  name: "teams-tab.build",
  type: "call",
  targetAction: "tab-code.build",
  required: true,
};

function resolveHosting(inputs: InputsWithProjectPath): string {
  return (
    inputs.hosting ||
    (inputs?.[CoreQuestionNames.ProgrammingLanguage] === "csharp"
      ? ComponentNames.AzureWebApp
      : ComponentNames.AzureStorage)
  );
}
