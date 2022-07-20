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
  v3,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Service } from "typedi";
import { format } from "util";
import { getLocalizedString } from "../../common/localizeUtils";
import { isVSProject } from "../../common/projectSettingsHelper";
import { globalVars } from "../../core/globalVars";
import { CoreQuestionNames } from "../../core/question";
import {
  TabNonSsoItem,
  AzureSolutionQuestionNames,
} from "../../plugins/solution/fx-solution/question";
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
    this.setupConfiguration(actions, context);
    this.setupCode(actions, context);
    this.setupBicep(actions, context, inputs);
    this.setupCapabilities(actions, context);
    if (this.hasTab(context)) {
      actions.push(showTabAlreadyAddMessage);
    }
    return {
      type: "group",
      name: "teams-tab.add",
      mode: "sequential",
      actions: actions,
    };
  }

  private setupConfiguration(actions: Action[], context: ContextV3): Action[] {
    if (this.hasTab(context)) {
      return actions;
    }
    actions.push(addSSO);
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
    const hosting = resolveHosting(inputs);
    actions.push(initBicep);
    actions.push(generateBicep(hosting, this.name));

    // TODO: connect AAD for blazor web app
    if (getComponent(context.projectSetting, ComponentNames.Identity) === undefined) {
      actions.push(identityAction);
    }
    actions.push(configureApim);
    return actions;
  }

  private setupCapabilities(actions: Action[], context: ContextV3): Action[] {
    const capabilities: v3.ManifestCapability[] = [{ name: "staticTab" }];
    if (!this.hasTab(context)) {
      capabilities.push({ name: "configurableTab" });
    }
    actions.push(addTabCapability(capabilities));
    return actions;
  }

  private hasTab(context: ContextV3): boolean {
    const tab = getComponent(context.projectSetting, ComponentNames.TeamsTab);
    return tab != undefined; // using != to match both undefined and null
  }
}

const addTabCapability: (capabilities: v3.ManifestCapability[]) => Action = (capabilities) => ({
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
    return ok(inputs[AzureSolutionQuestionNames.Features] !== TabNonSsoItem.id);
  },
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

const generateBicep: (hosting: string, componentId: string) => Action = (hosting, componentId) => ({
  name: `call:${hosting}.generateBicep`,
  type: "call",
  required: true,
  targetAction: `${hosting}.generateBicep`,
  inputs: {
    scenario: "Tab",
    componentId: componentId,
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
