// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import inquirer, { DistinctQuestion } from "inquirer";
import {
  QTreeNode,
  OptionItem,
  Question,
  getValidationFunction,
  isAutoSkipSelect,
  getSingleOption,
  SingleSelectQuestion,
  MultiSelectQuestion,
  Inputs,
  StaticValidation,
  StaticOptions,
  getCallFuncValue
} from "@microsoft/teamsfx-api";

import { flattenNodes, getChoicesFromQTNodeQuestion, getSystemInputs, toConfigMap } from "../utils";

import { QTNConditionNotSupport, QTNQuestionTypeNotSupport, NotValidInputValue, NotValidOptionValue } from "../error";


export async function validateAndUpdateAnswers(
  root: QTreeNode | undefined,
  answers: Inputs
): Promise<void> {
  if (!root) {
    return;
  }

  const nodes = flattenNodes(root);
  for (const node of nodes) {
    if (node.data.type === "group") {
      continue;
    }

    const ans: any = answers[node.data.name];
    if (!ans) {
      continue;
    }

    if ("validation" in node.data && node.data.validation) {
      const validateFunc = getValidationFunction(node.data.validation, answers);
      const result = await validateFunc(ans);
      if (typeof result === "string") {
        throw NotValidInputValue(node.data.name, result);
      }
    }

    // if it is a select question
    if (node.data.type === "multiSelect" || node.data.type === "singleSelect") {
      const question = node.data as SingleSelectQuestion | MultiSelectQuestion;
      let option = question.staticOptions;

      if (!(option instanceof Array)) {
        option = await getCallFuncValue(answers, node.data.dynamicOptions) as StaticOptions;
      }
      // if the option is the object, need to find the object first.
      if (typeof option[0] !== "string") {
        // for multi-select question
        if (ans instanceof Array) {
          const items = [];
          for (const one of ans) {
            const item = (option as OptionItem[]).filter(op => op.cliName === one || op.id === one)[0];
            if (item) {
              if (question.returnObject) {
                items.push(item);
              }
              else {
                items.push(item.id);
              }
            } else {
              throw NotValidOptionValue(question, option);
            }
          }
          answers[node.data.name] = items;
        }
        // for single-select question
        else {
          const item = (option as OptionItem[]).filter(op => op.cliName === ans || op.id === ans)[0];
          if (!item) {
            throw NotValidOptionValue(question, option);
          }
          if (question.returnObject) {
            answers[node.data.name] = item;
          }
          else {
            answers[node.data.name] = item.id;
          }
        }
      }
    }
  }
}

export async function visitInteractively(
  node: QTreeNode,
  answers?: Inputs,
  parentNodeAnswer?: any
): Promise<Inputs> {
  if (!answers) {
    answers = getSystemInputs();
  }

  let shouldVisitChildren = false;

  if (node.condition) {
    if (node.condition.target) {
      throw QTNConditionNotSupport(node);
    }

    if ((node.condition as StaticValidation).equals) {
      if ((node.condition as StaticValidation).equals === parentNodeAnswer) {
        shouldVisitChildren = true;
      } else {
        return answers;
      }
    }

    if ("minItems" in node.condition && node.condition.minItems) {
      if (parentNodeAnswer instanceof Array && parentNodeAnswer.length >= node.condition.minItems) {
        shouldVisitChildren = true;
      } else {
        return answers;
      }
    }

    if ("contains" in node.condition && node.condition.contains) {
      if (parentNodeAnswer instanceof Array && parentNodeAnswer.includes(node.condition.contains)) {
        shouldVisitChildren = true;
      } else {
        return answers;
      }
    }

    if ("containsAny" in node.condition && node.condition.containsAny) {
      if (parentNodeAnswer instanceof Array && node.condition.containsAny.map(item => parentNodeAnswer.includes(item)).includes(true)) {
        shouldVisitChildren = true;
      } else {
        return answers;
      }
    }

    if (!shouldVisitChildren) {
      throw QTNConditionNotSupport(node);
    }
  } else {
    shouldVisitChildren = true;
  }

  let answer: any = undefined;
  if (node.data.type !== "group") {
    if (node.data.type === "func") {
      const res = await node.data.func(answers);
      answers[node.data.name] = res;
    }
    else if (!isAutoSkipSelect(node.data)) {
      answers = await inquirer.prompt([toInquirerQuestion(node.data, answers)], answers);
      // convert the option.label to option.id
      if ("staticOptions" in node.data) {
        const option = (node.data as SingleSelectQuestion|MultiSelectQuestion).staticOptions;
        if (option instanceof Array && option.length > 0 && typeof option[0] !== "string") {
          const tmpAns = answers[node.data.name];
          if (tmpAns instanceof Array) {
            answers[node.data.name] = tmpAns.map(label => (option as OptionItem[]).find(op => label === op.label)?.id);
          } else {
            answers[node.data.name] = (option as OptionItem[]).find(op => tmpAns === op.label)?.id;
          }
        }
      }
    }
    else {
      answers[node.data.name] = getSingleOption(node.data as (SingleSelectQuestion | MultiSelectQuestion));
    }
    answer = answers[node.data.name];
  }

  if (shouldVisitChildren && node.children) {
    for (const child of node.children) {
      answers = await visitInteractively(child, answers, answer);
    }
  }

  return answers!;
}

export function toInquirerQuestion(data: Question, answers: Inputs): DistinctQuestion {
  let type: "input" | "number" | "password" | "list" | "checkbox";
  let defaultValue = data.default;
  switch (data.type) {
    case "singleFile":
    case "multiFile":
    case "folder":
      defaultValue = defaultValue || "./";
    case "text":
      type = "input";
      break;
    // case number:
    //   type = "number";
    //   break;
    // case password:
    //   type = "password";
    //   break;
    case "singleSelect":
      type = "list";
      break;
    case "multiSelect":
      type = "checkbox";
      break;
    case "func":
      throw QTNQuestionTypeNotSupport(data);
  }
  let choices = undefined;
  if (answers["host-type"] === "SPFx" && data.name === "programming-language"){
    choices = ["TypeScript"];
  }
  return {
    type,
    name: data.name,
    message: data.title || "",
    choices: choices ? choices : getChoicesFromQTNodeQuestion(data, true),
    default: defaultValue,
    validate: async (input: any) => {
      if ("validation" in data && data.validation) {
        const validateFunc = getValidationFunction(data.validation, answers);
        const result = await validateFunc(input);
        if (typeof result === "string") {
          return result;
        }
      }
      return true;
    }
  };
}
