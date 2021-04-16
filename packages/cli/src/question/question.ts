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
  RemoteFuncExecutor
} from "fx-api";

import CLILogProvider from "../commonlib/log";
import * as constants from "../constants";
import { flattenNodes, getChoicesFromQTNodeQuestion, toConfigMap } from "../utils";

import { QTNConditionNotSupport, QTNQuestionTypeNotSupport, NotValidInputValue } from "../error";

export async function validateAndUpdateAnswers(
  root: QTreeNode,
  answers: ConfigMap,
  remoteFuncValidator?: RemoteFuncExecutor
): Promise<void> {
  const nodes = flattenNodes(root);
  for (const node of nodes) {
    if (node.data.type === NodeType.group) {
      continue;
    }

    const ans: any = answers.get(node.data.name);
    if (!ans) {
      continue;
    }

    if ("validation" in node.data && node.data.validation) {
      const validateFunc = getValidationFunction(
        node.data.validation,
        toConfigMap(answers),
        remoteFuncValidator
      );
      const result = await validateFunc(ans);
      if (typeof result === "string") {
        throw NotValidInputValue(node.data.name, result);
      }
    }

    if ("returnObject" in node.data && !!node.data.returnObject) {
      const option = node.data.option;

      if (
        ans !== undefined &&
        option instanceof Array &&
        option.length > 0 &&
        typeof option[0] !== "string"
      ) {
        // adjust option is OptionItem[]
        if (ans instanceof Array) {
          const items: OptionItem[] = [];
          for (const one of ans) {
            const item = (option as OptionItem[]).filter((op) => op.label === one)[0];

            if (item) {
              items.push(item);
            } else {
              CLILogProvider.warning(
                `[${constants.cliSource}] No option for this question: ${one} ${option}`
              );
            }
          }
          answers.set(node.data.name, items);
        } else {
          const item = (option as OptionItem[]).filter((op) => op.label === ans)[0];
          if (!item) {
            CLILogProvider.warning(
              `[${constants.cliSource}] No option for this question: ${ans} ${option}`
            );
          }
          answers.set(node.data.name, item);
        }
      }
    }
  }
}

export async function visitInteractively(
  node: QTreeNode,
  answers?: { [_: string]: any },
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
      if (
        parentNodeAnswer instanceof Array &&
        node.condition.containsAny.map((item) => parentNodeAnswer.includes(item)).includes(true)
      ) {
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
    answers = await inquirer.prompt(
      [toInquirerQuestion(node.data, answers, remoteFuncValidator)],
      answers
    );
    answer = answers[node.data.name];
  }

  if (shouldVisitChildren && node.children) {
    for (const child of node.children) {
      answers = await visitInteractively(child, answers, answer, remoteFuncValidator);
    }
  }

  return answers!;
}

export function toInquirerQuestion(
  data: Question,
  answers: { [_: string]: any },
  remoteFuncValidator?: RemoteFuncExecutor
): DistinctQuestion {
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
      throw QTNQuestionTypeNotSupport(data);
  }

  return {
    type,
    name: data.name,
    message: data.description || data.title || "",
    choices: getChoicesFromQTNodeQuestion(data),
    default: defaultValue,
    validate: async (input: any) => {
      if ("validation" in data && data.validation) {
        const validateFunc = getValidationFunction(
          data.validation,
          toConfigMap(answers),
          remoteFuncValidator
        );
        const result = await validateFunc(input);
        if (typeof result === "string") {
          return result;
        }
      }
      return true;
    }
  };
}
