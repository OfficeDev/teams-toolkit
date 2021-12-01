/* eslint-disable @typescript-eslint/ban-types */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import {
  ok,
  err,
  returnSystemError,
  returnUserError,
  FxError,
  Result,
  SolutionConfig,
  SolutionContext,
  AzureAccountProvider,
  SubscriptionInfo,
  QTreeNode,
  traverse,
  Inputs,
  UserInteraction,
  OptionItem,
  LogProvider,
  EnvConfigFileNameTemplate,
  EnvNamePlaceholder,
  v2,
  UserError,
  Void,
  Err,
} from "@microsoft/teamsfx-api";
import {
  GLOBAL_CONFIG,
  LOCATION,
  PluginNames,
  SUBSCRIPTION_NAME,
  RESOURCE_GROUP_NAME,
  SolutionError,
  SolutionSource,
  FailedToCheckResourceGroupExistenceError,
  SUBSCRIPTION_ID,
  UnauthorizedToCheckResourceGroupError,
} from "./constants";
import { v4 as uuidv4 } from "uuid";
import { ResourceManagementClient } from "@azure/arm-resources";
import { SubscriptionClient } from "@azure/arm-subscriptions";
import { PluginDisplayName } from "../../../common/constants";
import { isMultiEnvEnabled } from "../../../common";
import {
  CoreQuestionNames,
  QuestionNewResourceGroupLocation,
  QuestionNewResourceGroupName,
  QuestionSelectResourceGroup,
} from "../../../core/question";
import { getHashedEnv } from "../../../common/tools";
import { desensitize } from "../../../core/middleware/questionModel";
import { ResourceGroupsCreateOrUpdateResponse } from "@azure/arm-resources/esm/models";
import { SolutionPlugin } from "../../resource/localdebug/constants";
import {
  CustomizeResourceGroupType,
  TelemetryEvent,
  TelemetryProperty,
} from "../../../common/telemetry";
import { RestError } from "@azure/ms-rest-js";

const MsResources = "Microsoft.Resources";
const ResourceGroups = "resourceGroups";

export type AzureSubscription = {
  displayName: string;
  subscriptionId: string;
};

const DefaultResourceGroupLocation = "East US";
type ResourceGroupInfo = {
  createNewResourceGroup: boolean;
  name: string;
  location: string;
};

// TODO: use the emoji plus sign like Azure Functions extension
const newResourceGroupOption = "+ New resource group";

class CommonQuestions {
  resourceNameSuffix = "";
  resourceGroupName = "";
  tenantId = "";
  subscriptionId = "";
  subscriptionName = "";
  // default to East US for now
  location = "East US";
  teamsAppTenantId = "";
}

/**
 * make sure subscription is correct
 *
 */
export async function checkSubscription(
  envInfo: v2.EnvInfoV2,
  azureAccountProvider: AzureAccountProvider
): Promise<Result<SubscriptionInfo, FxError>> {
  const subscriptionId = envInfo.state?.get(PluginNames.SOLUTION)?.get(SUBSCRIPTION_ID);
  if (!isMultiEnvEnabled() || !subscriptionId) {
    const askSubRes = await azureAccountProvider.getSelectedSubscription(true);
    return ok(askSubRes!);
  }

  let subscriptionName = envInfo.state?.get(PluginNames.SOLUTION)?.get(SUBSCRIPTION_NAME) ?? "";
  if (subscriptionName.length > 0) {
    subscriptionName = `(${subscriptionName})`;
  }
  // make sure the user is logged in
  await azureAccountProvider.getAccountCredentialAsync(true);

  // verify valid subscription (permission)
  const subscriptions = await azureAccountProvider.listSubscriptions();
  const targetSubInfo = subscriptions.find((item) => item.subscriptionId === subscriptionId);
  if (!targetSubInfo) {
    return err(
      new UserError(
        SolutionError.SubscriptionNotFound,
        `The subscription '${subscriptionId}'${subscriptionName} for '${
          envInfo.envName
        }' environment is not found in the current account, please use the right Azure account or check the '${EnvConfigFileNameTemplate.replace(
          EnvNamePlaceholder,
          envInfo.envName
        )}' file.`,
        SolutionSource
      )
    );
  }
  return ok(targetSubInfo);
}

