import { FxError, Inputs, ok, QTreeNode, Result, v2 } from "@microsoft/teamsfx-api";
import Container from "typedi";
import {
  AzureResourceSQL,
  AzureResourcesQuestion,
  BotOptionItem,
  createCapabilityQuestion,
  FrontendHostTypeQuestion,
  HostTypeOptionAzure,
  HostTypeOptionSPFx,
  MessageExtensionItem,
  ProgrammingLanguageQuestion,
  TabOptionItem,
} from "../question";
import { ResourcePluginsV2 } from "../ResourcePluginContainer";

export async function getQuestionsForScaffolding(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const node = new QTreeNode({ type: "group" });

  // 1. capabilities
  const capQuestion = createCapabilityQuestion();
  const capNode = new QTreeNode(capQuestion);
  node.addChild(capNode);

  // 1.1 hostType
  const hostTypeNode = new QTreeNode(FrontendHostTypeQuestion);
  hostTypeNode.condition = { contains: TabOptionItem.id };
  capNode.addChild(hostTypeNode);

  // 1.1.1 SPFX Tab
  const spfxPlugin: v2.ResourcePlugin = Container.get<v2.ResourcePlugin>(
    ResourcePluginsV2.SpfxPlugin
  );
  if (spfxPlugin.getQuestionsForScaffolding) {
    const res = await spfxPlugin.getQuestionsForScaffolding(ctx, inputs);
    if (res.isErr()) return res;
    if (res.value) {
      const spfxNode = res.value as QTreeNode;
      spfxNode.condition = { equals: HostTypeOptionSPFx.id };
      if (spfxNode.data) hostTypeNode.addChild(spfxNode);
    }
  }

  // 1.1.2 Azure Tab
  const tabRes = await getTabScaffoldQuestionsV2(ctx, inputs, true);
  if (tabRes.isErr()) return tabRes;
  if (tabRes.value) {
    const tabNode = tabRes.value;
    tabNode.condition = { equals: HostTypeOptionAzure.id };
    hostTypeNode.addChild(tabNode);
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
