// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

import inquirer, { DistinctQuestion } from "inquirer";
import {
  NodeType,
  QTreeNode,
  OptionItem,
  Question,
  ConfigMap,
  getValidationFunction,
  RemoteFuncExecutor,
  isAutoSkipSelect,
  getSingleOption,
  SingleSelectQuestion,
  MultiSelectQuestion,
  getCallFuncValue,
  StaticOption,
  DymanicOption
} from "@microsoft/teamsfx-api";

import CLILogProvider from "../commonlib/log";
import * as constants from "../constants";
import { flattenNodes, getChoicesFromQTNodeQuestion, toConfigMap } from "../utils";

import { QTNConditionNotSupport, QTNQuestionTypeNotSupport, NotValidInputValue, NotValidOptionValue } from "../error";

export async function validateAndUpdateAnswers(
  root: QTreeNode | undefined,
  answers: ConfigMap,
  remoteFuncValidator?: RemoteFuncExecutor
): Promise<void> {
  if (!root) {
    return;
  }

  const nodes = flattenNodes(root);
  for (const node of nodes) {
    if (node.data.type === NodeType.group) {
      continue;
    }

    const ans: any = answers.get(node.data.name);
    if (ans === undefined || ans === null) {
      continue;
    }

    if ("validation" in node.data && node.data.validation) {
      const validateFunc = getValidationFunction(node.data.validation, toConfigMap(answers), remoteFuncValidator);
      const result = await validateFunc(ans);
      if (typeof result === "string") {
        throw NotValidInputValue(node.data.name, result);
      }
    }

    // if it is a select question
    if (node.data.type === NodeType.multiSelect || node.data.type === NodeType.singleSelect) {
      const question = node.data as SingleSelectQuestion | MultiSelectQuestion;
      let option = question.option;

      if (!(option instanceof Array)) {
        option = await getCallFuncValue(answers, false, node.data.option as DymanicOption) as StaticOption;
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
          answers.set(node.data.name, items);
        }
        // for single-select question
        else {
          const item = (option as OptionItem[]).filter(op => op.cliName === ans || op.id === ans)[0];
          if (!item) {
            throw NotValidOptionValue(question, option);
          }
          if (question.returnObject) {
            answers.set(node.data.name, item);
          }
          else {
            answers.set(node.data.name, item.id);
          }
        }
      }
    }
  }
}

export async function visitInteractively(
  node: QTreeNode,
  answers?: any,
  parentNodeAnswer?: any,
  remoteFuncValidator?: RemoteFuncExecutor
): Promise<{ [_: string]: any }> {
  if (!answers) {
    answers = {};
  }

  let shouldVisitChildren = false;

  if (node.condition) {
    if (node.condition.target) {
      throw QTNConditionNotSupport(node);
    }

    if (node.condition.equals) {
      if (node.condition.equals === parentNodeAnswer) {
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
  if (node.data.type !== NodeType.group) {
    if (node.data.type === NodeType.localFunc) {
      const res = await node.data.func(answers);
      answers[node.data.name] = res;
    }
    else if (!isAutoSkipSelect(node.data)) {
      answers = await inquirer.prompt([toInquirerQuestion(node.data, answers, remoteFuncValidator)], answers);
      // convert the option.label to option.id
      if ("option" in node.data) {
        const option = node.data.option;
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
      answers = await visitInteractively(child, answers, answer, remoteFuncValidator);
    }
  }

  return answers!;
}

export function toInquirerQuestion(data: Question, answers: { [_: string]: any }, remoteFuncValidator?: RemoteFuncExecutor): DistinctQuestion {
  let type: "input" | "number" | "password" | "list" | "checkbox";
  let defaultValue = data.default;
  switch (data.type) {
    case NodeType.file:
    case NodeType.folder:
      defaultValue = defaultValue || "./";
    case NodeType.text:
      type = "input";
      break;
    case NodeType.number:
      type = "number";
      break;
    case NodeType.password:
      type = "password";
      break;
    case NodeType.singleSelect:
      type = "list";
      break;
    case NodeType.multiSelect:
      type = "checkbox";
      break;
    case NodeType.func:
    case NodeType.localFunc:
      throw QTNQuestionTypeNotSupport(data);
  }
  return {
    type,
    name: data.name,
    message: data.description || data.title || "",
    choices: getChoicesFromQTNodeQuestion(data, true),
    default: defaultValue,
    validate: async (input: any) => {
      if ("validation" in data && data.validation) {
        const validateFunc = getValidationFunction(data.validation, toConfigMap(answers), remoteFuncValidator);
        const result = await validateFunc(input);
        if (typeof result === "string") {
          return result;
        }
      }
      return true;
    }
  };
}