/**
 * check m365 tenant is right
 *
 */
export async function checkM365Tenant(
  envInfo: v2.EnvInfoV2,
  appStudioJson: object
): Promise<Result<Void, FxError>> {
  const m365TenantId = envInfo.state
    ?.get(PluginNames.SOLUTION)
    ?.get(SolutionPlugin.TeamsAppTenantId);
  if (!isMultiEnvEnabled() || !m365TenantId) {
    return ok(Void);
  }
  if ((appStudioJson as any).tid && (appStudioJson as any).tid != m365TenantId) {
    return err(
      new UserError(
        SolutionError.TeamsAppTenantIdNotRight,
        `The signed in M365 account does not match the M365 tenant used in previous provision for '${envInfo.envName}' environment. Please sign out and sign in with the correct M365 account.`,
        "Solution"
      )
    );
  }
  return ok(Void);
}

async function getQuestionsForResourceGroup(
  defaultResourceGroupName: string,
  existingResourceGroupNameLocations: [string, string][],
  availableLocations: string[]
) {
  const selectResourceGroup = QuestionSelectResourceGroup;

  const staticOptions: OptionItem[] = [
    { id: newResourceGroupOption, label: newResourceGroupOption },
  ];
  selectResourceGroup.staticOptions = staticOptions.concat(
    existingResourceGroupNameLocations.map((item) => {
      return {
        id: item[0],
        label: item[0],
        description: item[1],
      };
    })
  );

  const node = new QTreeNode(selectResourceGroup);

  const inputNewResourceGroupName = QuestionNewResourceGroupName;
  inputNewResourceGroupName.default = defaultResourceGroupName;
  const newResourceGroupNameNode = new QTreeNode(inputNewResourceGroupName);
  newResourceGroupNameNode.condition = { equals: newResourceGroupOption };
  node.addChild(newResourceGroupNameNode);

  const selectLocation = QuestionNewResourceGroupLocation;
  // TODO: maybe lazily load locations
  selectLocation.staticOptions = availableLocations;
  const newResourceGroupLocationNode = new QTreeNode(selectLocation);
  newResourceGroupNameNode.addChild(newResourceGroupLocationNode);

  return node.trim();
}

/**
 * Ask user to create a new resource group or use an exsiting resource group
 */
export async function askResourceGroupInfo(
  ctx: SolutionContext,
  rmClient: ResourceManagementClient,
  inputs: Inputs,
  ui: UserInteraction,
  defaultResourceGroupName: string
): Promise<Result<ResourceGroupInfo, FxError>> {
  if (!isMultiEnvEnabled()) {
    let exists = false;
    try {
      const checkRes = await rmClient.resourceGroups.checkExistence(defaultResourceGroupName);
      exists = !!checkRes.body;
    } catch (error) {
      ctx.logProvider?.warning(
        `Failed to check resource group existence ${defaultResourceGroupName}, assume non-existent, error '${error}'`
      );
    }
    return ok({
      createNewResourceGroup: !exists,
      name: defaultResourceGroupName,
      location: DefaultResourceGroupLocation,
    });
  }

  // TODO: support pagination
  let resourceGroupResults;
  try {
    resourceGroupResults = await rmClient.resourceGroups.list();
  } catch (error) {
    ctx.logProvider?.error(`Failed to list resource group: error '${error}'`);
    return err(
      returnSystemError(
        new Error(`Failed to list resource group`),
        SolutionSource,
        SolutionError.FailedToListResourceGroup
      )
    );
  }
  const resourceGroupNameLocations = resourceGroupResults
    .filter((item) => item.name)
    .map((item) => [item.name, item.location] as [string, string]);

  const locations = await getLocations(ctx, rmClient);
  if (locations.isErr()) {
    return err(locations.error);
  }

  const node = await getQuestionsForResourceGroup(
    defaultResourceGroupName,
    resourceGroupNameLocations,
    locations.value!
  );
  if (node) {
    const res = await traverse(node, inputs, ui);
    if (res.isErr()) {
      ctx.logProvider?.debug(
        `[${PluginDisplayName.Solution}] failed to run question model for target resource group.`
      );
      return err(res.error);
    }

    const desensitized = desensitize(node, inputs);
    ctx.logProvider?.info(
      `[${
        PluginDisplayName.Solution
      }] success to run question model for resource group, answers:${JSON.stringify(desensitized)}`
    );
  }

  const resourceGroupName = inputs.targetResourceGroupName;
  if (resourceGroupName === newResourceGroupOption) {
    return ok({
      name: inputs[CoreQuestionNames.NewResourceGroupName],
      location: inputs[CoreQuestionNames.NewResourceGroupLocation],
      createNewResourceGroup: true,
    });
  } else {
    const targetResourceGroupName = inputs.targetResourceGroupName;
    if (typeof targetResourceGroupName !== "string") {
      return err(
        returnSystemError(
          new Error(`Failed to get user input for resource group info`),
          SolutionSource,
          SolutionError.FailedToListResourceGroup
        )
      );
    }

    const target = resourceGroupNameLocations.find((item) => item[0] == targetResourceGroupName);
    const location = target![1]; // location must exist because the user can only select from this list.
    return ok({
      createNewResourceGroup: false,
      name: targetResourceGroupName,
      location: location,
    });
  }
}

