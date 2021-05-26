// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  TextInputQuestion,
  QTreeNode,
  Question,
  SingleSelectQuestion,
  StaticOptions,
  OptionItem,
  MultiSelectQuestion
} from "./question";
import { getValidationFunction, validate } from "./validation";
import { returnSystemError, returnUserError } from "../error";
import { Inputs } from "../types";
import { InputResult, InputResultType, UserInteraction } from "./ui";

export function isAutoSkipSelect(q: Question): boolean {
  if (q.type === "singleSelect" || q.type === "multiSelect") {
    const select = q as (SingleSelectQuestion | MultiSelectQuestion); 
    if (select.skipSingleOption && select.staticOptions.length === 1) {
      return true;
    }
  }
  return false;
}

export async function loadOptions(q: Question, inputs: Inputs): Promise<{autoSkip:boolean, options?: StaticOptions}> {
  if (q.type === "singleSelect" || q.type === "multiSelect") {
    const selectQuestion = q as (SingleSelectQuestion | MultiSelectQuestion);
    let option:StaticOptions; 
    if(selectQuestion.dynamicOptions)
      option = await getCallFuncValue(inputs, selectQuestion.dynamicOptions) as StaticOptions;
    else 
      option = selectQuestion.staticOptions;
    if (selectQuestion.skipSingleOption && selectQuestion.staticOptions.length === 1)
      return {autoSkip:true, options: option};
    else
      return {autoSkip:false, options: option};
  }
  else 
    return {autoSkip:false};
}

export function getSingleOption(q: SingleSelectQuestion | MultiSelectQuestion, option?: StaticOptions) : any{
  if(!option) option = q.staticOptions;
  const optionIsString = typeof option[0] === "string";
  let returnResult;
  if(optionIsString)
    returnResult = option[0];
  else {
    if(q.returnObject === true)
      returnResult = option[0];
    else 
      returnResult = (option[0] as OptionItem).id;
  }
  if (q.type === "singleSelect")
    return returnResult;
  else
    return [returnResult];
}

type QuestionVistor = (
  question: Question,
  ui: UserInteraction,
  inputs: Inputs ,
  step?: number,
  totalSteps?: number,
) => Promise<InputResult>;
 

export async function getCallFuncValue(inputs: Inputs , raw?: unknown ):Promise<unknown>{
  if(raw && typeof raw === "function") {
    return await raw(inputs);
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
  ui: UserInteraction,
  inputs: Inputs ,
  step?: number,
  totalSteps?: number,
): Promise<InputResult> {  
  if(inputs[question.name] !== undefined) {
    return { type: InputResultType.sucess, result: inputs[question.name] };
  }
  if (question.type === "func") {
    const res = await question.func(inputs);
    return { type: InputResultType.sucess, result: res };
  } else {
    const defaultValue = question.value? question.value : await getCallFuncValue(inputs, question.default);
    const placeholder = await getCallFuncValue(inputs, question.placeholder) as string;
    const prompt = await getCallFuncValue(inputs, question.prompt) as string;
    const validationFunc = question.validation ? getValidationFunction(question.validation, inputs) : undefined;
    if (question.type === "text") {
      const inputQuestion = question as TextInputQuestion;
      return await ui.inputText({
        name: question.name,
        title: question.title,
        password: (inputQuestion as TextInputQuestion).password,
        default: defaultValue as string,
        placeholder: placeholder,
        prompt: prompt,
        validation: validationFunc,
        step: step,
        totalSteps: totalSteps
      });
    } else if (question.type === "singleSelect" || question.type === "multiSelect") {
      const selectQuestion = question as (SingleSelectQuestion | MultiSelectQuestion);
      const res = await loadOptions(selectQuestion, inputs);
      if (!res.options || res.options.length === 0) {
        return {
          type: InputResultType.error,
          error: returnSystemError(
            new Error("Select option is empty!"),
            "API",
            "EmptySelectOption"
          )
        };
      }
      // Skip single/mulitple option select
      if (res.autoSkip === true) {
        const returnResult = getSingleOption(selectQuestion, res.options);
        return {
          type: InputResultType.skip,
          result: returnResult
        };
      }
      if(question.type === "singleSelect"){
        return await ui.selectOption({
          name: question.name,
          title: question.title,
          options: res.options,
          returnObject: selectQuestion.returnObject,
          default: defaultValue as string,
          placeholder: placeholder,
          prompt: prompt,
          step: step,
          totalSteps: totalSteps
        });
      }
      else {
        const mq = selectQuestion as MultiSelectQuestion;
        return await ui.selectOptions({
          name: question.name,
          title: question.title,
          options: res.options,
          returnObject: selectQuestion.returnObject,
          default: defaultValue as string[],
          placeholder: placeholder,
          prompt: prompt,
          onDidChangeSelection: mq.onDidChangeSelection,
          step: step,
          totalSteps: totalSteps,
          validation: validationFunc
        });
      }
    } else if (question.type === "multiFile") {
      return await ui.selectFiles({
        name: question.name,
        title: question.title,
        placeholder: placeholder,
        prompt: prompt,
        step: step,
        totalSteps: totalSteps,
        validation: validationFunc
      });
    } else if(question.type === "singleFile" ){
      return await ui.selectFile({
        name: question.name,
        title: question.title,
        placeholder: placeholder,
        prompt: prompt,
        default: defaultValue as string,
        step: step,
        totalSteps: totalSteps,
        validation: validationFunc
      });
    } else if(question.type === "folder"){
      return await ui.selectFolder({
        name: question.name,
        title: question.title,
        placeholder: placeholder,
        prompt: prompt,
        default: defaultValue as string,
        step: step,
        totalSteps: totalSteps,
        validation: validationFunc
      });
    }
  }
  return {
    type: InputResultType.error,
    error: returnUserError(
      new Error(`Unsupported question node type:${JSON.stringify(question)}`),
      "API.qm",
      "UnsupportedNodeType"
    )
  };
};

export async function traverse(
  root: QTreeNode,
  inputs: Inputs ,
  ui: UserInteraction
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
    //visit
    if (curr.data.type !== "group") {
      const question = curr.data as Question;
      totalStep = step + stack.length;
      const inputResult = await questionVisitor(
        question,
        ui,
        inputs,
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
          if (last.data.type !== "group") delete inputs[last.data.name];

          const lastIsAutoSkip = autoSkipSet.has(last);
          if (
            last.data.type !== "group" &&
            last.data.type !== "func" &&
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
        inputs[question.name] = question.value;

        if (inputResult.type === InputResultType.skip || question.type === "func") {
          if (inputResult.type === InputResultType.skip) autoSkipSet.add(curr);
        } else {
          ++step;
        }
        let valueInMap = question.value;
        if (question.type === "singleSelect") {
          const sq: SingleSelectQuestion = question as SingleSelectQuestion;
          if (sq.value && typeof sq.value !== "string") {
            valueInMap = (sq.value as OptionItem).id;
          }
        } else if (question.type === "multiSelect") {
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

