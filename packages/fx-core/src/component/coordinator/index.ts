import { hooks } from "@feathersjs/hooks/lib";
import {
  ActionContext,
  ContextV3,
  err,
  FxError,
  Inputs,
  InputsWithProjectPath,
  ok,
  Platform,
  ResourceContextV3,
  Result,
} from "@microsoft/teamsfx-api";
import { merge } from "lodash";
import { Container } from "typedi";
import { TelemetryEvent, TelemetryProperty } from "../../common/telemetry";
import { InvalidInputError } from "../../core/error";
import { getQuestionsForCreateProjectV2 } from "../../core/middleware/questionModel";
import {
  CoreQuestionNames,
  ProjectNamePattern,
  QuestionRootFolder,
  ScratchOptionNo,
} from "../../core/question";
import {
  ApiConnectionOptionItem,
  AzureResourceApim,
  AzureResourceFunctionNewUI,
  AzureResourceKeyVaultNewUI,
  AzureResourceSQLNewUI,
  AzureSolutionQuestionNames,
  BotFeatureIds,
  CicdOptionItem,
  M365SearchAppOptionItem,
  M365SsoLaunchPageOptionItem,
  SingleSignOnOptionItem,
  TabFeatureIds,
  TabSPFxNewUIItem,
  ComponentNames,
  WorkflowOptionItem,
  NotificationOptionItem,
  CommandAndResponseOptionItem,
  TabOptionItem,
  TabNonSsoItem,
} from "../constants";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import {
  getQuestionsForAddFeature,
  getQuestionsForAddFeatureV3,
  getQuestionsForDeployV3,
  getQuestionsForProvisionV3,
} from "../question";
import * as jsonschema from "jsonschema";
import * as path from "path";
import { globalVars } from "../../core/globalVars";
import fs from "fs-extra";
import { globalStateUpdate } from "../../common/globalState";
import { QuestionNames } from "../feature/bot/constants";
import {
  AppServiceOptionItem,
  AppServiceOptionItemForVS,
  FunctionsHttpAndTimerTriggerOptionItem,
  FunctionsHttpTriggerOptionItem,
  FunctionsTimerTriggerOptionItem,
} from "../feature/bot/question";
import { Generator } from "../generator/generator";
import { convertToLangKey } from "../code/utils";
import { downloadSampleHook } from "../../core/downloadSample";
import * as uuid from "uuid";
import { settingsUtil } from "../utils/settingsUtil";
import { DriverContext } from "../driver/interface/commonArgs";
import { DotenvParseOutput } from "dotenv";
import { YamlParser } from "../configManager/parser";
import { provisionUtils } from "../provisionUtils";
import { envUtil } from "../utils/envUtil";

export enum TemplateNames {
  Tab = "tab",
  SsoTab = "sso-tab",
  NotificationRestify = "notification-restify",
  NotificationWebApi = "notification-webapi",
  NotificationHttpTrigger = "notification-http-trigger",
  NotificationTimerTrigger = "notification-timer-trigger",
  NotificationHttpTimerTrigger = "notification-http-timer-trigger",
  CommandAndResponse = "command-and-response",
  Workflow = "workflow",
}

export const Feature2TemplateName: any = {
  [`${NotificationOptionItem.id}:${AppServiceOptionItem.id}`]: TemplateNames.NotificationRestify,
  [`${NotificationOptionItem.id}:${AppServiceOptionItemForVS.id}`]:
    TemplateNames.NotificationWebApi,
  [`${NotificationOptionItem.id}:${FunctionsHttpTriggerOptionItem.id}`]:
    TemplateNames.NotificationHttpTrigger,
  [`${NotificationOptionItem.id}:${FunctionsTimerTriggerOptionItem.id}`]:
    TemplateNames.NotificationTimerTrigger,
  [`${NotificationOptionItem.id}:${FunctionsHttpAndTimerTriggerOptionItem.id}`]:
    TemplateNames.NotificationHttpTimerTrigger,
  [`${CommandAndResponseOptionItem.id}:undefined`]: TemplateNames.CommandAndResponse,
  [`${WorkflowOptionItem.id}:undefined`]: TemplateNames.Workflow,
  [`${TabOptionItem.id}:undefined`]: TemplateNames.SsoTab,
  [`${TabNonSsoItem.id}:undefined`]: TemplateNames.Tab,
  [`${TabNonSsoItem.id}:undefined`]: TemplateNames.Tab,
};