async function getLocations(
  ctx: SolutionContext,
  rmClient: ResourceManagementClient
): Promise<Result<string[], FxError>> {
  const credential = await ctx.azureAccountProvider!.getAccountCredentialAsync();
  let subscriptionClient = undefined;
  if (credential) {
    subscriptionClient = new SubscriptionClient(credential);
  } else {
    throw returnUserError(
      new Error(`Failed to get azure credential`),
      SolutionSource,
      SolutionError.FailedToGetAzureCredential
    );
  }
  const askSubRes = await ctx.azureAccountProvider!.getSelectedSubscription(true);
  const listLocations = await subscriptionClient.subscriptions.listLocations(
    askSubRes!.subscriptionId
  );
  const locations = listLocations.map((item) => item.displayName);
  const providerData = await rmClient.providers.get(MsResources);
  const resourceTypeData = providerData.resourceTypes?.find(
    (rt) => rt.resourceType?.toLowerCase() === ResourceGroups.toLowerCase()
  );
  const resourceLocations = resourceTypeData?.locations;
  const rgLocations = resourceLocations?.filter((item) => locations.includes(item));
  if (!rgLocations || rgLocations.length == 0) {
    return err(
      returnUserError(
        new Error(`Failed to list resource group locations`),
        SolutionSource,
        SolutionError.FailedToListResourceGroupLocation
      )
    );
  }
  return ok(rgLocations);
}

async function getResourceGroupInfo(
  ctx: SolutionContext,
  rmClient: ResourceManagementClient,
  resourceGroupName: string
): Promise<ResourceGroupInfo | undefined> {
  try {
    const getRes = await rmClient.resourceGroups.get(resourceGroupName);
    if (getRes.name) {
      return {
        createNewResourceGroup: false,
        name: getRes.name,
        location: getRes.location,
      };
    }
  } catch (error) {
    ctx.logProvider?.error(
      `[${PluginDisplayName.Solution}] failed to get resource group '${resourceGroupName}'. error = '${error}'`
    );
  }

  return undefined;
}

/**
 * Asks common questions and puts the answers in the global namespace of SolutionConfig
 *
 */
