import { hooks } from "@feathersjs/hooks/lib";
import {
  ActionContext,
  ContextV3,
  err,
  FxError,
  InputsWithProjectPath,
  ok,
  Platform,
  ProjectSettingsV3,
  ResourceContextV3,
  Result,
} from "@microsoft/teamsfx-api";
import { merge } from "lodash";
import { Container } from "typedi";
import { TelemetryEvent, TelemetryProperty } from "../../common/telemetry";
import { environmentManager } from "../../core/environment";
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
} from "../constants";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import {
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
import { loadProjectSettingsByProjectPath } from "../../core/middleware/projectSettingsLoader";
import * as uuid from "uuid";

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
    inputs: InputsWithProjectPath,
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

      await Generator.generateSample(sampleId, projectPath, context);

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

      let templateName;
      if (BotFeatureIds.includes(feature)) {
        // bot
        if (feature === NotificationOptionItem.id) {
          const trigger = inputs[QuestionNames.BOT_HOST_TYPE_TRIGGER] as string;
          if (trigger === AppServiceOptionItem.id) {
            templateName = TemplateNames.NotificationRestify;
          } else if (trigger === AppServiceOptionItemForVS.id) {
            templateName = TemplateNames.NotificationWebApi;
          } else if (trigger === FunctionsHttpTriggerOptionItem.id) {
            templateName = TemplateNames.NotificationHttpTrigger;
          } else if (trigger === FunctionsTimerTriggerOptionItem.id) {
            templateName = TemplateNames.NotificationTimerTrigger;
          } else if (trigger === FunctionsHttpAndTimerTriggerOptionItem.id) {
            templateName = TemplateNames.NotificationHttpTimerTrigger;
          }
        } else if (feature === CommandAndResponseOptionItem.id) {
          templateName = TemplateNames.CommandAndResponse;
        } else if (feature === WorkflowOptionItem.id) {
          templateName = TemplateNames.Workflow;
        }
      } else if (TabFeatureIds.includes(feature)) {
        // tab
        if (feature === TabOptionItem.id) {
          templateName = TemplateNames.SsoTab;
        } else {
          templateName = TemplateNames.Tab;
        }
      }
      if (templateName) {
        const langKey = convertToLangKey(language);
        try {
          await Generator.generateTemplate(templateName, langKey, projectPath, context);
        } catch (e) {
          throw e;
        }
      }

      merge(actionContext?.telemetryProps, {
        [TelemetryProperty.Feature]: feature,
      });
    }

    // generate unique projectId in projectSettings.json
    const projectSettingsRes = await loadProjectSettingsByProjectPath(projectPath, true);
    if (projectSettingsRes.isOk()) {
      const projectSettings = projectSettingsRes.value;
      projectSettings.projectId = inputs.projectId ? inputs.projectId : uuid.v4();
      projectSettings.isFromSample = true;
      inputs.projectId = projectSettings.projectId;
      context.projectSetting = projectSettings as ProjectSettingsV3;
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
        return getQuestionsForAddFeatureV3(context, inputs);
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
      if (features !== ApiConnectionOptionItem.id && features !== CicdOptionItem.id) {
        if (
          context.envInfo?.state?.solution?.provisionSucceeded === true ||
          context.envInfo?.state?.solution?.provisionSucceeded === "true"
        ) {
          context.envInfo.state.solution.provisionSucceeded = false;
        }
        await environmentManager.resetProvisionState(inputs, context);
      }
      return ok(res.value);
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
    ctx: ResourceContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    //TODO call provision actions
    return ok(undefined);
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