export class Coordinator {
  @hooks([
    ActionExecutionMW({
      question: (context, inputs) => {
        return getQuestionsForCreateProjectV2(inputs);
      },
      enableTelemetry: true,
      telemetryEventName: TelemetryEvent.CreateProject,
      telemetryComponentName: "coordinator",
      errorSource: "coordinator",
    }),
  ])
  async create(
    context: ContextV3,
    inputs: Inputs,
    actionContext?: ActionContext
  ): Promise<Result<string, FxError>> {
    const folder = inputs[QuestionRootFolder.name] as string;
    if (!folder) {
      return err(InvalidInputError("folder is undefined"));
    }
    const scratch = inputs[CoreQuestionNames.CreateFromScratch] as string;
    let projectPath = "";
    const automaticNpmInstall = "automaticNpmInstall";
    if (scratch === ScratchOptionNo.id) {
      // create from sample
      const sampleId = inputs[CoreQuestionNames.Samples] as string;
      if (!sampleId) {
        throw InvalidInputError(`invalid answer for '${CoreQuestionNames.Samples}'`, inputs);
      }
      projectPath = path.join(folder, sampleId);
      inputs.projectPath = projectPath;
      await fs.ensureDir(projectPath);

      const res = await Generator.generateSample(sampleId, projectPath, context);
      if (res.isErr()) return err(res.error);

      await downloadSampleHook(sampleId, projectPath);
    } else {
      // create from new
      const appName = inputs[CoreQuestionNames.AppName] as string;
      if (undefined === appName) return err(InvalidInputError(`App Name is empty`, inputs));
      const validateResult = jsonschema.validate(appName, {
        pattern: ProjectNamePattern,
      });
      if (validateResult.errors && validateResult.errors.length > 0) {
        return err(InvalidInputError(`${validateResult.errors[0].message}`, inputs));
      }
      projectPath = path.join(folder, appName);
      inputs.projectPath = projectPath;

      await fs.ensureDir(projectPath);

      // set isVS global var when creating project
      const language = inputs[CoreQuestionNames.ProgrammingLanguage];
      globalVars.isVS = language === "csharp";
      const feature = inputs.capabilities as string;
      delete inputs.folder;

      if (feature === M365SsoLaunchPageOptionItem.id || feature === M365SearchAppOptionItem.id) {
        context.projectSetting.isM365 = true;
        inputs.isM365 = true;
      }
      const trigger = inputs[QuestionNames.BOT_HOST_TYPE_TRIGGER] as string;
      const templateName = Feature2TemplateName[`${feature}:${trigger}`];
      if (templateName) {
        const langKey = convertToLangKey(language);
        const res = await Generator.generateTemplate(templateName, langKey, projectPath, context);
        if (res.isErr()) return err(res.error);
      }
      merge(actionContext?.telemetryProps, {
        [TelemetryProperty.Feature]: feature,
      });
    }

    // generate unique projectId in projectSettings.json
    const projectSettingsRes = await settingsUtil.readSettings(projectPath);
    if (projectSettingsRes.isOk()) {
      const settings = projectSettingsRes.value;
      settings.projectId = inputs.projectId ? inputs.projectId : uuid.v4();
      settings.isFromSample = scratch === ScratchOptionNo.id;
      inputs.projectId = settings.projectId;
      await settingsUtil.writeSettings(projectPath, settings);
    }
    if (inputs.platform === Platform.VSCode) {
      await globalStateUpdate(automaticNpmInstall, true);
    }
    context.projectPath = projectPath;
    return ok(projectPath);
  }

