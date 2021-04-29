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
  NumberInputQuestion
} from "./question";
import { getValidationFunction, RemoteFuncExecutor, validate } from "./validation";
import { ConfigMap, Inputs } from "../config";
import { InputResult, InputResultType, UserInterface } from "./ui";
import { returnSystemError, returnUserError } from "../error";
import { operationOptionsToRequestOptionsBase } from "@azure/core-http";

async function getRealValue(
  parentValue: unknown,
  defaultValue: unknown,
  inputs: Inputs | ConfigMap,
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
    const select = q as (SingleSelectQuestion | MultiSelectQuestion);
    const options = select.option as StaticOption;
    if (select.skipSingleOption && select.option instanceof Array && options.length === 1) {
      return true;
    }
  }
  return false;
}

export async function loadOptions(q: Question, inputs: Inputs | ConfigMap, remoteFuncExecutor?: RemoteFuncExecutor): Promise<{autoSkip:boolean, options?: StaticOption}> {
  if (q.type === NodeType.singleSelect || q.type === NodeType.multiSelect) {
    const selectQuestion = q as (SingleSelectQuestion | MultiSelectQuestion);
    let option: Option = [];
    if (selectQuestion.option instanceof Array) {
      //StaticOption
      option = selectQuestion.option;
    } else {
      option = await getCallFuncValue(inputs, false, selectQuestion.option as Func, remoteFuncExecutor) as StaticOption;
    }
    if (selectQuestion.skipSingleOption && option.length === 1) {
      return {autoSkip:true, options: option};
    }
    else {
      return {autoSkip:false, options: option};
    }
  }
  else {
    return {autoSkip:false};
  }
}

export function getSingleOption(q: SingleSelectQuestion | MultiSelectQuestion, option?: StaticOption) : any{
  if(!option) option = q.option as StaticOption;
  const optionIsString = typeof option[0] === "string";
  let returnResult;
  if (q.returnObject) {
    returnResult = optionIsString ? { id: option[0] } : option[0];
  }
  else {
    returnResult = optionIsString ? option[0] : (option[0] as OptionItem).id;
  }
  if (q.type === NodeType.singleSelect) {
    return returnResult;
  }
  else {
    return [returnResult];
  }
}

type QuestionVistor = (
  question: Question,
  parentValue: unknown,
  ui: UserInterface,
  backButton: boolean,
  inputs: Inputs | ConfigMap,
  remoteFuncExecutor?: RemoteFuncExecutor,
  step?: number,
  totalSteps?: number,
) => Promise<InputResult>;
 

async function getCallFuncValue(inputs: Inputs | ConfigMap, throwError: boolean,  raw?: string | string[] | Func, remoteFuncExecutor?: RemoteFuncExecutor):Promise<unknown>{
  if(raw){
    if((raw as Func).method) {
      if(remoteFuncExecutor){
        const res = await remoteFuncExecutor(raw as Func, inputs);
        if (res.isOk()) {
          return res.value;
        }
        else if(throwError){
          throw res.error;
        }
      }
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
  backButton: boolean,
  inputs: Inputs | ConfigMap,
  remoteFuncExecutor?: RemoteFuncExecutor,
  step?: number,
  totalSteps?: number,
): Promise<InputResult> {
  const type = question.type;
  //FunctionCallQuestion
  if (type === NodeType.func) {
    if (remoteFuncExecutor) {
      const res = await remoteFuncExecutor(question as Func, inputs);
      if (res.isOk()) {
        return { type: InputResultType.sucess, result: res.value };
      }
      else {
        return { type: InputResultType.error, error: res.error };
      }
    }
  } else {
    if (type === NodeType.text || type === NodeType.password || type === NodeType.number) {
      const inputQuestion: TextInputQuestion | NumberInputQuestion = question as (TextInputQuestion | NumberInputQuestion);
      const validationFunc = inputQuestion.validation ? getValidationFunction(inputQuestion.validation, inputs, remoteFuncExecutor) : undefined;
      const placeholder = await getCallFuncValue(inputs, false, inputQuestion.placeholder, remoteFuncExecutor) as string;
      const prompt = await getCallFuncValue(inputs, false, inputQuestion.prompt, remoteFuncExecutor) as string;
      const defaultValue = inputQuestion.value? inputQuestion.value : await getRealValue(parentValue, question.default, inputs, remoteFuncExecutor);
      return await ui.showInputBox({
        title: inputQuestion.title || inputQuestion.description || inputQuestion.name,
        password: !!(type === NodeType.password),
        defaultValue: defaultValue as string,
        placeholder: placeholder,
        prompt: prompt,
        validation: validationFunc,
        backButton: backButton,
        number: !!(type === NodeType.number),
        // step: step,
        // totalSteps: totalSteps
      });
    } else if (type === NodeType.singleSelect || type === NodeType.multiSelect) {
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
          )
        };
      }

      // Skip single/mulitple option select
      if (res.autoSkip === true) {
        const returnResult = getSingleOption(selectQuestion, res.options);
        return {
          type: InputResultType.pass,
          result: returnResult
        };
      }
      const placeholder = await getCallFuncValue(inputs, false, selectQuestion.placeholder, remoteFuncExecutor) as string;
      const defaultValue = selectQuestion.value? selectQuestion.value : await getRealValue(parentValue, selectQuestion.default, inputs, remoteFuncExecutor);
      return await ui.showQuickPick({
        title: selectQuestion.title!,
        items: res.options,
        canSelectMany: !!(type === NodeType.multiSelect),
        returnObject: selectQuestion.returnObject,
        defaultValue: defaultValue as (string | string[]),
        placeholder: placeholder,
        backButton: backButton,
        onDidChangeSelection: type === NodeType.multiSelect ? (selectQuestion as MultiSelectQuestion).onDidChangeSelection : undefined,
        // step: step,
        // totalSteps: totalSteps
      });
    } else if (type === NodeType.folder) {
      const fileQuestion: FileQuestion = question as FileQuestion;
      const validationFunc = fileQuestion.validation ? getValidationFunction(fileQuestion.validation, inputs, remoteFuncExecutor) : undefined;
      const defaultValue = fileQuestion.value? fileQuestion.value : await getRealValue(parentValue, fileQuestion.default, inputs, remoteFuncExecutor);
      return await ui.showOpenDialog({
        defaultUri: fileQuestion.value || defaultValue as string | undefined,
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        title: fileQuestion.title!,
        validation: validationFunc,
        backButton: backButton,
        // step: step,
        // totalSteps: totalSteps
      });
    }
  }
  return {
    type: InputResultType.error,
    error: returnUserError(
      new Error(`Unsupported question node type:${question.type}`),
      "API.qm",
      "UnsupportedNodeType"
    )
  };
};

