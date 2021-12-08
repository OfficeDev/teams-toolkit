import { FxError, Inputs, QTreeNode, Result, v2, ok } from "@microsoft/teamsfx-api";
import Container from "typedi";
import { TabSPFxItem } from "../fx-solution/question";
import { ResourcePluginsV2 } from "../fx-solution/ResourcePluginContainer";

export async function getQuestionsForScaffolding(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<QTreeNode | QTreeNode[] | undefined, FxError>> {
  const spfxPlugin: v2.ResourcePlugin = Container.get<v2.ResourcePlugin>(
    ResourcePluginsV2.SpfxPlugin
  );
  if (spfxPlugin.getQuestionsForScaffolding) {
    const res = await spfxPlugin.getQuestionsForScaffolding(ctx, inputs);
    if (res.isErr()) return res;
    if (res.value) {
      const spfxNode = res.value as QTreeNode;
      spfxNode.condition = { contains: TabSPFxItem.id };
      return ok(spfxNode);
    }
  }

  return ok(undefined);
}
