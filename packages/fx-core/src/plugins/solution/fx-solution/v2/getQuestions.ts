import {
  AzureSolutionSettings,
  DynamicPlatforms,
  err,
  Func,
  FxError,
  Inputs,
  InvalidInputError,
  ok,
  OptionItem,
  Platform,
  QTreeNode,
  Result,
  returnUserError,
  Stage,
  SubscriptionInfo,
  TokenProvider,
  UserError,
  v2,
} from "@microsoft/teamsfx-api";
import Container from "typedi";
import { getStrings } from "../../../../common/tools";
import { HelpLinks } from "../../../../common/constants";
import { checkSubscription } from "../commonQuestions";
import { SolutionError, SolutionSource } from "../constants";
import {
  addCapabilityQuestion,
  AskSubscriptionQuestion,
  AzureResourceApim,
  AzureResourceFunction,
  AzureResourceSQL,
  AzureResourcesQuestion,
  BotOptionItem,
  createAddAzureResourceQuestion,
  createCapabilityQuestion,
  createV1CapabilityQuestion,
  DeployPluginSelectQuestion,
  FrontendHostTypeQuestion,
  GetUserEmailQuestion,
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
  MessageExtensionItem,
  ProgrammingLanguageQuestion,
  TabOptionItem,
  TabSPFxItem,
} from "../question";
import {
  getAllV2ResourcePluginMap,
  getAllV2ResourcePlugins,
  ResourcePluginsV2,
} from "../ResourcePluginContainer";
import { checkWetherProvisionSucceeded, getSelectedPlugins, isAzureProject } from "./utils";

export async function getQuestionsForScaffolding(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const node = new QTreeNode({ type: "group" });

  // 1. capabilities
  const capQuestion = createCapabilityQuestion();
  const capNode = new QTreeNode(capQuestion);
  node.addChild(capNode);

  // 1.1.1 SPFX Tab
  const spfxPlugin: v2.ResourcePlugin = Container.get<v2.ResourcePlugin>(
    ResourcePluginsV2.SpfxPlugin
  );
  if (spfxPlugin.getQuestionsForScaffolding) {
    const res = await spfxPlugin.getQuestionsForScaffolding(ctx, inputs);
    if (res.isErr()) return res;
    if (res.value) {
      const spfxNode = res.value as QTreeNode;
      spfxNode.condition = { equals: TabSPFxItem.id };
      if (spfxNode.data) capNode.addChild(spfxNode);
    }
  }

  // 1.1.2 Azure Tab
  const tabRes = await getTabScaffoldQuestionsV2(
    ctx,
    inputs,
    inputs.platform === Platform.VSCode ? false : true
  );
  if (tabRes.isErr()) return tabRes;
  if (tabRes.value) {
    const tabNode = tabRes.value;
    tabNode.condition = { equals: HostTypeOptionAzure.id };
    capNode.addChild(tabNode);
  }

  // 1.2 Bot
  const botPlugin: v2.ResourcePlugin = Container.get<v2.ResourcePlugin>(
    ResourcePluginsV2.BotPlugin
  );
  if (botPlugin.getQuestionsForScaffolding) {
    const res = await botPlugin.getQuestionsForScaffolding(ctx, inputs);
    if (res.isErr()) return res;
    if (res.value) {
      const botGroup = res.value as QTreeNode;
      botGroup.condition = { containsAny: [BotOptionItem.id, MessageExtensionItem.id] };
      capNode.addChild(botGroup);
    }
  }

  // 1.3 Language
  const programmingLanguage = new QTreeNode(ProgrammingLanguageQuestion);
  programmingLanguage.condition = { minItems: 1 };
  capNode.addChild(programmingLanguage);

  return ok(node);
}

