// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ActionContext,
  Bicep,
  CloudResource,
  ContextV3,
  err,
  FxError,
  InputsWithProjectPath,
  ok,
  ResourceContextV3,
  Result,
  v3,
} from "@microsoft/teamsfx-api";
import "reflect-metadata";
import { Container, Service } from "typedi";
import { globalVars } from "../../core/globalVars";
import { CoreQuestionNames } from "../../core/question";
import { Constants, FrontendPathInfo } from "../../plugins/resource/frontend/constants";
import {
  AzureSolutionQuestionNames,
  TabNonSsoItem,
} from "../../plugins/solution/fx-solution/question";
import { ComponentNames, Scenarios, StorageOutputs } from "../constants";
import { Plans } from "../messages";
import { getComponent, getComponentByScenario } from "../workflow";
import { assign, cloneDeep, merge } from "lodash";
import { generateConfigBiceps, bicepUtils, addFeatureNotify } from "../utils";
import { TabCodeProvider } from "../code/tabCode";
import { BicepComponent } from "../bicep";
import { convertToAlphanumericOnly } from "../../common/utils";
import { IdentityResource } from "../resource/identity";
import { generateLocalDebugSettings } from "../debug";
import { AppManifest } from "../resource/appManifest/appManifest";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import { hooks } from "@feathersjs/hooks/lib";
import { TelemetryEvent, TelemetryProperty } from "../../common/telemetry";
import { isVSProject } from "../../common";

