import { FxError, Inputs, QTreeNode, Result, v2, ok } from "@microsoft/teamsfx-api";
import Container from "typedi";
import { TabSPFxItem } from "../fx-solution/question";
import { ResourcePluginsV2 } from "../fx-solution/ResourcePluginContainer";

export enum TeamsSPFxSolutionQuestions {
  Solution = "solution",
}

export async function getQuestionsForScaffolding(
  ctx: v2.Context,
  inputs: v2.InputsWithProjectPath
): Promise<Result<QTreeNode | undefined, FxError>> {
  const spfxPlugin: v2.ResourcePlugin = Container.get<v2.ResourcePlugin>(
    ResourcePluginsV2.SpfxPlugin
  );
  const spfxSolutionNode = new QTreeNode({
    name: TeamsSPFxSolutionQuestions.Solution,
    type: "func",
    func: (inputs: Inputs) => {
      inputs[TeamsSPFxSolutionQuestions.Solution] = "fx-solution-spfx";
    },
  });
  spfxSolutionNode.condition = { contains: TabSPFxItem.id };
  if (spfxPlugin.getQuestionsForScaffolding) {
    const res = await spfxPlugin.getQuestionsForScaffolding(ctx, inputs);
    if (res.isErr()) return res;
    if (res.value) {
      const spfxNode = res.value as QTreeNode;
      spfxSolutionNode.addChild(spfxNode);
    }
  }

  return ok(spfxSolutionNode);
}
