import { FxError, Inputs, ok, QTreeNode, Result, v2 } from "@microsoft/teamsfx-api";
import { TabSPFxItem } from "../fx-solution/question";
import { BuiltInSolutionNames } from "../fx-solution/v3/constants";
import { TeamsSPFxSolutionQuestions } from "./questions";

export async function getQuestionsForInit(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const node = new QTreeNode({
    name: "set-spfx-solution",
    type: "func",
    func: (inputs: Inputs) => {
      inputs[TeamsSPFxSolutionQuestions.Solution] = BuiltInSolutionNames.spfx;
    },
  });
  node.condition = { contains: TabSPFxItem.id };
  return ok(node);
}
