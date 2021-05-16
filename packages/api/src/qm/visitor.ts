// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Func,
  TextInputQuestion,
  NodeType,
  QTreeNode,
  Question,
  SingleSelectQuestion,
  Option,
  StaticOption,
  OptionItem,
  MultiSelectQuestion,
  FileQuestion,
  NumberInputQuestion,
  DynamicValue,
  AnswerValue,
} from "./question";
import { getValidationFunction, RemoteFuncExecutor, validate } from "./validation";
import { ConfigMap, Inputs } from "../config";
import { InputResult, InputResultType, UserInterface } from "./ui";
import { returnSystemError, returnUserError } from "../error";
import { operationOptionsToRequestOptionsBase } from "@azure/core-http";
import { QuestionType } from "../utils";

async function getRealValue(
  parentValue: unknown,
  defaultValue: unknown,
  inputs: ConfigMap,
  remoteFuncExecutor?: RemoteFuncExecutor
): Promise<unknown> {
  let output: unknown = defaultValue;
  if (typeof defaultValue === "string") {
    const defstr = defaultValue as string;
    if (defstr === "$parent") {
      output = parentValue;
    } else if (defstr.startsWith("$parent.") && parentValue instanceof Object) {
      const property = defstr.substr(8);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      output = (parentValue as any)[property];
    }
  } else {
    output = await getCallFuncValue(inputs, false, defaultValue as Func, remoteFuncExecutor);
  }
  return output;
}

export function isAutoSkipSelect(q: Question): boolean {
  if (q.type === NodeType.singleSelect || q.type === NodeType.multiSelect) {
    const select = q as SingleSelectQuestion | MultiSelectQuestion;
    const options = select.option as StaticOption;
    if (select.skipSingleOption && select.option instanceof Array && options.length === 1) {
      return true;
    }
  }
  return false;
}

export async function loadOptions(
  q: Question,
  inputs: ConfigMap,
  remoteFuncExecutor?: RemoteFuncExecutor
): Promise<{ autoSkip: boolean; options?: StaticOption }> {
  if (q.type === NodeType.singleSelect || q.type === NodeType.multiSelect) {
    const selectQuestion = q as SingleSelectQuestion | MultiSelectQuestion;
    let option: Option = [];
    if (selectQuestion.option instanceof Array) {
      //StaticOption
      option = selectQuestion.option;
    } else {
      option = (await getCallFuncValue(
        inputs,
        true,
        selectQuestion.option as Func,
        remoteFuncExecutor
      )) as StaticOption;
    }
    if (selectQuestion.skipSingleOption && option.length === 1) {
      return { autoSkip: true, options: option };
    } else {
      return { autoSkip: false, options: option };
    }
  } else {
    return { autoSkip: false };
  }
}

export function getSingleOption(
  q: SingleSelectQuestion | MultiSelectQuestion,
  option?: StaticOption
): any {
  if (!option) option = q.option as StaticOption;
  const optionIsString = typeof option[0] === "string";
  let returnResult;
  if (q.returnObject) {
    returnResult = optionIsString ? { id: option[0] } : option[0];
  } else {
    returnResult = optionIsString ? option[0] : (option[0] as OptionItem).id;
  }
  if (q.type === NodeType.singleSelect) {
    return returnResult;
  } else {
    return [returnResult];
  }
}

type QuestionVistor = (
  question: Question,
  parentValue: unknown,
  ui: UserInterface,
  inputs: ConfigMap,
  remoteFuncExecutor?: RemoteFuncExecutor,
  step?: number,
  totalSteps?: number
) => Promise<InputResult>;

export async function getCallFuncValue(
  inputs: ConfigMap,
  throwError: boolean,
  raw?: string | string[] | number | DynamicValue<AnswerValue>,
  remoteFuncExecutor?: RemoteFuncExecutor
): Promise<unknown> {
  if (raw) {
    if ((raw as Func).method) {
      if (remoteFuncExecutor) {
        const res = await remoteFuncExecutor(raw as Func, inputs);
        if (res.isOk()) {
          return res.value;
        } else if (throwError) {
          throw res.error;
        }
      }
    } else if (typeof raw === "function") {
      return await raw(inputs);
    }
  }
  return raw;
}

