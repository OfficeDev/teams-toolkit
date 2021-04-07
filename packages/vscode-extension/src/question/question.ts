// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ConfigMap,
  Func,
  NodeType,
  QTreeNode,
  Question,
  returnUserError,
  SingleSelectQuestion,
  Option,
  StaticOption,
  OptionItem,
  MultiSelectQuestion,
  TextInputQuestion,
  FileQuestion
} from "fx-api";
import { window } from "vscode";
import { CoreProxy } from "fx-core";
import { InputResult, InputResultType } from "./types";
import { showInputBox, showQuickPick } from "./vscode_ui";
import VsCodeLogInstance from "../commonlib/log";
import { ExtensionErrors, ExtensionSource } from "../error";
import { getValidationFunction, validate } from "./validation";

const core:CoreProxy = CoreProxy.getInstance();

export async function getRealValue(
  parentValue: any,
  defaultValue: any,
  answers?: ConfigMap
): Promise<any> {
  let output: any = defaultValue;
  if (typeof defaultValue === "string") {
    const defstr = defaultValue as string;
    if (defstr === "$parent") {
      output = parentValue;
    } else if (defstr.startsWith("$parent.") && parentValue instanceof Object) {
      const property = defstr.substr(8);
      output = parentValue[property];
    }
  } else {
    const func: Func = defaultValue as Func;
    if (func && func.method) {
      const res = await core.callFunc(defaultValue as Func, answers);
      if (res.isOk()) {
        return res.value;
      }
      else {
        return undefined;
      }
    }
  }
  return output;
}

function isAutoSkipSelect(q: Question): boolean {
  if (q.type === NodeType.singleSelect) {
    const select: SingleSelectQuestion = q as SingleSelectQuestion;
    const options = select.option as StaticOption;
    if (select.option instanceof Array && options.length === 1) {
      return true;
    }
  }
  return false;
}

/**
 * ask question when visiting the question tree
 * @param question
 * @param core
 * @param answers
 */
export async function questionVisit(
  question: Question,
  parentValue: any,
  answers: ConfigMap,
  canGoBack?: boolean
): Promise<InputResult> {
  const type = question.type;
  if (type === NodeType.func) {
    
    if (core.callFunc) {
      const res = await core.callFunc(question as Func, answers);
      if (res.isOk()) {
        return { type: InputResultType.sucess, result: res.value };
      }
    }
  } else {
    let defaultValue: any = undefined;
    if (question.default) {
      defaultValue = await getRealValue(parentValue, question.default, answers);
    }
    
    if (type === NodeType.text || type === NodeType.password) {
      const inputQuestion: TextInputQuestion = question as TextInputQuestion;
      const validationFunc = inputQuestion.validation? getValidationFunction(inputQuestion.validation, answers):undefined;
      return await showInputBox({
        title: inputQuestion.title || inputQuestion.description || inputQuestion.name,
        password: !!(type === NodeType.password),
        defaultValue: defaultValue,
        placeholder: inputQuestion.placeholder,
        prompt: inputQuestion.prompt || inputQuestion.description,
        validation: validationFunc,
        backButton: canGoBack
      });
    } else if (type === NodeType.singleSelect || type === NodeType.multiSelect) {
      const selectQuestion: SingleSelectQuestion | MultiSelectQuestion = question as
        | SingleSelectQuestion
        | MultiSelectQuestion;
      let option: Option = [];
      if (selectQuestion.option instanceof Array) {
        //StaticOption
        option = selectQuestion.option;
      } else {
        // DynamicOption
        if (core.callFunc) {
          const res = await core.callFunc(selectQuestion.option as Func, answers);
          if (res.isOk()) {
            option = res.value as StaticOption;
          }
          else {
            return { type: InputResultType.error, error: res.error };
          }
        }
      }
      if (!option || option.length === 0) {
        return {
          type: InputResultType.error,
          error: returnUserError(
            new Error("Select option is empty!"),
            ExtensionSource,
            ExtensionErrors.EmptySelectOption
          )
        };
      }
      //skip single option select
      if (type === NodeType.singleSelect  && option.length === 1) {
        const optionIsString = typeof option[0] === "string";
        if(selectQuestion.returnObject){
            return {
                type: InputResultType.pass,
                result: optionIsString ? { label: option[0] as string }: (option[0] as OptionItem)
              };
        }
        else {
            return {
                type: InputResultType.pass,
                result: optionIsString ? option[0] : (option[0] as OptionItem).label
            };
        }
    }
      return await showQuickPick({
        title: selectQuestion.title || selectQuestion.description || selectQuestion.name,
        items: option,
        canSelectMany: !!(type === NodeType.multiSelect),
        returnObject: selectQuestion.returnObject,
        defaultValue: defaultValue,
        placeholder: selectQuestion.placeholder,
        backButton: canGoBack,
      });
    } else if (type === NodeType.folder) {
      const fileQuestion = question as FileQuestion;
      while (true) {
        const uri = await window.showOpenDialog({
          defaultUri: defaultValue,
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          title: question.title || question.description || question.name
        });
        const res = uri && uri.length > 0 ? uri[0].fsPath : undefined;
        if (!res) {
          return { type: InputResultType.cancel };
        }
        const validationFunc = getValidationFunction(fileQuestion.validation, answers);
        const vres = await validationFunc(res);
        if (!vres) {
          return { type: InputResultType.sucess, result: res };
        } else {
          await window.showErrorMessage(vres);
        }
      }
    }
  }
  return {
    type: InputResultType.error,
    error: returnUserError(
      new Error(`Unsupported question node type:${question.type}`),
      ExtensionSource,
      ExtensionErrors.UnsupportedNodeType
    )
  };
}

export async function traverse(
  node: QTreeNode,
  answerMap: ConfigMap,
  visit: (
    q: Question,
    parentValue: any,
    answers: ConfigMap,
    canGoBack?: boolean
  ) => Promise<InputResult>
): Promise<InputResult> {
  const stack: QTreeNode[] = [];
  const history: QTreeNode[] = [];
  let firstQuestion: Question | undefined;
  stack.push(node);

  const parentMap = new Map<QTreeNode, QTreeNode>();

  while (stack.length > 0) {
    const curr = stack.pop()!;
    let currValue: any = undefined;
    //visit
    if (curr.data.type !== NodeType.group) {
      const question = curr.data as Question;
      const parent = parentMap.get(curr);
      const parentValue =
        parent && parent.data.type !== NodeType.group ? parent.data.value : undefined;
      VsCodeLogInstance.info(`ask question:${JSON.stringify(question)}`);
      if (!firstQuestion) firstQuestion = question;
      const inputResult = await visit(question, parentValue, answerMap, question !== firstQuestion);
      VsCodeLogInstance.info(`answer:${JSON.stringify(inputResult)}`);
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
          if (
            last.data.type !== NodeType.group &&
            last.data.type !== NodeType.func &&
            !isAutoSkipSelect(last.data)
          ) {
            //ignore single select options
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
        currValue = question.value;
        answerMap.set(question.name, question.value);
      }
    }

    history.push(curr);

    if (curr.children) {
      for (let i = curr.children.length - 1; i >= 0; --i) {
        const child = curr.children[i];
        if(!child) continue;
        parentMap.set(child, curr);
        if (child.condition) {
          const realValue = child.condition.target
            ? getRealValue(currValue, child.condition.target, answerMap)
            : currValue;
          const validRes = await validate(child.condition, realValue, answerMap);
          if (validRes !== undefined) {
            continue;
          }
        }
        stack.push(child);
      }
    }
  }
  return { type: InputResultType.sucess };
}
