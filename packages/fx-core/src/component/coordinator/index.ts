import { hooks } from "@feathersjs/hooks/lib";
import {
  ActionContext,
  assembleError,
  Colors,
  ContextV3,
  err,
  FxError,
  Inputs,
  InputsWithProjectPath,
  ok,
  Platform,
  ResourceContextV3,
  Result,
  UserCancelError,
  UserError,
  Void,
} from "@microsoft/teamsfx-api";
import { merge } from "lodash";
import { Container } from "typedi";
import { TelemetryEvent, TelemetryProperty } from "../../common/telemetry";
import { InvalidInputError, ObjectIsUndefinedError } from "../../core/error";
import {
  CoreQuestionNames,
  CreateNewOfficeAddinOption,
  ProjectNamePattern,
  ScratchOptionNo,
  ScratchOptionYes,
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
  CoordinatorSource,
  BotOptionItem,
  TabNonSsoAndDefaultBotItem,
  DefaultBotAndMessageExtensionItem,
  DashboardOptionItem,
} from "../constants";
import { ActionExecutionMW } from "../middleware/actionExecutionMW";
import {
  getQuestionsForAddFeatureV3,
  InitOptionNo,
  InitEditorVSCode,
  InitEditorVS,
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
import { provisionUtils } from "../provisionUtils";
import { envUtil } from "../utils/envUtil";
import { SPFxGenerator } from "../generator/spfxGenerator";
import { getDefaultString, getLocalizedString } from "../../common/localizeUtils";
import { ExecutionError, ExecutionOutput, ILifecycle } from "../configManager/interface";
import { resourceGroupHelper, ResourceGroupInfo } from "../utils/ResourceGroupHelper";
import { getResourceGroupInPortal } from "../../common/tools";
import { getBotTroubleShootMessage } from "../core";
import { developerPortalScaffoldUtils } from "../developerPortalScaffoldUtils";
import { updateTeamsAppV3ForPublish } from "../resource/appManifest/appStudio";
import { AppStudioScopes, Constants } from "../resource/appManifest/constants";
import * as xml2js from "xml2js";
import { Lifecycle } from "../configManager/lifecycle";
import { SummaryReporter } from "./summary";
import { EOL } from "os";
import { OfficeAddinGenerator } from "../generator/officeAddin/generator";
import { deployUtils } from "../deployUtils";
import { pathUtils } from "../utils/pathUtils";
import { MetadataV3 } from "../../common/versionMetadata";
import { metadataUtil } from "../utils/metadataUtil";
import { LifeCycleUndefinedError } from "../../error/yml";
import { UnresolvedPlaceholderError } from "../../error/common";
import { SelectSubscriptionError } from "../../error/azure";

export enum TemplateNames {
  Tab = "non-sso-tab",
  SsoTab = "sso-tab",
  M365Tab = "m365-tab",
  DashboardTab = "dashboard-tab",
  NotificationRestify = "notification-restify",
  NotificationWebApi = "notification-webapi",
  NotificationHttpTrigger = "notification-http-trigger",
  NotificationTimerTrigger = "notification-timer-trigger",
  NotificationHttpTimerTrigger = "notification-http-timer-trigger",
  CommandAndResponse = "command-and-response",
  Workflow = "workflow",
  DefaultBot = "default-bot",
  MessageExtension = "message-extension",
  M365MessageExtension = "m365-message-extension",
  TabAndDefaultBot = "non-sso-tab-default-bot",
  BotAndMessageExtension = "default-bot-message-extension",
}

export const Feature2TemplateName: any = {
  [`${NotificationOptionItem().id}:${AppServiceOptionItem.id}`]: TemplateNames.NotificationRestify,
  [`${NotificationOptionItem().id}:${AppServiceOptionItemForVS.id}`]:
    TemplateNames.NotificationWebApi,
  [`${NotificationOptionItem().id}:${FunctionsHttpTriggerOptionItem.id}`]:
    TemplateNames.NotificationHttpTrigger,
  [`${NotificationOptionItem().id}:${FunctionsTimerTriggerOptionItem.id}`]:
    TemplateNames.NotificationTimerTrigger,
  [`${NotificationOptionItem().id}:${FunctionsHttpAndTimerTriggerOptionItem.id}`]:
    TemplateNames.NotificationHttpTimerTrigger,
  [`${CommandAndResponseOptionItem().id}:undefined`]: TemplateNames.CommandAndResponse,
  [`${WorkflowOptionItem().id}:undefined`]: TemplateNames.Workflow,
  [`${BotOptionItem().id}:undefined`]: TemplateNames.DefaultBot,
  [`${MessageExtensionItem().id}:undefined`]: TemplateNames.MessageExtension,
  [`${M365SearchAppOptionItem().id}:undefined`]: TemplateNames.M365MessageExtension,
  [`${TabOptionItem().id}:undefined`]: TemplateNames.SsoTab,
  [`${TabNonSsoItem().id}:undefined`]: TemplateNames.Tab,
  [`${M365SsoLaunchPageOptionItem().id}:undefined`]: TemplateNames.M365Tab,
  [`${DashboardOptionItem().id}:undefined`]: TemplateNames.DashboardTab,
  [`${TabNonSsoAndDefaultBotItem().id}:undefined`]: TemplateNames.TabAndDefaultBot,
  [`${DefaultBotAndMessageExtensionItem().id}:undefined`]: TemplateNames.BotAndMessageExtension,
};

export const InitTemplateName: any = {
  ["debug:vsc:tab:true"]: "init-debug-vsc-spfx-tab",
  ["debug:vsc:tab:false"]: "init-debug-vsc-tab",
  ["debug:vs:tab:undefined"]: "init-debug-vs-tab",
  ["debug:vsc:bot:undefined"]: "init-debug-vsc-bot",
  ["debug:vs:bot:undefined"]: "init-debug-vs-bot",
  ["infra:vsc:tab:true"]: "init-infra-vsc-spfx-tab",
  ["infra:vsc:tab:false"]: "init-infra-vsc-tab",
  ["infra:vs:tab:undefined"]: "init-infra-vs-tab",
  ["infra:vsc:bot:undefined"]: "init-infra-vsc-bot",
  ["infra:vs:bot:undefined"]: "init-infra-vs-bot",
};

const M365Actions = [
  "botAadApp/create",
  "teamsApp/create",
  "teamsApp/update",
  "aadApp/create",
  "aadApp/update",
  "botFramework/create",
  "m365Title/acquire",
];
const AzureActions = ["arm/deploy"];
const AzureDeployActions = [
  "azureAppService/deploy",
  "azureFunctions/deploy",
  "azureStorage/deploy",
];
const needTenantCheckActions = ["botAadApp/create", "aadApp/create", "botFramework/create"];

export class Coordinator {
  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryEventName: TelemetryEvent.CreateProject,
      telemetryComponentName: "coordinator",
      errorSource: CoordinatorSource,
    }),
  ])
  async create(
    context: ContextV3,
    inputs: Inputs,
    actionContext?: ActionContext
  ): Promise<Result<string, FxError>> {
    const folder = inputs["folder"] as string;
    if (!folder) {
      return err(InvalidInputError("folder is undefined"));
    }
    const scratch = inputs[CoreQuestionNames.CreateFromScratch] as string;
    let projectPath = "";
    const automaticNpmInstall = "automaticNpmInstall";
    if (scratch === ScratchOptionNo().id) {
      // create from sample
      const sampleId = inputs[CoreQuestionNames.Samples] as string;
      if (!sampleId) {
        throw InvalidInputError(`invalid answer for '${CoreQuestionNames.Samples}'`, inputs);
      }
      projectPath = path.join(folder, sampleId);
      let suffix = 1;
      while ((await fs.pathExists(projectPath)) && (await fs.readdir(projectPath)).length > 0) {
        projectPath = path.join(folder, `${sampleId}_${suffix++}`);
      }

      inputs.projectPath = projectPath;
      await fs.ensureDir(projectPath);

      const res = await Generator.generateSample(context, projectPath, sampleId);
      if (res.isErr()) return err(res.error);

      await downloadSampleHook(sampleId, projectPath);
    } else if (!scratch || scratch === ScratchOptionYes().id) {
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

      merge(actionContext?.telemetryProps, {
        [TelemetryProperty.Capabilities]: feature,
        [TelemetryProperty.IsFromTdp]: (!!inputs.teamsAppFromTdp).toString(),
      });

      if (feature === TabSPFxNewUIItem().id) {
        const res = await SPFxGenerator.generate(context, inputs, projectPath);
        if (res.isErr()) return err(res.error);
      } else {
        if (
          feature === M365SsoLaunchPageOptionItem().id ||
          feature === M365SearchAppOptionItem().id
        ) {
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
    } else if (scratch === CreateNewOfficeAddinOption().id) {
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

      const res = await OfficeAddinGenerator.generate(context, inputs, projectPath);
      if (res.isErr()) {
        return err(res.error);
      }
    }

    // generate unique projectId in teamsapp.yaml (optional)
    const ymlPath = path.join(projectPath, MetadataV3.configFile);
    if (fs.pathExistsSync(ymlPath)) {
      const ensureRes = await this.ensureTrackingId(projectPath, inputs.projectId);
      if (ensureRes.isErr()) return err(ensureRes.error);
      inputs.projectId = ensureRes.value;
    }

    if (inputs.platform === Platform.VSCode) {
      await globalStateUpdate(automaticNpmInstall, true);
    }
    context.projectPath = projectPath;

    if (inputs.teamsAppFromTdp) {
      const res = await developerPortalScaffoldUtils.updateFilesForTdp(
        context,
        inputs.teamsAppFromTdp,
        inputs
      );
      if (res.isErr()) {
        return err(res.error);
      }
    }
    return ok(projectPath);
  }

  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryEventName: "init-infra",
      telemetryComponentName: "coordinator",
      errorSource: CoordinatorSource,
    }),
  ])
  async initInfra(
    context: ContextV3,
    inputs: Inputs,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    if (inputs.proceed === InitOptionNo().id) return err(UserCancelError);
    const projectPath = inputs.projectPath;
    if (!projectPath) {
      return err(InvalidInputError("projectPath is undefined"));
    }
    const editor = inputs.editor;
    const capability = inputs.capability;
    const spfx = inputs.spfx;
    if (!editor) return err(InvalidInputError("editor is undefined"));
    if (!capability) return err(InvalidInputError("capability is undefined"));
    const templateName = InitTemplateName[`infra:${editor}:${capability}:${spfx}`];
    if (!templateName) {
      return err(InvalidInputError("templateName is undefined"));
    }
    const settingsRes = await settingsUtil.readSettings(projectPath, false);
    const originalTrackingId = settingsRes.isOk() ? settingsRes.value.trackingId : undefined;
    const res = await Generator.generateTemplate(context, projectPath, templateName, undefined);
    if (res.isErr()) return err(res.error);
    const ensureRes = await this.ensureTrackingId(projectPath, originalTrackingId);
    if (ensureRes.isErr()) return err(ensureRes.error);
    if (actionContext?.telemetryProps) actionContext.telemetryProps["project-id"] = ensureRes.value;
    if (editor === InitEditorVS().id) {
      const ensure = await this.ensureTeamsFxInCsproj(projectPath);
      if (ensure.isErr()) return err(ensure.error);
    }
    return ok(undefined);
  }

  async ensureTeamsFxInCsproj(projectPath: string): Promise<Result<undefined, FxError>> {
    const list = await fs.readdir(projectPath);
    const csprojFiles = list.filter((fileName) => fileName.endsWith(".csproj"));
    if (csprojFiles.length === 0) return ok(undefined);
    const filePath = csprojFiles[0];
    const xmlStringOld = (await fs.readFile(filePath, { encoding: "utf8" })).toString();
    const jsonObj = await xml2js.parseStringPromise(xmlStringOld);
    let ItemGroup = jsonObj.Project.ItemGroup;
    if (!ItemGroup) {
      ItemGroup = [];
      jsonObj.Project.ItemGroup = ItemGroup;
    }
    const existItems = ItemGroup.filter((item: any) => {
      if (item.ProjectCapability && item.ProjectCapability[0])
        if (item.ProjectCapability[0]["$"]?.Include === "TeamsFx") return true;
      return false;
    });
    if (existItems.length === 0) {
      const toAdd = {
        ProjectCapability: [
          {
            $: {
              Include: "TeamsFx",
            },
          },
        ],
      };
      ItemGroup.push(toAdd);
      const builder = new xml2js.Builder();
      const xmlStringNew = builder.buildObject(jsonObj);
      await fs.writeFile(filePath, xmlStringNew, { encoding: "utf8" });
    }
    return ok(undefined);
  }

  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryEventName: "init-debug",
      telemetryComponentName: "coordinator",
      errorSource: CoordinatorSource,
    }),
  ])
  async initDebug(
    context: ContextV3,
    inputs: Inputs,
    actionContext?: ActionContext
  ): Promise<Result<undefined, FxError>> {
    if (inputs.proceed === InitOptionNo().id) return err(UserCancelError);
    const projectPath = inputs.projectPath;
    if (!projectPath) {
      return err(InvalidInputError("projectPath is undefined"));
    }
    const editor = inputs.editor;
    const capability = inputs.capability;
    const spfx = inputs.spfx;
    if (!editor) return err(InvalidInputError("editor is undefined"));
    if (!capability) return err(InvalidInputError("capability is undefined"));
    const templateName = InitTemplateName[`debug:${editor}:${capability}:${spfx}`];
    if (!templateName) {
      return err(InvalidInputError("templateName is undefined"));
    }
    if (editor === InitEditorVSCode().id) {
      const exists = await fs.pathExists(path.join(projectPath, ".vscode"));
      context.templateVariables = { dotVscodeFolderName: exists ? ".vscode-teamsfx" : ".vscode" };
    }
    const settingsRes = await settingsUtil.readSettings(projectPath, false);
    const originalTrackingId = settingsRes.isOk() ? settingsRes.value.trackingId : undefined;
    const res = await Generator.generateTemplate(context, projectPath, templateName, undefined);
    if (res.isErr()) return err(res.error);
    const ensureRes = await this.ensureTrackingId(projectPath, originalTrackingId);
    if (ensureRes.isErr()) return err(ensureRes.error);
    if (actionContext?.telemetryProps) actionContext.telemetryProps["project-id"] = ensureRes.value;
    if (editor === InitEditorVS().id) {
      const ensure = await this.ensureTeamsFxInCsproj(projectPath);
      if (ensure.isErr()) return err(ensure.error);
    }
    return ok(undefined);
  }

  async ensureTrackingId(
    projectPath: string,
    trackingId: string | undefined = undefined
  ): Promise<Result<string, FxError>> {
    // generate unique trackingId in settings.json
    const settingsRes = await settingsUtil.readSettings(projectPath, false);
    if (settingsRes.isErr()) return err(settingsRes.error);
    const settings = settingsRes.value;
    if (settings.trackingId && !trackingId) return ok(settings.trackingId); // do nothing
    settings.trackingId = trackingId || uuid.v4();
    await settingsUtil.writeSettings(projectPath, settings);
    return ok(settings.trackingId);
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
    if (BotFeatureIds().includes(features)) {
      component = Container.get(ComponentNames.TeamsBot);
    } else if (TabFeatureIds().includes(features)) {
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
    } else if (features === TabSPFxNewUIItem().id) {
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

  async preProvisionForVS(
    ctx: DriverContext,
    inputs: InputsWithProjectPath
  ): Promise<
    Result<
      {
        needAzureLogin: boolean;
        needM365Login: boolean;
        resolvedAzureSubscriptionId?: string;
        resolvedAzureResourceGroupName?: string;
      },
      FxError
    >
  > {
    const res: {
      needAzureLogin: boolean;
      needM365Login: boolean;
      resolvedAzureSubscriptionId?: string;
      resolvedAzureResourceGroupName?: string;
    } = {
      needAzureLogin: false,
      needM365Login: false,
    };

    // 1. parse yml to cycles
    const templatePath =
      inputs["workflowFilePath"] || pathUtils.getYmlFilePath(ctx.projectPath, inputs.env);
    const maybeProjectModel = await metadataUtil.parse(templatePath, inputs.env);
    if (maybeProjectModel.isErr()) {
      return err(maybeProjectModel.error);
    }
    const projectModel = maybeProjectModel.value;
    const cycles: ILifecycle[] = [
      projectModel.registerApp,
      projectModel.provision,
      projectModel.configureApp,
    ].filter((c) => c !== undefined) as ILifecycle[];

    // 2. check each cycle
    for (const cycle of cycles) {
      const unresolvedPlaceholders = cycle.resolvePlaceholders();
      let firstArmDriver;
      for (const driver of cycle.driverDefs) {
        if (AzureActions.includes(driver.uses)) {
          res.needAzureLogin = true;
          if (!firstArmDriver) {
            firstArmDriver = driver;
          }
        }
        if (M365Actions.includes(driver.uses)) {
          res.needM365Login = true;
        }
      }
      if (firstArmDriver) {
        const withObj = firstArmDriver.with as any;
        res.resolvedAzureSubscriptionId = unresolvedPlaceholders.includes("AZURE_SUBSCRIPTION_ID")
          ? undefined
          : withObj["subscriptionId"];
        res.resolvedAzureResourceGroupName = unresolvedPlaceholders.includes(
          "AZURE_RESOURCE_GROUP_NAME"
        )
          ? undefined
          : withObj["resourceGroupName"];
      }
    }
    return ok(res);
  }

  @hooks([
    ActionExecutionMW({
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
    const output: DotenvParseOutput = {};
    const folderName = path.parse(ctx.projectPath).name;

    // 1. parse yml
    const templatePath =
      inputs["workflowFilePath"] || pathUtils.getYmlFilePath(ctx.projectPath, inputs.env);
    const maybeProjectModel = await metadataUtil.parse(templatePath, inputs.env);
    if (maybeProjectModel.isErr()) {
      return err(maybeProjectModel.error);
    }
    const projectModel = maybeProjectModel.value;

    const cycles = [
      // projectModel.registerApp,
      projectModel.provision,
      // projectModel.configureApp,
    ].filter((c) => c !== undefined) as Lifecycle[];

    if (cycles.length === 0) {
      return err(new LifeCycleUndefinedError("provision"));
    }

    // 2. M365 sign in and tenant check if needed.
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
        return err(tenantInfoInTokenRes.error);
      }
      m365tenantInfo = tenantInfoInTokenRes.value;

      const checkM365TenatRes = await provisionUtils.ensureM365TenantMatchesV3(
        tenantSwitchCheckActions,
        m365tenantInfo?.tenantIdInToken,
        inputs.env,
        CoordinatorSource
      );
      if (checkM365TenatRes.isErr()) {
        return err(checkM365TenatRes.error);
      }
    }

    // We will update targetResourceGroupInfo if creating resource group is needed and create the resource group later after confirming with the user
    let targetResourceGroupInfo: ResourceGroupInfo = {
      createNewResourceGroup: false,
      name: "",
      location: "",
    };

    let resolvedSubscriptionId: string | undefined;
    let resolvedResourceGroupName: string | undefined;
    let azureSubInfo = undefined;
    if (containsAzure) {
      //ensure RESOURCE_SUFFIX
      if (!process.env.RESOURCE_SUFFIX) {
        const suffix = process.env.RESOURCE_SUFFIX || uuid.v4().slice(0, 6);
        process.env.RESOURCE_SUFFIX = suffix;
        output.RESOURCE_SUFFIX = suffix;
      }
      // check whether placeholders are resolved
      let subscriptionUnresolved = false;
      let resourceGroupUnresolved = false;
      for (const cycle of cycles) {
        const unresolvedPlaceHolders = cycle.resolvePlaceholders();
        if (unresolvedPlaceHolders.includes("AZURE_SUBSCRIPTION_ID")) subscriptionUnresolved = true;
        else {
          cycle.driverDefs?.forEach((driver) => {
            const withObj = driver.with as any;
            if (withObj && withObj.subscriptionId && resolvedSubscriptionId === undefined)
              resolvedSubscriptionId = withObj.subscriptionId;
          });
        }
        if (unresolvedPlaceHolders.includes("AZURE_RESOURCE_GROUP_NAME"))
          resourceGroupUnresolved = true;
        else {
          cycle.driverDefs?.forEach((driver) => {
            const withObj = driver.with as any;
            if (withObj && withObj.resourceGroupName && resolvedResourceGroupName === undefined)
              resolvedResourceGroupName = withObj.resourceGroupName;
          });
        }
      }

      // ensure subscription, pop up UI to select if necessary
      if (subscriptionUnresolved) {
        if (inputs["targetSubscriptionId"]) {
          process.env.AZURE_SUBSCRIPTION_ID = inputs["targetSubscriptionId"];
          output.AZURE_SUBSCRIPTION_ID = inputs["targetSubscriptionId"];
        } else {
          const ensureRes = await provisionUtils.ensureSubscription(
            ctx.azureAccountProvider,
            undefined
          );
          if (ensureRes.isErr()) return err(ensureRes.error);
          const subInfo = ensureRes.value;
          if (subInfo && subInfo.subscriptionId) {
            process.env.AZURE_SUBSCRIPTION_ID = subInfo.subscriptionId;
            output.AZURE_SUBSCRIPTION_ID = subInfo.subscriptionId;
          }
        }
        resolvedSubscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
      }

      // will not happen
      // if (!resolvedSubscriptionId) {
      //   return err(new UnresolvedPlaceholderError("coordinator", "AZURE_SUBSCRIPTION_ID"));
      // }

      // ensure resource group
      if (resourceGroupUnresolved) {
        const inputRG = inputs["targetResourceGroupName"];
        const inputLocation = inputs["targetResourceLocationName"];
        if (inputRG && inputLocation) {
          // targetResourceGroupName is from VS inputs, which means create resource group if not exists
          targetResourceGroupInfo.name = inputRG;
          targetResourceGroupInfo.location = inputLocation;
          targetResourceGroupInfo.createNewResourceGroup = true; // create resource group if not exists
        } else {
          const defaultRg = `rg-${folderName}${process.env.RESOURCE_SUFFIX}-${inputs.env}`;
          const ensureRes = await provisionUtils.ensureResourceGroup(
            ctx.azureAccountProvider,
            resolvedSubscriptionId!,
            undefined,
            defaultRg
          );
          if (ensureRes.isErr()) return err(ensureRes.error);
          targetResourceGroupInfo = ensureRes.value;
          if (!targetResourceGroupInfo.createNewResourceGroup) {
            process.env.AZURE_RESOURCE_GROUP_NAME = targetResourceGroupInfo.name;
            output.AZURE_RESOURCE_GROUP_NAME = targetResourceGroupInfo.name;
          }
        }
        resolvedResourceGroupName = targetResourceGroupInfo.name;
      }

      // consent user
      await ctx.azureAccountProvider.getIdentityCredentialAsync(true); // make sure login if ensureSubScription() is not called.
      try {
        await ctx.azureAccountProvider.setSubscription(resolvedSubscriptionId!); //make sure sub is correctly set if ensureSubscription() is not called.
      } catch (e) {
        return err(assembleError(e));
      }
      azureSubInfo = await ctx.azureAccountProvider.getSelectedSubscription(false);
      if (!azureSubInfo) {
        return err(new SelectSubscriptionError());
      }
      const consentRes = await provisionUtils.askForProvisionConsentV3(
        ctx,
        m365tenantInfo,
        azureSubInfo,
        inputs.env
      );
      if (consentRes.isErr()) return err(consentRes.error);

      // create resource group if necessary
      if (targetResourceGroupInfo.createNewResourceGroup) {
        const createRgRes = await resourceGroupHelper.createNewResourceGroup(
          targetResourceGroupInfo.name,
          ctx.azureAccountProvider,
          resolvedSubscriptionId!,
          targetResourceGroupInfo.location
        );
        if (createRgRes.isErr()) {
          const error = createRgRes.error;
          if (error.name !== "ResourceGroupExists") {
            return err(error);
          }
        }
        process.env.AZURE_RESOURCE_GROUP_NAME = targetResourceGroupInfo.name;
        output.AZURE_RESOURCE_GROUP_NAME = targetResourceGroupInfo.name;
      }
    }

    // execute
    const summaryReporter = new SummaryReporter(cycles, ctx.logProvider);
    try {
      const maybeDescription = summaryReporter.getLifecycleDescriptions();
      if (maybeDescription.isErr()) {
        return err(maybeDescription.error);
      }
      ctx.logProvider.info(
        `Executing app registration and provision ${EOL}${EOL}${maybeDescription.value}${EOL}`
      );
      for (const [index, cycle] of cycles.entries()) {
        const execRes = await cycle.execute(ctx);
        summaryReporter.updateLifecycleState(index, execRes);
        const result = this.convertExecuteResult(execRes.result, templatePath);
        merge(output, result[0]);
        if (result[1]) {
          inputs.envVars = output;
          return err(result[1]);
        }
      }
    } finally {
      const summary = summaryReporter.getLifecycleSummary(inputs.createdEnvFile);
      ctx.logProvider.info(`Execution summary:${EOL}${EOL}${summary}${EOL}`);
    }

    // show provisioned resources
    const msg = getLocalizedString("core.provision.successNotice", folderName);
    if (azureSubInfo) {
      const url = getResourceGroupInPortal(
        azureSubInfo.subscriptionId,
        azureSubInfo.tenantId,
        resolvedResourceGroupName
      );
      if (url && ctx.platform !== Platform.CLI) {
        const title = getLocalizedString("core.provision.viewResources");
        ctx.ui?.showMessage("info", msg, false, title).then((result: any) => {
          const userSelected = result.isOk() ? result.value : undefined;
          if (userSelected === title) {
            ctx.ui?.openUrl(url);
          }
        });
      } else {
        if (url && ctx.platform === Platform.CLI) {
          ctx.ui?.showMessage(
            "info",
            [
              {
                content: `${msg} View the provisioned resources from `,
                color: Colors.BRIGHT_GREEN,
              },
              {
                content: url,
                color: Colors.BRIGHT_CYAN,
              },
            ],
            false
          );
        } else {
          ctx.ui?.showMessage("info", msg, false);
        }
      }
    } else {
      ctx.ui?.showMessage("info", msg, false);
    }
    ctx.logProvider.info(msg);

    return ok(output);
  }

  convertExecuteResult(
    execRes: Result<ExecutionOutput, ExecutionError>,
    templatePath: string
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
          error = new UnresolvedPlaceholderError(
            reason.failedDriver.uses,
            placeholders,
            templatePath
          );
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
  ): Promise<Result<DotenvParseOutput, FxError>> {
    const output: DotenvParseOutput = {};
    const templatePath =
      inputs["workflowFilePath"] || pathUtils.getYmlFilePath(ctx.projectPath, inputs.env);
    const maybeProjectModel = await metadataUtil.parse(templatePath, inputs.env);
    if (maybeProjectModel.isErr()) {
      return err(maybeProjectModel.error);
    }
    const projectModel = maybeProjectModel.value;
    if (projectModel.deploy) {
      //check whether deploy to azure
      let containsAzure = false;
      projectModel.deploy.driverDefs?.forEach((def) => {
        if (AzureDeployActions.includes(def.uses)) {
          containsAzure = true;
        }
      });

      //consent
      if (containsAzure) {
        const consent = await deployUtils.askForDeployConsentV3(ctx);
        if (consent.isErr()) {
          return err(consent.error);
        }
      }

      const summaryReporter = new SummaryReporter([projectModel.deploy], ctx.logProvider);
      try {
        const maybeDescription = summaryReporter.getLifecycleDescriptions();
        if (maybeDescription.isErr()) {
          return err(maybeDescription.error);
        }
        ctx.logProvider.info(`Executing deploy ${EOL}${EOL}${maybeDescription.value}${EOL}`);
        const execRes = await projectModel.deploy.execute(ctx);
        summaryReporter.updateLifecycleState(0, execRes);
        const result = this.convertExecuteResult(execRes.result, templatePath);
        merge(output, result[0]);
        if (result[1]) {
          inputs.envVars = output;
          return err(result[1]);
        }

        // show message box after deploy
        const botTroubleShootMsg = getBotTroubleShootMessage(false);
        const msg =
          getLocalizedString("core.common.LifecycleComplete", "deploy") +
          botTroubleShootMsg.textForLogging;
        ctx.ui?.showMessage("info", msg, false);
      } finally {
        const summary = summaryReporter.getLifecycleSummary();
        ctx.logProvider.info(`Execution summary:${EOL}${EOL}${summary}${EOL}`);
      }
    } else {
      return err(new LifeCycleUndefinedError("deploy"));
    }
    return ok(output);
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
  ): Promise<Result<DotenvParseOutput, FxError>> {
    const output: DotenvParseOutput = {};
    const templatePath = pathUtils.getYmlFilePath(ctx.projectPath, inputs.env);
    const maybeProjectModel = await metadataUtil.parse(templatePath, inputs.env);
    if (maybeProjectModel.isErr()) {
      return err(maybeProjectModel.error);
    }
    const projectModel = maybeProjectModel.value;
    if (projectModel.publish) {
      const steps = projectModel.publish.driverDefs.length;
      ctx.progressBar = ctx.ui?.createProgressBar(
        getLocalizedString("core.progress.publish"),
        steps
      );
      await ctx.progressBar?.start();

      const summaryReporter = new SummaryReporter([projectModel.publish], ctx.logProvider);
      try {
        const maybeDescription = summaryReporter.getLifecycleDescriptions();
        if (maybeDescription.isErr()) {
          return err(maybeDescription.error);
        }
        ctx.logProvider.info(`Executing publish ${EOL}${EOL}${maybeDescription.value}${EOL}`);

        const execRes = await projectModel.publish.execute(ctx);
        const result = this.convertExecuteResult(execRes.result, templatePath);
        merge(output, result[0]);
        summaryReporter.updateLifecycleState(0, execRes);
        if (result[1]) {
          await ctx.progressBar?.end(false);
          const msg = getLocalizedString(
            "core.progress.failureResult",
            getLocalizedString("core.progress.publish")
          );
          ctx.ui?.showMessage("error", msg, false);
          inputs.envVars = output;
          return err(result[1]);
        } else {
          await ctx.progressBar?.end(true);
          const msg = getLocalizedString(
            "core.progress.successResult",
            steps,
            steps,
            getLocalizedString("core.progress.publish")
          );
          const adminPortal = getLocalizedString("plugins.appstudio.adminPortal");
          ctx.ui?.showMessage("info", msg, false, adminPortal).then((value) => {
            if (value.isOk() && value.value === adminPortal) {
              ctx.ui?.openUrl(Constants.TEAMS_ADMIN_PORTAL);
            }
          });
        }
      } finally {
        const summary = summaryReporter.getLifecycleSummary();
        ctx.logProvider.info(`Execution summary:${EOL}${EOL}${summary}${EOL}`);
      }
    } else {
      return err(new LifeCycleUndefinedError("publish"));
    }
    return ok(output);
  }

  @hooks([
    ActionExecutionMW({
      enableTelemetry: true,
      telemetryEventName: TelemetryEvent.PublishInDeveloperPortal,
      telemetryComponentName: "coordinator",
      errorSource: CoordinatorSource,
    }),
  ])
  async publishInDeveloperPortal(
    ctx: ContextV3,
    inputs: InputsWithProjectPath,
    actionContext?: ActionContext
  ): Promise<Result<Void, FxError>> {
    // update teams app
    if (!ctx.tokenProvider) {
      return err(new ObjectIsUndefinedError("tokenProvider"));
    }
    if (!inputs[CoreQuestionNames.AppPackagePath]) {
      return err(new ObjectIsUndefinedError("appPackagePath"));
    }
    const updateRes = await updateTeamsAppV3ForPublish(ctx as ResourceContextV3, inputs);

    if (updateRes.isErr()) {
      return err(updateRes.error);
    }
    let loginHint = "";
    const accountRes = await ctx.tokenProvider.m365TokenProvider.getJsonObject({
      scopes: AppStudioScopes,
    });
    if (accountRes.isOk()) {
      loginHint = accountRes.value.unique_name as string;
    }
    await ctx.userInteraction.openUrl(
      `https://dev.teams.microsoft.com/apps/${updateRes.value}/distributions/app-catalog?login_hint=${loginHint}&referrer=teamstoolkit_${inputs.platform}`
    );
    return ok(Void);
  }
}

export const coordinator = new Coordinator();