async function askCommonQuestions(
  ctx: SolutionContext,
  appName: string,
  config: SolutionConfig,
  azureAccountProvider?: AzureAccountProvider,
  appstudioTokenJson?: object
): Promise<Result<CommonQuestions, FxError>> {
  if (appstudioTokenJson === undefined) {
    return err(
      returnSystemError(
        new Error("Graph token json is undefined"),
        SolutionSource,
        SolutionError.NoAppStudioToken
      )
    );
  }

  const m365TenantResult = await checkM365Tenant(ctx.envInfo, appstudioTokenJson);
  if (m365TenantResult.isErr()) {
    return err(m365TenantResult.error);
  }
  if (!azureAccountProvider) {
    return err(
      returnSystemError(
        new Error("azureAccountProvider is undefined"),
        "Solution",
        SolutionError.InternelError
      )
    );
  }

  const commonQuestions = new CommonQuestions();

  //1. check subscriptionId
  const subscriptionResult = await checkSubscription(ctx.envInfo, azureAccountProvider);
  if (subscriptionResult.isErr()) {
    return err(subscriptionResult.error);
  }
  const subscriptionId = subscriptionResult.value.subscriptionId;
  commonQuestions.subscriptionId = subscriptionId;
  commonQuestions.subscriptionName = subscriptionResult.value.subscriptionName;
  commonQuestions.tenantId = subscriptionResult.value.tenantId;
  ctx.logProvider?.info(
    `[${PluginDisplayName.Solution}] askCommonQuestions, step 1 - check subscriptionId pass!`
  );

  // Note setSubscription here will change the token returned by getAccountCredentialAsync according to the subscription selected.
  // So getting azureToken needs to precede setSubscription.
  const azureToken = await azureAccountProvider?.getAccountCredentialAsync();
  if (azureToken === undefined) {
    return err(
      returnUserError(
        new Error("Login to Azure using the Azure Account extension"),
        SolutionSource,
        SolutionError.NotLoginToAzure
      )
    );
  }

  //2. check resource group
  ctx.telemetryReporter?.sendTelemetryEvent(
    TelemetryEvent.CheckResourceGroupStart,
    ctx.answers?.env ? { [TelemetryProperty.Env]: getHashedEnv(ctx.answers.env) } : {}
  );

  const rmClient = new ResourceManagementClient(azureToken, subscriptionId);

  // Resource group info precedence are:
  //   1. ctx.answers, for CLI --resource-group argument, only support existing resource group
  //   2. env config (config.{envName}.json), for user customization, only support existing resource group
  //   3. states (state.{envName}.json), for reprovision
  //   4. asking user with a popup
  const resourceGroupNameFromEnvConfig = ctx.envInfo.config.azure?.resourceGroupName;
  const resourceGroupNameFromState = ctx.envInfo.state.get(GLOBAL_CONFIG)?.get(RESOURCE_GROUP_NAME);
  const resourceGroupLocationFromState = ctx.envInfo.state.get(GLOBAL_CONFIG)?.get(LOCATION);
  const defaultResourceGroupName = `${appName.replace(" ", "_")}${
    isMultiEnvEnabled() ? "-" + ctx.envInfo.envName : ""
  }-rg`;
  let resourceGroupInfo: ResourceGroupInfo;
  const telemetryProperties: { [key: string]: string } = {};
  if (ctx.answers?.env) {
    telemetryProperties[TelemetryProperty.Env] = getHashedEnv(ctx.answers.env);
  }

  if (ctx.answers?.targetResourceGroupName) {
    const maybeResourceGroupInfo = await getResourceGroupInfo(
      ctx,
      rmClient,
      ctx.answers.targetResourceGroupName
    );
    if (!maybeResourceGroupInfo) {
      // Currently we do not support creating resource group from command line arguments

      return err(
        returnUserError(
          new Error(
            `Resource group '${resourceGroupNameFromEnvConfig}' does not exist, please specify an existing resource group.`
          ),
          SolutionSource,
          SolutionError.ResourceGroupNotFound
        )
      );
    }
    telemetryProperties[TelemetryProperty.CustomizeResourceGroupType] =
      CustomizeResourceGroupType.CommandLine;
    resourceGroupInfo = maybeResourceGroupInfo;
  } else if (resourceGroupNameFromEnvConfig) {
    const resourceGroupName = resourceGroupNameFromEnvConfig;
    const maybeResourceGroupInfo = await getResourceGroupInfo(ctx, rmClient, resourceGroupName);
    if (!maybeResourceGroupInfo) {
      // Currently we do not support creating resource group by input config, so just throw an error.
      const envFile = EnvConfigFileNameTemplate.replace(EnvNamePlaceholder, ctx.envInfo.envName);
      return err(
        returnUserError(
          new Error(
            `Resource group '${resourceGroupName}' does not exist, please check your '${envFile}' file.`
          ),
          SolutionSource,
          SolutionError.ResourceGroupNotFound
        )
      );
    }
    telemetryProperties[TelemetryProperty.CustomizeResourceGroupType] =
      CustomizeResourceGroupType.EnvConfig;
    resourceGroupInfo = maybeResourceGroupInfo;
  } else if (resourceGroupNameFromState && resourceGroupLocationFromState) {
    const maybeExist = await checkResourceGroupExistence(
      rmClient,
      resourceGroupNameFromState,
      subscriptionResult.value.subscriptionId,
      subscriptionResult.value.subscriptionName
    );
    if (maybeExist.isErr()) {
      return err(maybeExist.error);
    }
    const exist = maybeExist.value;
    resourceGroupInfo = {
      createNewResourceGroup: !exist,
      name: resourceGroupNameFromState,
      location: resourceGroupLocationFromState,
    };

    telemetryProperties[TelemetryProperty.CustomizeResourceGroupType] =
      CustomizeResourceGroupType.EnvState;
  } else if (ctx.answers && ctx.ui) {
    const resourceGroupInfoResult = await askResourceGroupInfo(
      ctx,
      rmClient,
      ctx.answers,
      ctx.ui,
      defaultResourceGroupName
    );
    if (resourceGroupInfoResult.isErr()) {
      return err(resourceGroupInfoResult.error);
    }

    resourceGroupInfo = resourceGroupInfoResult.value;
    if (resourceGroupInfo.createNewResourceGroup) {
      if (resourceGroupInfo.name === defaultResourceGroupName) {
        telemetryProperties[TelemetryProperty.CustomizeResourceGroupType] =
          CustomizeResourceGroupType.InteractiveCreateDefault;
      } else {
        telemetryProperties[TelemetryProperty.CustomizeResourceGroupType] =
          CustomizeResourceGroupType.InteractiveCreateCustomized;
      }
    } else {
      telemetryProperties[TelemetryProperty.CustomizeResourceGroupType] =
        CustomizeResourceGroupType.InteractiveUseExisting;
    }
  } else {
    // fall back to default values when user interaction is not available
    resourceGroupInfo = {
      createNewResourceGroup: true,
      name: defaultResourceGroupName,
      location: DefaultResourceGroupLocation,
    };
    telemetryProperties[TelemetryProperty.CustomizeResourceGroupType] =
      CustomizeResourceGroupType.FallbackDefault;
  }

  ctx.telemetryReporter?.sendTelemetryEvent(TelemetryEvent.CheckResourceGroup, telemetryProperties);

  if (resourceGroupInfo.createNewResourceGroup) {
    const maybeRgName = await createNewResourceGroup(
      rmClient,
      resourceGroupInfo,
      subscriptionResult.value.subscriptionId,
      subscriptionResult.value.subscriptionName,
      ctx.logProvider
    );
    if (maybeRgName.isErr()) {
      return err(maybeRgName.error);
    }
    resourceGroupInfo.name = maybeRgName.value;
  }
  commonQuestions.resourceGroupName = resourceGroupInfo.name;
  commonQuestions.location = resourceGroupInfo.location;
  ctx.logProvider?.info(
    `[${PluginDisplayName.Solution}] askCommonQuestions, step 2 - check resource group pass!`
  );

  // teamsAppTenantId
  const teamsAppTenantId = (appstudioTokenJson as any).tid;
  if (
    teamsAppTenantId === undefined ||
    !(typeof teamsAppTenantId === "string") ||
    teamsAppTenantId.length === 0
  ) {
    return err(
      returnSystemError(
        new Error("Cannot find Teams app tenant id"),
        SolutionSource,
        SolutionError.NoTeamsAppTenantId
      )
    );
  } else {
    commonQuestions.teamsAppTenantId = teamsAppTenantId;
  }
  ctx.logProvider?.info(
    `[${PluginDisplayName.Solution}] askCommonQuestions, step 3 - check teamsAppTenantId pass!`
  );

  //resourceNameSuffix
  const resourceNameSuffix = config.get(GLOBAL_CONFIG)?.getString("resourceNameSuffix");
  if (!resourceNameSuffix) commonQuestions.resourceNameSuffix = uuidv4().substr(0, 6);
  else commonQuestions.resourceNameSuffix = resourceNameSuffix;
  ctx.logProvider?.info(
    `[${PluginDisplayName.Solution}] askCommonQuestions, step 4 - check resourceNameSuffix pass!`
  );

  ctx.logProvider?.info(
    `[${PluginDisplayName.Solution}] askCommonQuestions, step 5 - check tenantId pass!`
  );

  return ok(commonQuestions);
}