/**
 * ask question when visiting the question tree
 * @param question
 * @param core
 * @param inputs
 */
const questionVisitor: QuestionVistor = async function (
  question: Question,
  parentValue: unknown,
  ui: UserInterface,
  inputs: ConfigMap,
  remoteFuncExecutor?: RemoteFuncExecutor,
  step?: number,
  totalSteps?: number
): Promise<InputResult> {
  //FunctionCallQuestion
  if (question.type === NodeType.func) {
    if (remoteFuncExecutor) {
      const res = await remoteFuncExecutor(question as Func, inputs);
      if (res.isOk()) {
        return { type: InputResultType.sucess, result: res.value };
      } else {
        return { type: InputResultType.error, error: res.error };
      }
    }
  } else if (question.type === NodeType.localFunc) {
    const res = await question.func(inputs);
    return { type: InputResultType.sucess, result: res };
  } else {
    const title = (question.title as string) || question.description || question.name;
    const defaultValue = question.value
      ? question.value
      : await getRealValue(parentValue, question.default, inputs, remoteFuncExecutor);
    if (
      question.type === NodeType.text ||
      question.type === NodeType.password ||
      question.type === NodeType.number
    ) {
      const inputQuestion: TextInputQuestion | NumberInputQuestion = question as
        | TextInputQuestion
        | NumberInputQuestion;
      const validationFunc = inputQuestion.validation
        ? getValidationFunction(inputQuestion.validation, inputs, remoteFuncExecutor)
        : undefined;
      const placeholder = (await getCallFuncValue(
        inputs,
        false,
        inputQuestion.placeholder,
        remoteFuncExecutor
      )) as string;
      const prompt = (await getCallFuncValue(
        inputs,
        false,
        inputQuestion.prompt,
        remoteFuncExecutor
      )) as string;
      return await ui.showInputBox({
        title: title,
        password: !!(question.type === NodeType.password),
        defaultValue: defaultValue as string,
        placeholder: placeholder,
        prompt: prompt,
        validation: validationFunc,
        number: !!(question.type === NodeType.number),
        step: step,
        totalSteps: totalSteps,
      });
    } else if (question.type === NodeType.singleSelect || question.type === NodeType.multiSelect) {
      const selectQuestion: SingleSelectQuestion | MultiSelectQuestion = question as
        | SingleSelectQuestion
        | MultiSelectQuestion;
      const res = await loadOptions(selectQuestion, inputs, remoteFuncExecutor);
      if (!res.options || res.options.length === 0) {
        return {
          type: InputResultType.error,
          error: returnSystemError(
            new Error("Select option is empty!"),
            "API",
            "EmptySelectOption"
          ),
        };
      }
      // Skip single/mulitple option select
      if (res.autoSkip === true) {
        const returnResult = getSingleOption(selectQuestion, res.options);
        return {
          type: InputResultType.skip,
          result: returnResult,
        };
      }
      const placeholder = (await getCallFuncValue(
        inputs,
        false,
        selectQuestion.placeholder,
        remoteFuncExecutor
      )) as string;
      const mq = selectQuestion as MultiSelectQuestion;
      const validationFunc = mq.validation
        ? getValidationFunction(mq.validation, inputs, remoteFuncExecutor)
        : undefined;
      const prompt = (await getCallFuncValue(
        inputs,
        false,
        mq.prompt,
        remoteFuncExecutor
      )) as string;
      return await ui.showQuickPick({
        title: title,
        items: res.options,
        canSelectMany: !!(question.type === NodeType.multiSelect),
        returnObject: selectQuestion.returnObject,
        defaultValue: defaultValue as string | string[],
        placeholder: placeholder,
        onDidChangeSelection:
          question.type === NodeType.multiSelect ? mq.onDidChangeSelection : undefined,
        validation: validationFunc,
        prompt: prompt,
        step: step,
        totalSteps: totalSteps,
      });
    } else if (question.type === NodeType.folder) {
      const fileQuestion: FileQuestion = question as FileQuestion;
      const validationFunc = fileQuestion.validation
        ? getValidationFunction(fileQuestion.validation, inputs, remoteFuncExecutor)
        : undefined;
      return await ui.showOpenDialog({
        defaultUri: defaultValue as string,
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: title,
        validation: validationFunc,
        step: step,
        totalSteps: totalSteps,
      });
    }
  }
  return {
    type: InputResultType.error,
    error: returnUserError(
      new Error(`Unsupported question node type:${question.type}`),
      "API.qm",
      "UnsupportedNodeType"
    ),
  };
};

