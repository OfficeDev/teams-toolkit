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
  Result,
  SettingsFolderName,
  UserError,
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
  MessageExtensionItem,
} from "../constants";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import { getQuestionsForAddFeatureV3, getQuestionsForProvisionV3 } from "../question";
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
import { SPFxGenerator } from "../generator/spfxGenerator";
import { getDefaultString, getLocalizedString } from "../../common/localizeUtils";
import { ExecutionError, ExecutionOutput } from "../configManager/interface";
import { createContextV3 } from "../utils";
import { resourceGroupHelper } from "../utils/ResourceGroupHelper";
import { getResourceGroupInPortal } from "../../common/tools";
import { getBotTroubleShootMessage } from "../core";

export enum TemplateNames {
  Tab = "non-sso-tab",
  SsoTab = "sso-tab",
  NotificationRestify = "notification-restify",
  NotificationWebApi = "notification-webapi",
  NotificationHttpTrigger = "notification-http-trigger",
  NotificationTimerTrigger = "notification-timer-trigger",
  NotificationHttpTimerTrigger = "notification-http-timer-trigger",
  CommandAndResponse = "command-and-response",
  Workflow = "workflow",
  MessageExtension = "message-extension",
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
  [`${MessageExtensionItem.id}:undefined`]: TemplateNames.MessageExtension,
  [`${TabOptionItem.id}:undefined`]: TemplateNames.SsoTab,
  [`${TabNonSsoItem.id}:undefined`]: TemplateNames.Tab,
};

const workflowFileName = "app.yml";