/**
 * Asks for userinput and fills the answers in global config.
 *
 * @param config reference to solution config
 * @param dialog communication channel to Core Module
 */
export async function fillInCommonQuestions(
  ctx: SolutionContext,
  appName: string,
  config: SolutionConfig,
  azureAccountProvider?: AzureAccountProvider,
  // eslint-disable-next-line @typescript-eslint/ban-types
  appStudioJson?: object
): Promise<Result<SolutionConfig, FxError>> {
  const result = await askCommonQuestions(
    ctx,
    appName,
    config,
    azureAccountProvider,
    appStudioJson
  );
  if (result.isOk()) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const globalConfig = config.get(GLOBAL_CONFIG)!;
    result.map((commonQuestions) => {
      for (const [k, v] of Object.entries(commonQuestions)) {
        globalConfig.set(k, v);
      }
    });
    return ok(config);
  }
  return result.map((_) => config);
}

async function createNewResourceGroup(
  rmClient: ResourceManagementClient,
  rgInfo: ResourceGroupInfo,
  subscriptionId: string,
  subscriptionName: string,
  logProvider?: LogProvider
): Promise<Result<string, FxError>> {
  const maybeExist = await checkResourceGroupExistence(
    rmClient,
    rgInfo.name,
    subscriptionId,
    subscriptionName
  );
  if (maybeExist.isErr()) {
    return err(maybeExist.error);
  }

  if (maybeExist.value) {
    return err(
      returnUserError(
        new Error(`Failed to create resource group "${rgInfo.name}": the resource group exists`),
        SolutionSource,
        SolutionError.FailedToCreateResourceGroup
      )
    );
  }

  let response: ResourceGroupsCreateOrUpdateResponse;
  try {
    response = await rmClient.resourceGroups.createOrUpdate(rgInfo.name, {
      location: rgInfo.location,
      tags: { "created-by": "teamsfx" },
    });
  } catch (e) {
    let errMsg: string;
    if (e instanceof Error) {
      errMsg = `Failed to create resource group ${rgInfo.name} due to ${e.name}:${e.message}`;
    } else {
      errMsg = `Failed to create resource group ${
        rgInfo.name
      } due to unknown error ${JSON.stringify(e)}`;
    }

    return err(
      returnUserError(new Error(errMsg), SolutionSource, SolutionError.FailedToCreateResourceGroup)
    );
  }

  if (response.name === undefined) {
    return err(
      returnSystemError(
        new Error(`Failed to create resource group ${rgInfo.name}`),
        SolutionSource,
        SolutionError.FailedToCreateResourceGroup
      )
    );
  }
  logProvider?.info(
    `[${PluginDisplayName.Solution}] askCommonQuestions - resource group:'${response.name}' created!`
  );
  return ok(response.name);
}

function handleRestError<T>(
  restError: RestError,
  resourceGroupName: string,
  subscriptionId: string,
  subscriptionName: string
): Err<T, FxError> {
  // ARM API will return 403 with empty body when users does not have permission to access the resource group
  if (restError.statusCode === 403) {
    return err(
      new UnauthorizedToCheckResourceGroupError(resourceGroupName, subscriptionId, subscriptionName)
    );
  } else {
    return err(
      new FailedToCheckResourceGroupExistenceError(
        restError,
        resourceGroupName,
        subscriptionId,
        subscriptionName
      )
    );
  }
}

export async function checkResourceGroupExistence(
  rmClient: ResourceManagementClient,
  resourceGroupName: string,
  subscriptionId: string,
  subscriptionName: string
): Promise<Result<boolean, FxError>> {
  try {
    const checkRes = await rmClient.resourceGroups.checkExistence(resourceGroupName);
    return ok(!!checkRes.body);
  } catch (e) {
    if (e instanceof RestError) {
      return handleRestError(e, resourceGroupName, subscriptionId, subscriptionName);
    } else {
      return err(
        new FailedToCheckResourceGroupExistenceError(
          e,
          resourceGroupName,
          subscriptionId,
          subscriptionName
        )
      );
    }
  }
}
