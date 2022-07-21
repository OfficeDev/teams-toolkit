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
import { FrontendPathInfo } from "../../plugins/resource/frontend/constants";
import { TabNonSsoItem } from "../../plugins/solution/fx-solution/question";
import { ComponentNames, Scenarios } from "../constants";
import { Plans } from "../messages";
import { ensureComponentConnections } from "../migrate";
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
    inputs.hosting = resolveHosting(context, inputs);
    const actions: Action[] = [];
    this.setupCode(actions, context);
    this.setupBicep(actions, context, inputs);
    this.setupCapabilities(actions);
    this.setupConfiguration(actions, context);
    actions.push(showTabAlreadyAddMessage);
    return {
      type: "group",
      name: "teams-tab.add",
      mode: "sequential",
      actions: actions,
    };
  }

  private setupConfiguration(actions: Action[], context: ContextV3): Action[] {
    if (hasTab(context)) {
      return actions;
    }
    actions.push(addSSO);
    actions.push(configTab);
    return actions;
  }

  private setupCode(actions: Action[], context: ContextV3): Action[] {
    if (hasTab(context)) {
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
    if (hasTab(context)) {
      return actions;
    }

    actions.push(initBicep);
    const hosting = resolveHosting(context, inputs);
    if (hosting) {
      actions.push(generateBicep(hosting, this.name));
    }
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
  plan: (context: ContextV3, inputs: InputsWithProjectPath) => {
    const tabConfig = getComponent(context.projectSetting, ComponentNames.TeamsTab);
    if (tabConfig) {
      return ok([]);
    }
    return ok([Plans.addFeature("Tab")]);
  },
  execute: async (context: ContextV3, inputs: InputsWithProjectPath) => {
    const hosting = resolveHosting(context, inputs);
    const language =
      inputs?.[CoreQuestionNames.ProgrammingLanguage] ||
      context.projectSetting.programmingLanguage ||
      "javascript";
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
      provision: language != "csharp",
      build: true,
      folder: inputs.folder || language === "csharp" ? "" : FrontendPathInfo.WorkingDir,
    });
    ensureComponentConnections(projectSettings);
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
    return ok(inputs[CoreQuestionNames.Features] !== TabNonSsoItem.id);
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
  pre: (context: ContextV3, inputs: InputsWithProjectPath) => {
    const language =
      inputs?.[CoreQuestionNames.ProgrammingLanguage] ||
      context.projectSetting.programmingLanguage ||
      "javascript";
    inputs.folder ||= language === "csharp" ? "" : FrontendPathInfo.WorkingDir;
    inputs.language ||= language;
    return ok(undefined);
  },
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
  post: (context, inputs) => {
    // add hosting component
    context.projectSetting?.components?.push({
      name: hosting,
      connections: [ComponentNames.TeamsTab],
      provision: true,
      scenario: Scenarios.Tab,
    });
    ensureComponentConnections(context.projectSetting);
    return ok(undefined);
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

function resolveHosting(context: ContextV3, inputs: InputsWithProjectPath): string {
  const programmingLanguage =
    context.projectSetting.programmingLanguage || inputs[CoreQuestionNames.ProgrammingLanguage];
  return (
    inputs.hosting ||
    (programmingLanguage === "csharp" ? ComponentNames.AzureWebApp : ComponentNames.AzureStorage)
  );
}