  /**
   * add feature
   */
  @hooks([
    ActionExecutionMW({
      question: (context, inputs) => {
        return getQuestionsForAddFeature(context, inputs);
      },
      enableTelemetry: true,
      telemetryEventName: TelemetryEvent.AddFeature,
      telemetryComponentName: "coordinator",
    }),
  ])
  async addFeature(
    context: ContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<any, FxError>> {
    const features = inputs[AzureSolutionQuestionNames.Features];
    let component;
    if (BotFeatureIds.includes(features)) {
      component = Container.get(ComponentNames.TeamsBot);
    } else if (TabFeatureIds.includes(features)) {
      component = Container.get(ComponentNames.TeamsTab);
    } else if (features === AzureResourceSQLNewUI.id) {
      component = Container.get("sql");
    } else if (features === AzureResourceFunctionNewUI.id) {
      component = Container.get(ComponentNames.TeamsApi);
    } else if (features === AzureResourceApim.id) {
      component = Container.get(ComponentNames.APIMFeature);
    } else if (features === AzureResourceKeyVaultNewUI.id) {
      component = Container.get("key-vault-feature");
    } else if (features === CicdOptionItem.id) {
      component = Container.get("cicd");
    } else if (features === ApiConnectionOptionItem.id) {
      component = Container.get("api-connector");
    } else if (features === SingleSignOnOptionItem.id) {
      component = Container.get("sso");
    } else if (features === TabSPFxNewUIItem.id) {
      component = Container.get(ComponentNames.SPFxTab);
    }
    if (component) {
      const res = await (component as any).add(context, inputs);
      merge(actionContext?.telemetryProps, {
        [TelemetryProperty.Feature]: features,
      });
      if (res.isErr()) return err(res.error);
      return ok(res.value);
    }
    return ok(undefined);
  }
  /**
   * add feature v3
   */
  @hooks([
    ActionExecutionMW({
      question: (context, inputs) => {
        return getQuestionsForAddFeatureV3(context, inputs);
      },
      enableTelemetry: true,
      telemetryEventName: TelemetryEvent.AddFeature,
      telemetryComponentName: "coordinator",
    }),
  ])
  async addFeatureV3(
    context: DriverContext,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<any, FxError>> {
    //TODO call generator
    const features = inputs[AzureSolutionQuestionNames.Features];
    if (features === CicdOptionItem.id) {
      // const component = Container.get("cicd") as CICD;
      // change CICD interface
      // const res = await component.add(context, inputs);
      // merge(actionContext?.telemetryProps, {
      //   [TelemetryProperty.Feature]: features,
      // });
      // if (res.isErr()) return err(res.error);
      // return ok(res.value);
    }
    return ok(undefined);
  }
  @hooks([
    ActionExecutionMW({
      question: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        return await getQuestionsForProvisionV3(context, inputs);
      },
      enableTelemetry: true,
      telemetryEventName: TelemetryEvent.Provision,
      telemetryComponentName: "coordinator",
    }),
  ])
  async provision(
    ctx: DriverContext,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<DotenvParseOutput, FxError>> {
    if (inputs["subscription"]) {
      process.env.AZURE_SUBSCRIPTION_ID = inputs["subscription"];
    }
    if (inputs["resource-group"]) {
      process.env.AZURE_RESOURCE_GROUP_NAME = inputs["resource-group"];
    }
    const output: DotenvParseOutput = {};
    const parser = new YamlParser();
    const templatePath = path.join(ctx.projectPath, ".fx", "teamsfx.yml");
    const maybeProjectModel = await parser.parse(templatePath);
    if (maybeProjectModel.isErr()) {
      return err(maybeProjectModel.error);
    }
    const projectModel = maybeProjectModel.value;
    const cycles = [projectModel.registerApp, projectModel.provision, projectModel.configureApp];
    for (const cycle of cycles) {
      if (!cycle) continue;
      let runRes = await cycle.run(ctx);
      if (runRes.isErr()) return err(runRes.error);
      let unresolvedPlaceHolders = runRes.value.unresolvedPlaceHolders;
      if (unresolvedPlaceHolders.length > 0) {
        if (unresolvedPlaceHolders.includes("AZURE_SUBSCRIPTION_ID")) {
          const ensureRes = await provisionUtils.ensureSubscription(
            ctx.azureAccountProvider,
            process.env.AZURE_SUBSCRIPTION_ID
          );
          if (ensureRes.isErr()) return err(ensureRes.error);
          const subInfo = ensureRes.value;
          if (subInfo && subInfo.subscriptionId) {
            process.env.AZURE_SUBSCRIPTION_ID = subInfo.subscriptionId;
            output.AZURE_SUBSCRIPTION_ID = subInfo.subscriptionId;
            unresolvedPlaceHolders = unresolvedPlaceHolders.filter(
              (ph) => ph !== "AZURE_SUBSCRIPTION_ID"
            );
          }
        }
        if (
          process.env.AZURE_SUBSCRIPTION_ID &&
          unresolvedPlaceHolders.includes("AZURE_RESOURCE_GROUP_NAME")
        ) {
          const folderName = path.parse(ctx.projectPath).name;
          const suffix = process.env.RESOURCE_SUFFIX || Math.random().toString(36).slice(5);
          const defaultRg = `rg-${folderName}${suffix}-${inputs.env}`;
          const ensureRes = await provisionUtils.ensureResourceGroup(
            ctx.azureAccountProvider,
            process.env.AZURE_SUBSCRIPTION_ID,
            process.env.AZURE_RESOURCE_GROUP_NAME,
            defaultRg
          );
          if (ensureRes.isErr()) return err(ensureRes.error);
          const rgInfo = ensureRes.value;
          if (rgInfo) {
            process.env.AZURE_RESOURCE_GROUP_NAME = rgInfo.name;
            output.AZURE_RESOURCE_GROUP_NAME = rgInfo.name;
            unresolvedPlaceHolders = unresolvedPlaceHolders.filter(
              (ph) => ph !== "AZURE_RESOURCE_GROUP_NAME"
            );
          }
        }
        if (unresolvedPlaceHolders.length === 0) {
          runRes = await cycle.run(ctx);
          if (runRes.isErr()) return err(runRes.error);
        }
      }
      const newOutput = envUtil.map2object(runRes.value.env);
      merge(output, newOutput);
    }
    return ok(output);
  }

  @hooks([
    ActionExecutionMW({
      question: async (context: ContextV3, inputs: InputsWithProjectPath) => {
        return await getQuestionsForDeployV3(context, inputs, context.envInfo!);
      },
      enableTelemetry: true,
      telemetryEventName: TelemetryEvent.Deploy,
      telemetryComponentName: "coordinator",
    }),
  ])
  async deploy(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    //TODO call deploy actions
    return ok(undefined);
  }

  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryEventName: "publish",
      telemetryComponentName: "coordinator",
    }),
  ])
  async publish(
    context: ResourceContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    //TODO call publish actions
    return ok(undefined);
  }
}

export const coordinator = new Coordinator();