export async function getTabScaffoldQuestionsV2(
  ctx: v2.Context,
  inputs: Inputs,
  addAzureResource: boolean
): Promise<Result<QTreeNode | undefined, FxError>> {
  const tabNode = new QTreeNode({ type: "group" });

  //Frontend plugin
  const fehostPlugin: v2.ResourcePlugin = Container.get<v2.ResourcePlugin>(
    ResourcePluginsV2.FrontendPlugin
  );
  if (fehostPlugin.getQuestionsForScaffolding) {
    const res = await fehostPlugin.getQuestionsForScaffolding(ctx, inputs);
    if (res.isErr()) return res;
    if (res.value) {
      const frontendNode = res.value as QTreeNode;
      if (frontendNode.data) tabNode.addChild(frontendNode);
    }
  }

  if (addAzureResource) {
    const azureResourceNode = new QTreeNode(AzureResourcesQuestion);
    tabNode.addChild(azureResourceNode);
    const functionPlugin: v2.ResourcePlugin = Container.get<v2.ResourcePlugin>(
      ResourcePluginsV2.FunctionPlugin
    );
    //Azure Function
    if (functionPlugin.getQuestionsForScaffolding) {
      const res = await functionPlugin.getQuestionsForScaffolding(ctx, inputs);
      if (res.isErr()) return res;
      if (res.value) {
        const azure_function = res.value as QTreeNode;
        azure_function.condition = { minItems: 1 };
        if (azure_function.data) azureResourceNode.addChild(azure_function);
      }
    }
    const sqlPlugin: v2.ResourcePlugin = Container.get<v2.ResourcePlugin>(
      ResourcePluginsV2.SqlPlugin
    );
    //Azure SQL
    if (sqlPlugin.getQuestionsForScaffolding) {
      const res = await sqlPlugin.getQuestionsForScaffolding(ctx, inputs);
      if (res.isErr()) return res;
      if (res.value) {
        const azure_sql = res.value as QTreeNode;
        azure_sql.condition = { contains: AzureResourceSQL.id };
        if (azure_sql.data) azureResourceNode.addChild(azure_sql);
      }
    }
  }
  return ok(tabNode);
}

export async function getQuestions(
  ctx: v2.Context,
  inputs: Inputs,
  envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
  tokenProvider: TokenProvider
): Promise<Result<QTreeNode | undefined, FxError>> {
  const stage = inputs.stage;
  if (!stage) {
    return err(new InvalidInputError(SolutionSource, "inputs.stage", "undefined"));
  }
  const isDynamicQuestion = DynamicPlatforms.includes(inputs.platform);
  const node = new QTreeNode({ type: "group" });
  const solutionSettings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;
  if (stage == Stage.migrateV1) {
    const capQuestion = createV1CapabilityQuestion();
    const capNode = new QTreeNode(capQuestion);
    node.addChild(capNode);
  } else if (stage === Stage.provision) {
    if (isDynamicQuestion) {
      const provisioned = checkWetherProvisionSucceeded(envInfo.state);
      if (provisioned) return ok(undefined);
    }
    let plugins: v2.ResourcePlugin[] = [];
    if (isDynamicQuestion) {
      plugins = getSelectedPlugins(solutionSettings);
    } else {
      plugins = getAllV2ResourcePlugins();
      node.addChild(new QTreeNode(AskSubscriptionQuestion));
    }
    for (const plugin of plugins) {
      if (plugin.getQuestions) {
        const getQuestionRes = await plugin.getQuestions(ctx, inputs, envInfo, tokenProvider);
        if (getQuestionRes.isErr()) return getQuestionRes;
        if (getQuestionRes.value) {
          const subnode = getQuestionRes.value as QTreeNode;
          node.addChild(subnode);
        }
      }
    }
  } else if (stage === Stage.deploy) {
    if (isDynamicQuestion) {
      const isAzure = isAzureProject(solutionSettings);
      const provisioned = checkWetherProvisionSucceeded(envInfo.state);
      if (isAzure && !provisioned) {
        return err(
          returnUserError(
            new Error(getStrings().solution.FailedToDeployBeforeProvision),
            SolutionSource,
            SolutionError.CannotDeployBeforeProvision,
            HelpLinks.WhyNeedProvision
          )
        );
      }
    }
    let plugins: v2.ResourcePlugin[] = [];
    if (isDynamicQuestion) {
      plugins = getSelectedPlugins(solutionSettings);
    } else {
      plugins = getAllV2ResourcePlugins();
    }
    plugins = plugins.filter((plugin) => !!plugin.deploy);
    if (plugins.length === 0) {
      return err(
        returnUserError(
          new Error("No resource to deploy"),
          SolutionSource,
          SolutionError.NoResourceToDeploy
        )
      );
    }
    const pluginPrefix = "fx-resource-";
    const options: OptionItem[] = plugins.map((plugin) => {
      const item: OptionItem = {
        id: plugin.name,
        label: plugin.displayName,
        cliName: plugin.name.replace(pluginPrefix, ""),
      };
      return item;
    });

    const selectQuestion = DeployPluginSelectQuestion;
    selectQuestion.staticOptions = options;
    selectQuestion.default = options.map((i) => i.id);
    const pluginSelection = new QTreeNode(selectQuestion);
    node.addChild(pluginSelection);

    for (const plugin of plugins) {
      if (plugin.getQuestions) {
        const getQuestionRes = await plugin.getQuestions(ctx, inputs, envInfo, tokenProvider);
        if (getQuestionRes.isErr()) return getQuestionRes;
        if (getQuestionRes.value) {
          const subnode = getQuestionRes.value as QTreeNode;
          subnode.condition = { contains: plugin.name };
          if (subnode.data) pluginSelection.addChild(subnode);
        }
      }
    }
  } else if (stage === Stage.publish) {
    if (isDynamicQuestion) {
      const isAzure = isAzureProject(solutionSettings);
      const provisioned = checkWetherProvisionSucceeded(envInfo.state);
      if (!provisioned) {
        const errorMsg = isAzure
          ? getStrings().solution.FailedToPublishBeforeProvision
          : getStrings().solution.SPFxAskProvisionBeforePublish;
        return err(
          returnUserError(
            new Error(errorMsg),
            SolutionSource,
            SolutionError.CannotPublishBeforeProvision,
            HelpLinks.WhyNeedProvision
          )
        );
      }
    }
    let plugins: v2.ResourcePlugin[] = [];
    if (isDynamicQuestion) {
      plugins = getSelectedPlugins(solutionSettings);
    } else {
      plugins = getAllV2ResourcePlugins();
    }
    plugins = plugins.filter((plugin) => !!plugin.publishApplication);
    for (const plugin of plugins) {
      if (plugin.getQuestions) {
        const getQuestionRes = await plugin.getQuestions(ctx, inputs, envInfo, tokenProvider);
        if (getQuestionRes.isErr()) return getQuestionRes;
        if (getQuestionRes.value) {
          const subnode = getQuestionRes.value as QTreeNode;
          node.addChild(subnode);
        }
      }
    }
  } else if (stage === Stage.grantPermission) {
    node.addChild(new QTreeNode(GetUserEmailQuestion));
  }
  return ok(node);
}