const M365Actions = [
  "botAadApp/create",
  "teamsApp/create",
  "teamsApp/update",
  "aadApp/create",
  "aadApp/update",
  "m365Bot/createOrUpdate",
];
const AzureActions = ["arm/deploy"];
const needTenantCheckActions = ["botAadApp/create", "aadApp/create", "m365Bot/create"];

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

      const res = await Generator.generateSample(context, projectPath, sampleId);
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

      if (feature === TabSPFxNewUIItem.id) {
        const res = await SPFxGenerator.generate(context, inputs, projectPath);
        if (res.isErr()) return err(res.error);
      } else {
        if (feature === M365SsoLaunchPageOptionItem.id || feature === M365SearchAppOptionItem.id) {
          context.projectSetting.isM365 = true;
          inputs.isM365 = true;
        }
        const trigger = inputs[QuestionNames.BOT_HOST_TYPE_TRIGGER] as string;
        const templateName = Feature2TemplateName[`${feature}:${trigger}`];
        if (templateName) {
          const langKey = convertToLangKey(language);
          context.templateVariables = Generator.getDefaultVariables(appName);
          const res = await Generator.generateTemplate(context, projectPath, templateName, langKey);
          if (res.isErr()) return err(res.error);
        }
      }

      merge(actionContext?.telemetryProps, {
        [TelemetryProperty.Feature]: feature,
      });
    }

    // generate unique projectId in projectSettings.json
    const ensureRes = await this.ensureTrackingId(inputs, projectPath);
    if (ensureRes.isErr()) return err(ensureRes.error);
    if (inputs.platform === Platform.VSCode) {
      await globalStateUpdate(automaticNpmInstall, true);
    }
    context.projectPath = projectPath;
    return ok(projectPath);
  }

  async initInfra(inputs: Inputs): Promise<Result<undefined, FxError>> {
    const projectPath = inputs.projectPath;
    if (!projectPath) {
      return err(InvalidInputError("projectPath is undefined"));
    }
    const context = createContextV3();
    const res = await Generator.generateTemplate(context, projectPath, "init-infra", undefined);
    if (res.isErr()) return err(res.error);
    const ensureRes = await this.ensureTrackingId(inputs, projectPath);
    if (ensureRes.isErr()) return err(ensureRes.error);
    return ok(undefined);
  }

  async ensureTrackingId(inputs: Inputs, projectPath: string): Promise<Result<undefined, FxError>> {
    // generate unique trackingId in settings.json
    const settingsRes = await settingsUtil.readSettings(projectPath);
    if (settingsRes.isErr()) return err(settingsRes.error);
    const settings = settingsRes.value;
    settings.trackingId = inputs.projectId ? inputs.projectId : uuid.v4();
    inputs.projectId = settings.trackingId;
    await settingsUtil.writeSettings(projectPath, settings);
    return ok(undefined);
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
    ctx: DriverContext,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<[DotenvParseOutput | undefined, FxError | undefined]> {
    const output: DotenvParseOutput = {};

    // 1. parse yml
    const parser = new YamlParser();
    const templatePath =
      inputs["workflowFilePath"] ??
      path.join(ctx.projectPath, SettingsFolderName, workflowFileName);
    const maybeProjectModel = await parser.parse(templatePath);
    if (maybeProjectModel.isErr()) {
      return [undefined, maybeProjectModel.error];
    }
    const projectModel = maybeProjectModel.value;

    // 2. ensure RESOURCE_SUFFIX
    const folderName = path.parse(ctx.projectPath).name;
    if (!process.env.RESOURCE_SUFFIX) {
      const suffix = process.env.RESOURCE_SUFFIX || Math.random().toString(36).slice(5);
      process.env.RESOURCE_SUFFIX = suffix;
      output.RESOURCE_SUFFIX = suffix;
    }

    const cycles = [
      projectModel.registerApp,
      projectModel.provision,
      projectModel.configureApp,
    ].filter((c) => c !== undefined);

    // 3. M365 sign in and tenant check if needed.
    let containsM365 = false;
    let containsAzure = false;
    const tenantSwitchCheckActions: string[] = [];
    cycles.forEach((cycle) => {
      cycle!.driverDefs?.forEach((def) => {
        if (M365Actions.includes(def.uses)) {
          containsM365 = true;
        } else if (AzureActions.includes(def.uses)) {
          containsAzure = true;
        }

        if (needTenantCheckActions.includes(def.uses)) {
          tenantSwitchCheckActions.push(def.uses);
        }
      });
    });

    let m365tenantInfo = undefined;
    if (containsM365) {
      const tenantInfoInTokenRes = await provisionUtils.getM365TenantId(ctx.m365TokenProvider);
      if (tenantInfoInTokenRes.isErr()) {
        return [undefined, tenantInfoInTokenRes.error];
      }
      m365tenantInfo = tenantInfoInTokenRes.value;

      const checkM365TenatRes = await provisionUtils.ensureM365TenantMatchesV3(
        tenantSwitchCheckActions,
        m365tenantInfo?.tenantIdInToken,
        inputs.env,
        "coordinator"
      );
      if (checkM365TenatRes.isErr()) {
        return [undefined, checkM365TenatRes.error];
      }
    }

    // 4. pre-requisites check
    for (const cycle of cycles) {
      const unresolvedPlaceHolders = cycle!.resolvePlaceholders();
      // ensure subscription id
      if (unresolvedPlaceHolders.includes("AZURE_SUBSCRIPTION_ID")) {
        if (inputs["targetSubscriptionId"]) {
          process.env.AZURE_SUBSCRIPTION_ID = inputs["targetSubscriptionId"];
          output.AZURE_SUBSCRIPTION_ID = inputs["targetSubscriptionId"];
        } else {
          const ensureRes = await provisionUtils.ensureSubscription(
            ctx.azureAccountProvider,
            process.env.AZURE_SUBSCRIPTION_ID
          );
          if (ensureRes.isErr()) return [undefined, ensureRes.error];
          const subInfo = ensureRes.value;
          if (subInfo && subInfo.subscriptionId) {
            process.env.AZURE_SUBSCRIPTION_ID = subInfo.subscriptionId;
            output.AZURE_SUBSCRIPTION_ID = subInfo.subscriptionId;
          }
        }
      }
      // ensure resource group
      if (unresolvedPlaceHolders.includes("AZURE_RESOURCE_GROUP_NAME")) {
        const cliInputRG = inputs["targetResourceGroupName"];
        const cliInputLocation = inputs["targetResourceLocationName"];
        if (cliInputRG && cliInputLocation) {
          // targetResourceGroupName is from CLI inputs, which means create resource group if not exists
          const createRgRes = await resourceGroupHelper.createNewResourceGroup(
            cliInputRG,
            ctx.azureAccountProvider,
            process.env.AZURE_SUBSCRIPTION_ID!,
            cliInputLocation
          );
          if (createRgRes.isErr()) {
            const error = createRgRes.error;
            if (error.name !== "ResourceGroupExists") {
              return [undefined, error];
            }
          }
          process.env.AZURE_RESOURCE_GROUP_NAME = cliInputRG;
          output.AZURE_RESOURCE_GROUP_NAME = cliInputRG;
        } else {
          const defaultRg = `rg-${folderName}${process.env.RESOURCE_SUFFIX}-${inputs.env}`;
          const ensureRes = await provisionUtils.ensureResourceGroup(
            ctx.azureAccountProvider,
            process.env.AZURE_SUBSCRIPTION_ID!,
            process.env.AZURE_RESOURCE_GROUP_NAME,
            defaultRg
          );
          if (ensureRes.isErr()) return [undefined, ensureRes.error];
          const rgInfo = ensureRes.value;
          if (rgInfo) {
            process.env.AZURE_RESOURCE_GROUP_NAME = rgInfo.name;
            output.AZURE_RESOURCE_GROUP_NAME = rgInfo.name;
          }
        }
      }
    }

    // 5. consent
    let azureSubInfo = undefined;
    if (containsAzure) {
      azureSubInfo = await ctx.azureAccountProvider.getSelectedSubscription(true);
      if (!azureSubInfo) {
        return [
          undefined,
          new UserError(
            "coordinator",
            "SubscriptionNotFound",
            getLocalizedString("core.provision.subscription.failToSelect")
          ),
        ];
      }
    }
    if (azureSubInfo) {
      const consentRes = await provisionUtils.askForProvisionConsentV3(
        ctx,
        m365tenantInfo,
        azureSubInfo,
        inputs.env
      );
      if (consentRes.isErr()) return [undefined, consentRes.error];
      await ctx.azureAccountProvider.setSubscription(azureSubInfo.subscriptionId);
    }
    // 6. execute
    for (const cycle of cycles) {
      const execRes = await cycle!.execute(ctx);
      const result = this.convertExecuteResult(execRes);
      merge(output, result[0]);
      if (result[1]) {
        return [output, result[1]];
      }
    }

    // 7. show provisioned resources
    if (azureSubInfo) {
      const url = getResourceGroupInPortal(
        azureSubInfo.subscriptionId,
        azureSubInfo.tenantId,
        process.env.AZURE_RESOURCE_GROUP_NAME
      );
      const msg = getLocalizedString("core.provision.successNotice", folderName);
      if (url) {
        const title = getLocalizedString("core.provision.viewResources");
        ctx.ui?.showMessage("info", msg, false, title).then((result: any) => {
          const userSelected = result.isOk() ? result.value : undefined;
          if (userSelected === title) {
            ctx.ui?.openUrl(url);
          }
        });
      } else {
        ctx.ui?.showMessage("info", msg, false);
      }
      ctx.logProvider.info(msg);
    }

    return [output, undefined];
  }

  convertExecuteResult(
    execRes: Result<ExecutionOutput, ExecutionError>
  ): [DotenvParseOutput, FxError | undefined] {
    const output: DotenvParseOutput = {};
    let error = undefined;
    if (execRes.isErr()) {
      const execError = execRes.error;
      if (execError.kind === "Failure") {
        error = execError.error;
      } else {
        const partialOutput = execError.env;
        const newOutput = envUtil.map2object(partialOutput);
        merge(output, newOutput);
        const reason = execError.reason;
        if (reason.kind === "DriverError") {
          error = reason.error;
        } else if (reason.kind === "UnresolvedPlaceholders") {
          const placeholders = reason.unresolvedPlaceHolders?.join(",") || "";
          error = new UserError({
            source: "coordinator",
            name: "UnresolvedPlaceholders",
            message: getDefaultString("core.error.unresolvedPlaceholders", placeholders),
            displayMessage: getLocalizedString("core.error.unresolvedPlaceholders", placeholders),
          });
        }
      }
    } else {
      const newOutput = envUtil.map2object(execRes.value);
      merge(output, newOutput);
    }
    return [output, error];
  }

  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryEventName: TelemetryEvent.Deploy,
      telemetryComponentName: "coordinator",
    }),
  ])
  async deploy(
    ctx: DriverContext,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<[DotenvParseOutput | undefined, FxError | undefined]> {
    const output: DotenvParseOutput = {};
    const parser = new YamlParser();
    const templatePath =
      inputs["workflowFilePath"] ??
      path.join(ctx.projectPath, SettingsFolderName, workflowFileName);
    const maybeProjectModel = await parser.parse(templatePath);
    if (maybeProjectModel.isErr()) {
      return [undefined, maybeProjectModel.error];
    }
    const projectModel = maybeProjectModel.value;
    if (projectModel.deploy) {
      const execRes = await projectModel.deploy.execute(ctx);
      const result = this.convertExecuteResult(execRes);
      merge(output, result[0]);
      if (result[1]) return [output, result[1]];

      // show message box after deploy
      const botTroubleShootMsg = getBotTroubleShootMessage(false);
      const msg =
        getLocalizedString("core.deploy.successNotice", path.parse(ctx.projectPath).name) +
        botTroubleShootMsg.textForLogging;
      ctx.logProvider.info(msg);
      ctx.ui?.showMessage("info", msg, false);
    }
    return [output, undefined];
  }

  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryEventName: "publish",
      telemetryComponentName: "coordinator",
    }),
  ])
  async publish(
    ctx: DriverContext,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    const parser = new YamlParser();
    const templatePath = path.join(ctx.projectPath, SettingsFolderName, workflowFileName);
    const maybeProjectModel = await parser.parse(templatePath);
    if (maybeProjectModel.isErr()) {
      return err(maybeProjectModel.error);
    }
    const projectModel = maybeProjectModel.value;
    if (projectModel.publish) {
      const execRes = await projectModel.publish.execute(ctx);
      const result = this.convertExecuteResult(execRes);
      if (result[1]) return err(result[1]);
    }
    return ok(undefined);
  }
}

export const coordinator = new Coordinator();