export async function traverse(
  root: QTreeNode,
  inputs: Inputs | ConfigMap,
  ui: UserInterface,
  remoteFuncExecutor?: RemoteFuncExecutor
): Promise<InputResult> {
  const stack: QTreeNode[] = [];
  const history: QTreeNode[] = [];
  let firstQuestion: Question | undefined;
  stack.push(root);
  let step = 0;
  let totalSteps = 1;
  const parentMap = new Map<QTreeNode, QTreeNode>();
  while (stack.length > 0) {
    const curr = stack.pop();
    if(!curr) continue;
    const parent = parentMap.get(curr);
    let parentValue = parent && parent.data.type !== NodeType.group ? parent.data.value : undefined;
    if (curr.condition) {
      /// if parent node is single select node and return OptionItem as value, then the parentValue is it's id
      if (parent && parent.data.type === NodeType.singleSelect) {
        const sq:SingleSelectQuestion = parent.data;
        if (sq.returnObject) {
          parentValue = (sq.value as OptionItem).id;
        }
      }
      const valueToValidate = curr.condition.target ? await getRealValue(parentValue, curr.condition.target, inputs, remoteFuncExecutor) : parentValue;
      if (valueToValidate) {
        const validRes = await validate(curr.condition, valueToValidate as string | string[], inputs, remoteFuncExecutor);
        if (validRes !== undefined) {
          continue;
        }
      }
    }

    //visit
    if (curr.data.type !== NodeType.group) {
      const question = curr.data as Question;
      if (!firstQuestion) firstQuestion = question;
      ++ step;
      totalSteps = step + stack.length;
      const inputResult = await questionVisitor(question, parentValue, ui, question !== firstQuestion, inputs, remoteFuncExecutor, step, totalSteps);
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
        -- step;
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
          -- step;
          let autoSkip = false;
          if(last.data.type === NodeType.singleSelect || last.data.type === NodeType.multiSelect){
            const loadOptionRes = await loadOptions(last.data, inputs, remoteFuncExecutor);
            autoSkip = loadOptionRes.autoSkip;
          }
          
          if (
            last.data.type !== NodeType.group &&
            last.data.type !== NodeType.func &&
            !autoSkip
          ) {
            found = true;
            break;
          }
        }
        if (!found) {
          // no node to back
          return { type: InputResultType.back };
        }
        continue; //ignore the following steps
      } else if (
        inputResult.type === InputResultType.error ||
        inputResult.type === InputResultType.cancel
      ) {
        //cancel
        return inputResult;
      } //continue
      else {
        //success or pass
        question.value = inputResult.result;
        if (inputs instanceof ConfigMap) {
          (inputs as ConfigMap).set(question.name, question.value);
        }
        else {
          (inputs as Inputs)[question.name] = question.value;
        }
      }
    }

    history.push(curr);

    if (curr.children) {
      for (let i = curr.children.length - 1; i >= 0; --i) {
        const child = curr.children[i];
        if (!child) continue;
        parentMap.set(child, curr);
        stack.push(child);

        // if(child.data.type === NodeType.func || child.data.type === NodeType.group) //ignore non-input node
        //   continue;
        // if (child.condition) {  //ignore node to skip
        //   let currValue = curr.data.type !== NodeType.group ? curr.data.value : undefined;
        //   if (curr.data.type === NodeType.singleSelect) {
        //     const csq:SingleSelectQuestion = curr.data;
        //     if (csq.returnObject) {
        //       currValue = (csq.value as OptionItem).id;
        //     }
        //   }
        //   const valueToValidate = child.condition.target ? await getRealValue(currValue, child.condition.target, inputs, remoteFuncExecutor) : currValue;
        //   if (valueToValidate) {
        //     const validRes = await validate(child.condition, valueToValidate as string | string[], inputs, remoteFuncExecutor);
        //     if (validRes !== undefined) {
        //       continue;
        //     }
        //   }
        // }
        // ++ totalSteps;
      }
    }
  }
  return { type: InputResultType.sucess };
}

