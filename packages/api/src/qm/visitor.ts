// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  TextInputQuestion,
  QTreeNode,
  Question,
  SingleSelectQuestion,
  StaticOption,
  OptionItem,
  MultiSelectQuestion,
  NodeType
} from "./question";
import { getValidationFunction, validate } from "./validation";
import { assembleError, FxError, returnSystemError, returnUserError, SystemError, UserCancelError } from "../error";
import { Inputs, Void } from "../types";
import { InputResult, UserInteraction } from "./ui";
import { err, ok, Result } from "neverthrow";

export function isAutoSkipSelect(q: Question): boolean {
  if (q.type === NodeType.singleSelect || q.type === NodeType.multiSelect) {
    const select = q as (SingleSelectQuestion | MultiSelectQuestion); 
    if (select.skipSingleOption && select.option.length === 1) {
      return true;
    }
  }
  return false;
}

export async function loadOptions(q: Question, inputs: Inputs): Promise<{autoSkip:boolean, options?: StaticOption}> {
  if (q.type === NodeType.singleSelect || q.type === NodeType.multiSelect) {
    const selectQuestion = q as (SingleSelectQuestion | MultiSelectQuestion);
    let option:StaticOption; 
    if(selectQuestion.dynamicOptions)
      option = await getCallFuncValue(inputs, selectQuestion.dynamicOptions) as StaticOption;
    else 
      option = selectQuestion.option;
    if (selectQuestion.skipSingleOption && selectQuestion.option.length === 1)
      return {autoSkip:true, options: option};
    else
      return {autoSkip:false, options: option};
  }
  else 
    return {autoSkip:false};
}

export function getSingleOption(q: SingleSelectQuestion | MultiSelectQuestion, option?: StaticOption) : any{
  if(!option) option = q.option;
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
  if (q.type === NodeType.singleSelect)
    return returnResult;
  else
    return [returnResult];
}

// type QuestionVistor = (
//   question: Question,
//   ui: UserInteraction,
//   inputs: Inputs ,
//   step?: number,
//   totalSteps?: number,
// ) => Promise<InputResult<any>>;
 

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
const questionVisitor = async function (
  question: Question,
  ui: UserInteraction,
  inputs: Inputs ,
  step?: number,
  totalSteps?: number,
): Promise<Result<InputResult<any>, FxError>> {  
  if(inputs[question.name] !== undefined) {
    return ok({ type: "success", result: inputs[question.name]} );
  }
  if (question.type === NodeType.func) {
    try{
      const res = await question.func(inputs);
      if("isOk" in res){
        const fxresult = res as Result<any, FxError>;
        if(fxresult.isOk()){
          return ok({ type: "success", result: fxresult.value} );
        }
        else {
          return err(fxresult.error);
        }
      }
      return ok({ type: "success", result: res} );
    }
    catch(e){
      return err(assembleError(e));
    }
  } else {
    const defaultValue = question.value? question.value : await getCallFuncValue(inputs, question.default);
    const placeholder = await getCallFuncValue(inputs, question.placeholder) as string;
    const prompt = await getCallFuncValue(inputs, question.prompt) as string;
    if (question.type === NodeType.text) {
      const validationFunc = question.validation ? getValidationFunction<string>(question.validation, inputs) : undefined;
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
    } else if (question.type === NodeType.singleSelect || question.type === NodeType.multiSelect) {
      const selectQuestion = question as (SingleSelectQuestion | MultiSelectQuestion);
      const res = await loadOptions(selectQuestion, inputs);
      if (!res.options || res.options.length === 0) {
        return err(returnSystemError(
            new Error("Select option is empty!"),
            "API",
            "EmptySelectOption"
          ));
      }
      // Skip single/mulitple option select
      if (res.autoSkip === true) {
        const returnResult = getSingleOption(selectQuestion, res.options);
        return ok({ type: "skip",  result: returnResult});
      }
      if(question.type === NodeType.singleSelect){
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
        const validationFunc = question.validation ? getValidationFunction<string[]>(question.validation, inputs) : undefined;
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
    } else if (question.type === NodeType.multiFile) {
      const validationFunc = question.validation ? getValidationFunction<string[]>(question.validation, inputs) : undefined;
      return await ui.selectFiles({
        name: question.name,
        title: question.title,
        placeholder: placeholder,
        prompt: prompt,
        step: step,
        totalSteps: totalSteps,
        validation: validationFunc
      });
    } else if(question.type === NodeType.singleFile ){
      const validationFunc = question.validation ? getValidationFunction<string>(question.validation, inputs) : undefined;
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
    } else if(question.type === NodeType.folder){
      const validationFunc = question.validation ? getValidationFunction<string>(question.validation, inputs) : undefined;
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
  return err(returnUserError(
      new Error(`Unsupported question node type:${JSON.stringify(question)}`),
      "API",
      "UnsupportedNodeType"
  ));
};

export async function traverse(
  root: QTreeNode,
  inputs: Inputs ,
  ui: UserInteraction
): Promise<Result<Void, FxError>> {
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
    if (curr.data.type !== NodeType.group) {
      const question = curr.data as Question;
      totalStep = step + stack.length;
      const qvres = await questionVisitor(
        question,
        ui,
        inputs,
        step,
        totalStep
      );
      if(qvres.isErr()){ // Cancel or Error
        return err(qvres.error);
      }
      const inputResult = qvres.value;
      if (inputResult.type === "back") {
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
          if (last.data.type !== NodeType.group) delete inputs[last.data.name];

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
          return err(UserCancelError);
        }
        --step;
        continue; //ignore the following steps
      }  
      else {
        //success or skip
        question.value = inputResult.result;
        inputs[question.name] = question.value;

        if (inputResult.type === "skip" || question.type === NodeType.func) {
          if (inputResult.type === "skip") autoSkipSet.add(curr);
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
  return ok(Void);
}

