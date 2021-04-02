// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
    Func,
    TextInputQuestion,
    NodeType,
    QTreeNode,
    Question,
    returnUserError,
    SingleSelectQuestion,
    Option,
    StaticOption,
    OptionItem,
    MultiSelectQuestion,
    FileQuestion,
    Core
  } from "../index";
import { getValidationFunction, validate } from "../utils/validation";
import { NumberInputQuestion, ReadonlyUserInputs, UserInputs } from "./question";
import { InputResult, InputResultType, UserInterface } from "./ui";
 
   
  export async function getRealValue(
    parentValue: unknown,
    defaultValue: unknown,
    core?:Core,
    inputs?: UserInputs
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
      const func: Func = defaultValue as Func;
      if (core && func && func.method) {
        const res = await core.executeFuncQuestion(defaultValue as Func, inputs as ReadonlyUserInputs);
        if (res.isOk()) {
          return res.value;
        }
      }
    }
    return output;
  }
  
  function isAutoSkipSelect(q: Question): boolean {
    if (q.type === NodeType.singleSelect) {
      const select: SingleSelectQuestion = q as SingleSelectQuestion;
      const options = select.option as StaticOption;
      if (select.skipSingleOption && select.option instanceof Array && options.length === 1) {
        return true;
      }
    }
    return false;
  }
  
  export type QuestionVistor = (
    question: Question,
    parentValue: unknown,
    ui: UserInterface,
    backButton?: boolean,
    core?:Core,
    answers?: UserInputs
  ) => Promise<InputResult>;

  /**
   * ask question when visiting the question tree
   * @param question
   * @param core
   * @param answers
   */
  export const visitQuestion:QuestionVistor = async function(
    question: Question,
    parentValue: unknown,
    ui: UserInterface,
    backButton?: boolean,
    core?:Core,
    answers?: UserInputs
  ): Promise<InputResult> {
    const type = question.type;
    //FunctionCallQuestion
    if (type === NodeType.func) {
      if (core && core.executeFuncQuestion) {
        const res = await core.executeFuncQuestion(question as Func, answers as ReadonlyUserInputs);
        if (res.isOk()) {
          return { type: InputResultType.sucess, result: res.value};
        }
      }
    } else {
      let defaultValue: unknown = undefined;
      if (question.default) {
        defaultValue = await getRealValue(parentValue, question.default, core, answers as ReadonlyUserInputs);
      }
      if (type === NodeType.text || type === NodeType.password || type === NodeType.number) {
        const inputQuestion: TextInputQuestion|NumberInputQuestion = question as (TextInputQuestion | NumberInputQuestion);
        const validationFunc = inputQuestion.validation ? getValidationFunction(inputQuestion.validation,  core, answers as ReadonlyUserInputs) : undefined;
        return await ui.showInputBox({
          title: inputQuestion.title || inputQuestion.description || inputQuestion.name,
          password: !!(type === NodeType.password),
          defaultValue: defaultValue as string,
          placeholder: inputQuestion.placeholder,
          prompt: inputQuestion.prompt || inputQuestion.description,
          validation: validationFunc,
          backButton: backButton,
          number: !!(type === NodeType.number)
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
          if (core) {
            const res = await core.executeFuncQuestion(selectQuestion.option as Func, answers as ReadonlyUserInputs);
            if (res.isOk()) {
              option = res.value as StaticOption;
            }
          }
        }
        if (!option || option.length === 0) {
          return {
            type: InputResultType.error,
            error: returnUserError(
              new Error("Select option is empty!"),
              "API",
              "EmptySelectOption"
            )
          };
        }
        //skip single option select
        if (type === NodeType.singleSelect  && (selectQuestion as SingleSelectQuestion).skipSingleOption && option.length === 1) {
            const isString = typeof option[0] === "string";
            if(selectQuestion.returnObject){
                return {
                    type: InputResultType.pass,
                    result: isString ? { id: option[0] }: option[0]
                  };
            }
            else {
                return {
                    type: InputResultType.pass,
                    result: isString ? option[0] : (option[0] as OptionItem).id
                };
            }
        }
        return await ui.showQuickPick({
          title: selectQuestion.title || selectQuestion.description || selectQuestion.name,
          items: option,
          canSelectMany: !!(type === NodeType.multiSelect),
          returnObject: selectQuestion.returnObject,
          defaultValue: defaultValue as string|string[]|undefined,
          placeholder: selectQuestion.placeholder,
          backButton: backButton
        });
      } else if (type === NodeType.folder) {
        const fileQuestion: FileQuestion = question as FileQuestion;
        const validationFunc = fileQuestion.validation? getValidationFunction(fileQuestion.validation, core, answers as ReadonlyUserInputs) : undefined;
        return await ui.showOpenDialog({
            defaultUri: defaultValue as string|undefined,
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            title: fileQuestion.title || fileQuestion.description || fileQuestion.name,
            validation: validationFunc
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
    userInputs: UserInputs,
    ui: UserInterface,
    questionVisitor: QuestionVistor,
    core?:Core,
  ): Promise<InputResult> {
    const stack: QTreeNode[] = [];
    const history: QTreeNode[] = [];
    let firstQuestion: Question | undefined;
    stack.push(root);
  
    const parentMap = new Map<QTreeNode, QTreeNode>();
  
    while (stack.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const curr:QTreeNode = stack.pop()!;
      let currValue: unknown = undefined;
      //visit
      if (curr.data.type !== NodeType.group) {
        const question = curr.data as Question;
        const parent = parentMap.get(curr);
        const parentValue = parent && parent.data.type !== NodeType.group ? parent.data.value : undefined;
        if (!firstQuestion) firstQuestion = question;
        const inputResult = await questionVisitor(question, parentValue, ui, question !== firstQuestion, core, userInputs);
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
          userInputs[question.name]= question.value;
        }
      }
  
      history.push(curr);
  
      if (curr.children) {
  
        /// if current node is single select node and return OptionItem as value, then the currnetValue is it's label
        if(curr.data.type === NodeType.singleSelect){
          const sq:SingleSelectQuestion = curr.data;
          if(sq.returnObject){
            currValue = (sq.value as OptionItem).label;
          }
        }
  
        for (let i = curr.children.length - 1; i >= 0; --i) {
          const child = curr.children[i];
          parentMap.set(child, curr);
          if (child.condition) {
            const realValue = child.condition.target
              ? await getRealValue(currValue, child.condition.target, core, userInputs as ReadonlyUserInputs)
              : currValue;
            if(realValue){
                const validRes = await validate(child.condition, realValue as string|string[], core, userInputs as ReadonlyUserInputs);
                if (validRes !== undefined) {
                    continue;
                }
            }
          }
          stack.push(child);
        }
      }
    }
    return { type: InputResultType.sucess };
  }
  