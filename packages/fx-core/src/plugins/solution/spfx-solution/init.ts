import { FxError, Inputs, QTreeNode, Result, v2, ok } from "@microsoft/teamsfx-api";
import { TeamsSPFxSolutionQuestions } from "./questions";
import { TeamsSPFxSolutionName } from "./constants";
import { TabSPFxItem } from "../fx-solution/question";

export async function getQuestionsForInit(
  ctx: v2.Context,
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const node = new QTreeNode({
    name: TeamsSPFxSolutionQuestions.Solution,
    type: "func",
    func: (inputs: Inputs) => {
      inputs[TeamsSPFxSolutionQuestions.Solution] = TeamsSPFxSolutionName;
    },
  });
  node.condition = { contains: TabSPFxItem.id };
  return ok(node);
}