@Service("teams-tab")
export class TeamsTab {
  name = "teams-tab";
  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryEventName: TelemetryEvent.AddFeature,
      telemetryComponentName: ComponentNames.TeamsTab,
      errorSource: "FE",
      errorHandler: (error) => {
        if (error && !error?.name) {
          error.name = "addTabError";
        }
        return error as FxError;
      },
    }),
  ])
  async add(
    context: ContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const projectSettings = context.projectSetting;
    const effects = [];
    inputs[CoreQuestionNames.ProgrammingLanguage] =
      context.projectSetting.programmingLanguage ||
      inputs[CoreQuestionNames.ProgrammingLanguage] ||
      "javascript";
    inputs.hosting ||=
      inputs[CoreQuestionNames.ProgrammingLanguage] === "csharp"
        ? ComponentNames.AzureWebApp
        : ComponentNames.AzureStorage;
    globalVars.isVS = inputs[CoreQuestionNames.ProgrammingLanguage] === "csharp";
    projectSettings.programmingLanguage ||= inputs[CoreQuestionNames.ProgrammingLanguage];
    const addedComponents: string[] = [];

    // Add static tab to app-manifest if teams-tab already exists
    let tabConfig = getComponent(projectSettings, ComponentNames.TeamsTab);
    if (tabConfig) {
      // app-manifest.addCapability
      {
        const capabilities: v3.ManifestCapability[] = [{ name: "staticTab" }];
        const clonedInputs = cloneDeep(inputs);
        const manifestComponent = Container.get<AppManifest>(ComponentNames.AppManifest);
        const res = await manifestComponent.addCapability(clonedInputs, capabilities);
        if (res.isErr()) return err(res.error);
        effects.push("add tab capability in app manifest");
        addFeatureNotify(inputs, context.userInteraction, "Capability", [inputs.features]);
        return ok(undefined);
      }
    }

    // 1. scaffold and config tab
    const clonedInputs = cloneDeep(inputs);
    clonedInputs.folder ||=
      inputs[CoreQuestionNames.ProgrammingLanguage] === "csharp"
        ? "."
        : FrontendPathInfo.WorkingDir;
    clonedInputs.language = inputs[CoreQuestionNames.ProgrammingLanguage];
    const tabCode = Container.get(ComponentNames.TabCode) as TabCodeProvider;
    const res = await tabCode.generate(context, clonedInputs);
    if (res.isErr()) return err(res.error);
    effects.push("generate tab code");
    tabConfig = {
      name: ComponentNames.TeamsTab,
      hosting: inputs.hosting,
      deploy: true,
      provision: true,
      build: true,
      folder: clonedInputs.folder,
    };
    projectSettings.components.push(tabConfig);
    addedComponents.push(tabConfig.name);
    effects.push(Plans.generateSourceCodeAndConfig(ComponentNames.TeamsTab));

    // 2. generate provision bicep
    // 2.0 bicep.init
    {
      const bicepComponent = Container.get<BicepComponent>("bicep");
      const res = await bicepComponent.init(inputs.projectPath);
      if (res.isErr()) return err(res.error);
    }
    const biceps: Bicep[] = [];
    // 2.1 hosting bicep
    const hostingConfig = getComponentByScenario(projectSettings, inputs.hosting, Scenarios.Tab);
    if (!hostingConfig) {
      const clonedInputs = cloneDeep(inputs);
      assign(clonedInputs, {
        componentId: ComponentNames.TeamsTab,
        scenario: Scenarios.Tab,
      });
      const hostingComponent = Container.get<CloudResource>(inputs.hosting);
      const res = await hostingComponent.generateBicep!(context, clonedInputs);
      if (res.isErr()) return err(res.error);
      res.value.forEach((b) => biceps.push(b));
      projectSettings.components.push({
        name: inputs.hosting,
        scenario: Scenarios.Tab,
        provision: true,
      });
      addedComponents.push(inputs.hosting);
      effects.push(Plans.generateBicepAndConfig(inputs.hosting));
    }

    // 2.2 identity bicep
    if (!getComponent(projectSettings, ComponentNames.Identity)) {
      const clonedInputs = cloneDeep(inputs);
      assign(clonedInputs, {
        componentId: "",
        scenario: "",
      });
      const identityComponent = Container.get<IdentityResource>(ComponentNames.Identity);
      const res = await identityComponent.generateBicep(context, clonedInputs);
      if (res.isErr()) return err(res.error);
      res.value.forEach((b) => biceps.push(b));
      projectSettings.components.push({
        name: ComponentNames.Identity,
        provision: true,
      });
      addedComponents.push(ComponentNames.Identity);
      effects.push(Plans.generateBicepAndConfig(ComponentNames.Identity));
    }

    //persist bicep
    const bicepRes = await bicepUtils.persistBiceps(
      inputs.projectPath,
      convertToAlphanumericOnly(context.projectSetting.appName),
      biceps
    );
    if (bicepRes.isErr()) return bicepRes;
    // 2.3 add sso
    if (inputs[AzureSolutionQuestionNames.Features] !== TabNonSsoItem.id) {
      const ssoComponent = Container.get("sso") as any;
      const res = await ssoComponent.add(context, inputs);
      if (res.isErr()) return err(res.error);
    }

    // 3. generate config bicep
    {
      const res = await generateConfigBiceps(context, inputs);
      if (res.isErr()) return err(res.error);
      effects.push("generate config biceps");
    }

    // 4. local debug settings
    {
      const res = await generateLocalDebugSettings(context, inputs);
      if (res.isErr()) return err(res.error);
      effects.push("generate local debug configs");
    }

    // 5. app-manifest.addCapability
    {
      const capabilities: v3.ManifestCapability[] = [{ name: "staticTab" }];
      // M365 app does not support configurationTab
      if (!context.projectSetting.isM365) {
        capabilities.push({ name: "configurableTab" });
      }
      const clonedInputs = {
        ...cloneDeep(inputs),
        validDomain: "{{state.fx-resource-frontend-hosting.domain}}", // TODO: replace fx-resource-frontend-hosting with inputs.hosting after updating state file
      };
      const manifestComponent = Container.get<AppManifest>(ComponentNames.AppManifest);
      const res = await manifestComponent.addCapability(clonedInputs, capabilities);
      if (res.isErr()) return err(res.error);
      effects.push("add tab capability in app manifest");
    }
    merge(actionContext?.telemetryProps, {
      [TelemetryProperty.Components]: JSON.stringify(addedComponents),
    });
    addFeatureNotify(inputs, context.userInteraction, "Capability", [inputs.features]);
    return ok(undefined);
  }

  @hooks([
    ActionExecutionMW({
      errorSource: "FE",
    }),
  ])
  async provision(context: ResourceContextV3): Promise<Result<undefined, FxError>> {
    if (context.envInfo.envName === "local") {
      context.envInfo.state[ComponentNames.TeamsTab] =
        context.envInfo.state[ComponentNames.TeamsTab] || {};
      if (isVSProject(context.projectSetting)) {
        context.envInfo.state[ComponentNames.TeamsTab][StorageOutputs.indexPath.key] = "";
      } else {
        context.envInfo.state[ComponentNames.TeamsTab][StorageOutputs.indexPath.key] =
          Constants.FrontendIndexPath;
      }
    }
    return ok(undefined);
  }
  async configure(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const tabCode = new TabCodeProvider();
    const res = await tabCode.configure(context as ResourceContextV3, inputs);
    if (res.isErr()) return err(res.error);
    return ok(undefined);
  }
  async build(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath
  ): Promise<Result<undefined, FxError>> {
    const tabCode = new TabCodeProvider();
    const res = await tabCode.build(context, inputs);
    if (res.isErr()) return err(res.error);
    return ok(undefined);
  }
}