export async function getQuestionsForUserTask(
  ctx: v2.Context,
  inputs: Inputs,
  func: Func,
  envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
  tokenProvider: TokenProvider
): Promise<Result<QTreeNode | undefined, FxError>> {
  const namespace = func.namespace;
  const array = namespace.split("/");
  if (func.method === "addCapability") {
    return await getQuestionsForAddCapability(ctx, inputs);
  }
  if (func.method === "addResource") {
    return await getQuestionsForAddResource(ctx, inputs, func, envInfo, tokenProvider);
  }
  if (array.length == 2) {
    const pluginName = array[1];
    const pluginMap = getAllV2ResourcePluginMap();
    const plugin = pluginMap.get(pluginName);
    if (plugin && plugin.getQuestionsForUserTask) {
      return await plugin.getQuestionsForUserTask(ctx, inputs, func, envInfo, tokenProvider);
    }
  }
  return ok(undefined);
}

export async function getQuestionsForAddCapability(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const settings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;

  const isDynamicQuestion = DynamicPlatforms.includes(inputs.platform);
  if (!(settings.hostType === HostTypeOptionAzure.id) && isDynamicQuestion) {
    return err(
      returnUserError(
        new Error("Add capability is not supported for SPFx project"),
        SolutionSource,
        SolutionError.AddResourceNotSupport
      )
    );
  }

  const capabilities = settings.capabilities || [];

  const alreadyHaveTab = capabilities.includes(TabOptionItem.id);

  const alreadyHaveBotOrMe =
    capabilities.includes(BotOptionItem.id) || capabilities.includes(MessageExtensionItem.id);

  if (alreadyHaveBotOrMe && alreadyHaveTab) {
    const cannotAddCapWarnMsg =
      "Your App already has both Tab and Bot/Messaging extension, can not Add Capability.";
    ctx.userInteraction?.showMessage("error", cannotAddCapWarnMsg, false);
    return ok(undefined);
  }

  const addCapQuestion = addCapabilityQuestion(alreadyHaveTab, alreadyHaveBotOrMe);

  const addCapNode = new QTreeNode(addCapQuestion);

  //Tab sub tree
  if (!alreadyHaveTab || !isDynamicQuestion) {
    const tabRes = await getTabScaffoldQuestionsV2(ctx, inputs, false);
    if (tabRes.isErr()) return tabRes;
    if (tabRes.value) {
      const tabNode = tabRes.value;
      tabNode.condition = { contains: TabOptionItem.id };
      addCapNode.addChild(tabNode);
    }
  }
  // Bot has no question at all
  return ok(addCapNode);
}

