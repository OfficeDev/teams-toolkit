import {
  err,
  FxError,
  Inputs,
  InvalidInputError,
  ok,
  QTreeNode,
  Result,
  SingleSelectQuestion,
  v2,
  v3,
  Void,
} from "@microsoft/teamsfx-api";
import * as jsonschema from "jsonschema";
import { Container } from "typedi";
import { createV2Context, newProjectSettings } from "..";
import { CoreHookContext } from "../..";
import { TeamsFxAzureSolutionNameV3 } from "../../plugins/solution/fx-solution/v3/constants";
import { TeamsSPFxSolutionName } from "../../plugins/solution/spfx-solution/constants";
import { ObjectIsUndefinedError } from "../error";
import { createCapabilityQuestion, ProjectNamePattern, QuestionAppName } from "../question";

export async function init(
  inputs: v2.InputsWithProjectPath & { solution?: string },
  ctx?: CoreHookContext
): Promise<Result<Void, FxError>> {
  if (!ctx) {
    return err(new ObjectIsUndefinedError("ctx for createProject"));
  }
  const appName = inputs[QuestionAppName.name] as string;
  const validateResult = jsonschema.validate(appName, {
    pattern: ProjectNamePattern,
  });
  if (validateResult.errors && validateResult.errors.length > 0) {
    return err(
      new InvalidInputError("FxCoreV3", "app-name", `${validateResult.errors[0].message}`)
    );
  }
  const projectSettings = newProjectSettings();
  projectSettings.appName = appName;
  ctx.projectSettings = projectSettings;
  if (!inputs.solution) {
    return err(new InvalidInputError("FxCoreV3", "solution", "undefined"));
  }
  const solution = Container.get<v3.ISolution>(inputs.solution);
  const context = createV2Context(projectSettings);
  return await solution.init(
    context,
    inputs as v2.InputsWithProjectPath & { capabilities: string[] }
  );
}

export async function getQuestionsForInit(
  inputs: Inputs
): Promise<Result<QTreeNode | undefined, FxError>> {
  const node = new QTreeNode({ type: "group" });
  const globalSolutions: v3.ISolution[] = [
    Container.get<v3.ISolution>(TeamsFxAzureSolutionNameV3),
    Container.get<v3.ISolution>(TeamsSPFxSolutionName),
  ];

  const capQuestion = createCapabilityQuestion();
  const capNode = new QTreeNode(capQuestion);
  node.addChild(capNode);

  const context = createV2Context(newProjectSettings());
  for (const solution of globalSolutions) {
    if (solution.getQuestionsForInit) {
      const res = await solution.getQuestionsForInit(context, inputs);
      if (res.isErr()) return res;
      if (res.value) {
        const solutionNode = res.value as QTreeNode;
        solutionNode.condition = { equals: solution.name };
        if (solutionNode.data) capNode.addChild(solutionNode);
      }
    }
  }
  node.addChild(new QTreeNode(QuestionAppName));
  return ok(node.trim());
}