export async function traverse(
  root: QTreeNode,
  inputs: ConfigMap,
  ui: UserInterface,
  remoteFuncExecutor?: RemoteFuncExecutor
): Promise<InputResult> {
  const stack: QTreeNode[] = [];
  const history: QTreeNode[] = [];
  stack.push(root);
  let step = 1; // manual input step
  let totalStep = 1;
  const parentMap = new Map<QTreeNode, QTreeNode>();
  const valueMap = new Map<QTreeNode, unknown>();
  const autoSkipSet = new Set<QTreeNode>();
  while (stack.length > 0) {
    const curr = stack.pop();
    if (!curr) continue;
    const parent = parentMap.get(curr);
    const parentValue = parent ? valueMap.get(parent) : undefined;

    //visit
    if (curr.data.type !== NodeType.group) {
      const question = curr.data as Question;
      totalStep = step + stack.length;
      const inputResult = await questionVisitor(
        question,
        parentValue,
        ui,
        inputs,
        remoteFuncExecutor,
        step,
        totalStep
      );
      if (inputResult.type === InputResultType.back) {
        //go back
        if (curr.children) {
          while (stack.length > 0) {
            const tmp = stack[stack.length - 1];
            if (curr.children.includes(tmp)) {
              stack.pop();
            } else {
              break;
            }
          }
        }
        stack.push(curr);
        inputs.delete(curr.data.name);

        // find the previoud input that is neither group nor func nor single option select
        let found = false;
        while (history.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const last = history.pop()!;
          if (last.children) {
            while (stack.length > 0) {
              const tmp = stack[stack.length - 1];
              if (last.children.includes(tmp)) {
                stack.pop();
              } else {
                break;
              }
            }
          }
          stack.push(last);
          if (last.data.type !== NodeType.group) inputs.delete(last.data.name);

          const lastIsAutoSkip = autoSkipSet.has(last);
          if (
            last.data.type !== NodeType.group &&
            last.data.type !== NodeType.func &&
            !lastIsAutoSkip
          ) {
            found = true;
            break;
          }
        }
        if (!found) {
          // no node to back
          return { type: InputResultType.cancel };
        }
        --step;
        continue; //ignore the following steps
      } else if (
        inputResult.type === InputResultType.error ||
        inputResult.type === InputResultType.cancel
      ) {
        return inputResult;
      } //continue
      else {
        //success or skip
        question.value = inputResult.result;
        inputs.set(question.name, question.value);

        if (inputResult.type === InputResultType.skip || question.type === NodeType.func) {
          if (inputResult.type === InputResultType.skip) autoSkipSet.add(curr);
        } else {
          ++step;
        }
        let valueInMap = question.value;
        if (question.type === NodeType.singleSelect) {
          const sq: SingleSelectQuestion = question as SingleSelectQuestion;
          if (sq.value && typeof sq.value !== "string") {
            valueInMap = (sq.value as OptionItem).id;
          }
        } else if (question.type === NodeType.multiSelect) {
          const mq: MultiSelectQuestion = question as MultiSelectQuestion;
          if (mq.value && typeof mq.value[0] !== "string") {
            valueInMap = (mq.value as OptionItem[]).map((i) => i.id);
          }
        }
        valueMap.set(curr, valueInMap);
      }
    }

    history.push(curr);

    if (curr.children) {
      const matchChildren: QTreeNode[] = [];
      const valudInMap = valueMap.get(curr);
      for (const child of curr.children) {
        if (!child) continue;
        if (child.condition) {
          const validRes = await validate(child.condition, valudInMap as string | string[], inputs);
          if (validRes !== undefined) {
            continue;
          }
        }
        matchChildren.push(child);
      }
      for (let i = matchChildren.length - 1; i >= 0; --i) {
        const child = matchChildren[i];
        parentMap.set(child, curr);
        stack.push(child);
      }
    }
  }
  return { type: InputResultType.sucess };
}