export async function getQuestionsForAddResource(
  ctx: v2.Context,
  inputs: Inputs,
  func: Func,
  envInfo: v2.DeepReadonly<v2.EnvInfoV2>,
  tokenProvider: TokenProvider
): Promise<Result<QTreeNode | undefined, FxError>> {
  const settings = ctx.projectSetting.solutionSettings as AzureSolutionSettings;

  const isDynamicQuestion = DynamicPlatforms.includes(inputs.platform);

  if (
    isDynamicQuestion &&
    !(
      settings.hostType === HostTypeOptionAzure.id &&
      settings.capabilities &&
      settings.capabilities.includes(TabOptionItem.id)
    )
  ) {
    return err(
      new UserError(
        SolutionError.AddResourceNotSupport,
        "Add resource is only supported for Tab app hosted in Azure.",
        SolutionSource
      )
    );
  }

  const selectedPlugins = settings.activeResourcePlugins || [];

  if (!selectedPlugins) {
    return err(
      returnUserError(
        new Error("selectedPlugins is empty"),
        SolutionSource,
        SolutionError.InternelError
      )
    );
  }
  const functionPlugin: v2.ResourcePlugin = Container.get<v2.ResourcePlugin>(
    ResourcePluginsV2.FunctionPlugin
  );
  const sqlPlugin: v2.ResourcePlugin = Container.get<v2.ResourcePlugin>(
    ResourcePluginsV2.SqlPlugin
  );
  const apimPlugin: v2.ResourcePlugin = Container.get<v2.ResourcePlugin>(
    ResourcePluginsV2.ApimPlugin
  );
  const alreadyHaveFunction = selectedPlugins.includes(functionPlugin.name);
  const alreadyHaveSQL = selectedPlugins.includes(sqlPlugin.name);
  const alreadyHaveAPIM = selectedPlugins.includes(apimPlugin.name);

  const addQuestion = createAddAzureResourceQuestion(
    alreadyHaveFunction,
    alreadyHaveSQL,
    alreadyHaveAPIM,
    false // TODO: to support Key Vault plugin in fx-core v2
  );

  const addAzureResourceNode = new QTreeNode(addQuestion);

  // there two cases to add function re-scaffold: 1. select add function   2. select add sql and function is not selected when creating
  if (functionPlugin.getQuestionsForUserTask) {
    const res = await functionPlugin.getQuestionsForUserTask(
      ctx,
      inputs,
      func,
      envInfo,
      tokenProvider
    );
    if (res.isErr()) return res;
    if (res.value) {
      const azure_function = res.value as QTreeNode;
      if (alreadyHaveFunction) {
        // if already has function, the question will appear depends on whether user select function, otherwise, the question will always show
        azure_function.condition = { contains: AzureResourceFunction.id };
      } else {
        // if not function activated, select any option will trigger function question
        azure_function.condition = { minItems: 1 };
      }
      if (azure_function.data) addAzureResourceNode.addChild(azure_function);
    }
  }

  //Azure SQL
  if (sqlPlugin.getQuestionsForUserTask && !alreadyHaveSQL) {
    const res = await sqlPlugin.getQuestionsForUserTask(ctx, inputs, func, envInfo, tokenProvider);
    if (res.isErr()) return res;
    if (res.value) {
      const azure_sql = res.value as QTreeNode;
      azure_sql.condition = { contains: AzureResourceSQL.id };
      if (azure_sql.data) addAzureResourceNode.addChild(azure_sql);
    }
  }

  //APIM
  if (apimPlugin.getQuestionsForUserTask && (!alreadyHaveAPIM || !isDynamicQuestion)) {
    const res = await apimPlugin.getQuestionsForUserTask(ctx, inputs, func, envInfo, tokenProvider);
    if (res.isErr()) return res;
    if (res.value) {
      const groupNode = new QTreeNode({ type: "group" });
      groupNode.condition = { contains: AzureResourceApim.id };
      addAzureResourceNode.addChild(groupNode);
      const apim = res.value as QTreeNode;
      if (apim.data) {
        const funcNode = new QTreeNode(AskSubscriptionQuestion);
        AskSubscriptionQuestion.func = async (
          inputs: Inputs
        ): Promise<Result<SubscriptionInfo, FxError>> => {
          const res = await checkSubscription(envInfo, tokenProvider.azureAccountProvider);
          if (res.isOk()) {
            const sub = res.value;
            inputs.subscriptionId = sub.subscriptionId;
            inputs.tenantId = sub.tenantId;
          }
          return res;
        };
        groupNode.addChild(funcNode);
        groupNode.addChild(apim);
      }
    }
  }
  return ok(addAzureResourceNode);
}
