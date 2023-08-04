// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FxError,
  IQTreeNode,
  InputResult,
  Inputs,
  MultiSelectQuestion,
  OptionItem,
  QTreeNode,
  Question,
  Result,
  SingleSelectQuestion,
  StaticOptions,
  TelemetryEvent,
  TelemetryProperty,
  TelemetryReporter,
  UserError,
  UserInteraction,
  Void,
  err,
  getValidationFunction,
  ok,
  validate,
} from "@microsoft/teamsfx-api";
import { assign, cloneDeep } from "lodash";
import { EmptyOptionError, InputValidationError, UserCancelError, assembleError } from "../error";
import { validationUtils } from "./validationUtils";

export function isAutoSkipSelect(q: Question): boolean {
  if (q.type === "singleSelect" || q.type === "multiSelect") {
    const select = q;
    if (select.skipSingleOption && select.staticOptions.length === 1) {
      return true;
    }
  }
  return false;
}

export function getSingleOption(
  q: SingleSelectQuestion | MultiSelectQuestion,
  option?: StaticOptions
): any {
  if (!option) option = q.staticOptions;
  const optionIsString = typeof option[0] === "string";
  let returnResult;
  if (optionIsString) returnResult = option[0];
  else {
    if (q.returnObject === true) returnResult = option[0];
    else returnResult = (option[0] as OptionItem).id;
  }
  if (q.type === "singleSelect") return returnResult;
  else return [returnResult];
}

async function getCallFuncValue(inputs: Inputs, raw?: unknown): Promise<unknown> {
  if (raw && typeof raw === "function") {
    return await raw(inputs);
  }
  return raw;
}

export type QuestionTreeVisitor = (
  question: Question,
  ui: UserInteraction,
  inputs: Inputs,
  step?: number,
  totalSteps?: number
) => Promise<Result<InputResult<any>, FxError>>;

/**
 * ask question when visiting the question tree
 * @param question
 * @param core
 * @param inputs
 */
const questionVisitor: QuestionTreeVisitor = async function (
  question: Question,
  ui: UserInteraction,
  inputs: Inputs,
  step?: number,
  totalSteps?: number
): Promise<Result<InputResult<any>, FxError>> {
  if (inputs[question.name] !== undefined) {
    // validate existing answer in inputs object
    const res = await validationUtils.validateManualInputs(question, inputs);
    if (res) return err(new InputValidationError(question.name, res));
    return ok({ type: "skip", result: inputs[question.name] });
  }
  const title = (await getCallFuncValue(inputs, question.title)) as string;
  if (question.type === "func") {
    try {
      let res: any;
      if (ui.executeFunction) {
        res = await ui.executeFunction({
          name: question.name,
          title: title ?? "Executing operation...",
          func: question.func,
          inputs: inputs,
        });
      } else {
        res = await question.func(inputs);
      }
      if (typeof res === "object" && "isOk" in res) {
        const fxresult = res as Result<any, FxError>;
        if (fxresult.isOk()) {
          return ok({ type: "skip", result: fxresult.value });
        } else {
          return err(fxresult.error);
        }
      }
      return ok({ type: "skip", result: res });
    } catch (e) {
      return err(assembleError(e));
    }
  } else {
    let defaultValue:
      | string
      | string[]
      | (() => Promise<string>)
      | (() => Promise<string[]>)
      | undefined = undefined;
    if (question.forgetLastValue !== true && question.value)
      defaultValue = question.value as string | string[];
    else {
      if (question.default) {
        if (typeof question.default === "function") {
          defaultValue = async () => {
            return (question as any).default(inputs);
          };
        } else {
          defaultValue = question.default;
        }
      }
    }
    const placeholder = (await getCallFuncValue(inputs, question.placeholder)) as string;
    const prompt = (await getCallFuncValue(inputs, question.prompt)) as string;
    if (question.type === "text") {
      const validationFunc = question.validation
        ? getValidationFunction<string>(question.validation, inputs)
        : undefined;
      const additionalValidationOnAcceptFunc = question.additionalValidationOnAccept
        ? getValidationFunction<string>(question.additionalValidationOnAccept, inputs)
        : undefined;
      const inputQuestion = question;
      return await ui.inputText({
        name: question.name,
        title: title,
        password: inputQuestion.password,
        default: defaultValue as string | (() => Promise<string>),
        placeholder: placeholder,
        prompt: prompt,
        validation: validationFunc,
        step: step,
        totalSteps: totalSteps,
        additionalValidationOnAccept: additionalValidationOnAcceptFunc,
      });
    } else if (question.type === "singleSelect" || question.type === "multiSelect") {
      const selectQuestion = question;
      let options: StaticOptions | (() => Promise<StaticOptions>) | undefined = undefined;
      if (selectQuestion.dynamicOptions) {
        options = async () => {
          return selectQuestion.dynamicOptions!(inputs);
        };
      } else {
        if (!selectQuestion.staticOptions || selectQuestion.staticOptions.length === 0) {
          return err(new EmptyOptionError());
        }
        if (selectQuestion.skipSingleOption && selectQuestion.staticOptions.length === 1) {
          const returnResult = getSingleOption(selectQuestion, selectQuestion.staticOptions);
          return ok({ type: "skip", result: returnResult });
        }
        options = selectQuestion.staticOptions;
      }
      if (question.type === "singleSelect") {
        const validationFunc = question.validation
          ? getValidationFunction<string>(question.validation, inputs)
          : undefined;
        return await ui.selectOption({
          name: question.name,
          title: title,
          options: options,
          returnObject: selectQuestion.returnObject,
          default: defaultValue as string | (() => Promise<string>),
          placeholder: placeholder,
          prompt: prompt,
          step: step,
          totalSteps: totalSteps,
          buttons: question.buttons,
          validation: validationFunc,
          skipSingleOption: selectQuestion.skipSingleOption,
        });
      } else {
        const mq = selectQuestion as MultiSelectQuestion;
        const validationFunc = question.validation
          ? getValidationFunction<string[]>(question.validation, inputs)
          : undefined;
        return await ui.selectOptions({
          name: question.name,
          title: title,
          options: options,
          returnObject: selectQuestion.returnObject,
          default: defaultValue as string[] | (() => Promise<string[]>),
          placeholder: placeholder,
          prompt: prompt,
          onDidChangeSelection: mq.onDidChangeSelection,
          step: step,
          totalSteps: totalSteps,
          validation: validationFunc,
          skipSingleOption: selectQuestion.skipSingleOption,
        });
      }
    } else if (question.type === "multiFile") {
      const validationFunc = question.validation
        ? getValidationFunction<string[]>(question.validation, inputs)
        : undefined;
      return await ui.selectFiles({
        name: question.name,
        title: title,
        placeholder: placeholder,
        prompt: prompt,
        default: defaultValue as string[] | (() => Promise<string[]>),
        step: step,
        totalSteps: totalSteps,
        validation: validationFunc,
      });
    } else if (question.type === "singleFile") {
      const validationFunc = question.validation
        ? getValidationFunction<string>(question.validation, inputs)
        : undefined;
      return await ui.selectFile({
        name: question.name,
        title: title,
        placeholder: placeholder,
        prompt: prompt,
        default: defaultValue as string | (() => Promise<string>),
        step: step,
        totalSteps: totalSteps,
        validation: validationFunc,
        filters: question.filters,
      });
    } else if (question.type === "folder") {
      const validationFunc = question.validation
        ? getValidationFunction<string>(question.validation, inputs)
        : undefined;
      return await ui.selectFolder({
        name: question.name,
        title: title,
        placeholder: placeholder,
        prompt: prompt,
        default: defaultValue as string | (() => Promise<string>),
        step: step,
        totalSteps: totalSteps,
        validation: validationFunc,
      });
    } else if (question.type === "singleFileOrText" && !!ui.selectFileOrInput) {
      const validationFunc = question.validation
        ? getValidationFunction<string>(question.validation, inputs)
        : undefined;
      const additionalValidationOnAcceptFunc = question.inputBoxConfig.additionalValidationOnAccept
        ? getValidationFunction<string>(
            { validFunc: question.inputBoxConfig.additionalValidationOnAccept },
            inputs
          )
        : undefined;
      question.inputBoxConfig.additionalValidationOnAccept = additionalValidationOnAcceptFunc;
      const res = await ui.selectFileOrInput({
        name: question.name,
        title: title,
        placeholder: placeholder,
        prompt: prompt,
        inputOptionItem: question.inputOptionItem,
        inputBoxConfig: question.inputBoxConfig,
        filters: question.filters,
        step: step,
        totalSteps: totalSteps,
        validation: validationFunc,
      });
      return res;
    }
  }
  return err(
    new UserError(
      "API",
      "UnsupportedNodeType",
      `Unsupported question node type:${JSON.stringify(question)}`,
      `Unsupported question node type:${JSON.stringify(question)}`
    )
  );
};
// export async function traverse(
//   root: IQTreeNode,
//   inputs: Inputs,
//   ui: UserInteraction,
//   telemetryReporter?: TelemetryReporter,
//   visitor: QuestionTreeVisitor = questionVisitor
// ): Promise<Result<Void, FxError>> {
//   const stack: IQTreeNode[] = [];
//   const history: IQTreeNode[] = [];
//   stack.push(root);
//   let step = 1; // manual input step
//   let totalStep = 1;
//   const parentMap = new Map<IQTreeNode, IQTreeNode>();
//   // const valueMap = new Map<QTreeNode, unknown>();
//   const autoSkipSet = new Set<IQTreeNode>();
//   while (stack.length > 0) {
//     const curr = stack.pop();
//     if (!curr) continue;
//     //visit
//     if (curr.data.type !== "group") {
//       const question = curr.data;
//       totalStep = step + stack.length;
//       let qvRes;
//       try {
//         qvRes = await visitor(question, ui, inputs, step, totalStep);
//         sendTelemetryEvent(telemetryReporter, qvRes, question, inputs);
//       } catch (e) {
//         return err(assembleError(e));
//       }
//       if (qvRes.isErr()) {
//         // Cancel or Error
//         return err(qvRes.error);
//       }
//       const inputResult = qvRes.value;
//       if (inputResult.type === "back") {
//         stack.push(curr);

//         // find the previous input that is neither group nor func nor single option select
//         let found = false;
//         while (history.length > 0) {
//           const last = history.pop();
//           if (!last) continue;
//           if (last.children) {
//             while (stack.length > 0) {
//               const tmp = stack[stack.length - 1];
//               if (last.children.includes(tmp)) {
//                 stack.pop();
//               } else {
//                 break;
//               }
//             }
//           }
//           stack.push(last);
//           if (last.data.type !== "group") delete inputs[last.data.name];

//           const lastIsAutoSkip = autoSkipSet.has(last);
//           if (last.data.type !== "group" && last.data.type !== "func" && !lastIsAutoSkip) {
//             found = true;
//             break;
//           }
//         }
//         if (!found) {
//           return err(new UserCancelError());
//         }
//         --step;
//         continue; //ignore the following steps
//       } else {
//         //success or skip
//         question.value = inputResult.result;
//         inputs[question.name] = question.value;

//         if (inputResult.type === "skip" || question.type === "func") {
//           if (inputResult.type === "skip") autoSkipSet.add(curr);
//         } else {
//           ++step;
//         }
//       }
//     }

//     history.push(curr);

//     if (curr.children) {
//       const matchChildren: IQTreeNode[] = [];
//       const valueInMap = findValue(curr, parentMap); //curr.data.type !== "group" ? curr.data.value : undefined; //valueMap.get(curr);
//       for (const child of curr.children) {
//         if (!child) continue;
//         if (child.condition) {
//           const validRes = await validate(
//             child.condition,
//             valueInMap as string | string[] | OptionItem | OptionItem[],
//             inputs
//           );
//           if (validRes !== undefined) {
//             continue;
//           }
//         }
//         matchChildren.push(child);
//       }
//       for (let i = matchChildren.length - 1; i >= 0; --i) {
//         const child = matchChildren[i];
//         parentMap.set(child, curr);
//         stack.push(child);
//       }
//     }
//   }
//   return ok(Void);
// }

/**
 * serialize the tree node into array in DFS order
 */
export function collect(
  node: IQTreeNode,
  list: IQTreeNode[],
  parentMap: Map<IQTreeNode, IQTreeNode>
): void {
  list.push(node);
  if (node.children) {
    for (const child of node.children) {
      if (child) {
        parentMap.set(child, node);
        collect(child, list, parentMap);
      }
    }
  }
}

export async function traverse(
  root: IQTreeNode,
  inputs: Inputs,
  ui: UserInteraction,
  telemetryReporter?: TelemetryReporter,
  visitor: QuestionTreeVisitor = questionVisitor
): Promise<Result<Void, FxError>> {
  // The reason to clone is that we don't want to change the original inputs if user cancel the process
  const clonedInputs = cloneDeep(inputs);

  // 1. collect all nodes into array
  const parentMap = new Map<IQTreeNode, IQTreeNode>();
  const nodeList: IQTreeNode[] = [];
  collect(root, nodeList, parentMap);

  const visitedNodeSet = new Set<IQTreeNode>();

  const visitedInputNodeArray: IQTreeNode[] = [];

  let i = 0;
  for (; i < nodeList.length; ++i) {
    const node = nodeList[i];

    // if parent node is not visited, current node should not be visited
    const parent = parentMap.get(node);
    if (parent) {
      if (!visitedNodeSet.has(parent)) {
        continue;
      }
    }

    // 1. check condition
    if (node.condition) {
      let parentValue: any = undefined;
      // const parent = parentMap.get(node);
      if (parent) {
        parentValue = findValue(parent, parentMap);
      }
      const validRes = await validate(
        node.condition,
        parentValue as string | string[] | OptionItem | OptionItem[],
        clonedInputs
      );
      if (validRes !== undefined) {
        continue;
      }
    }

    // 2. visit node if not group
    if (node.data.type !== "group") {
      const question = node.data;
      let res;
      try {
        res = await visitor(
          question,
          ui,
          clonedInputs,
          visitedInputNodeArray.length + 1,
          undefined
        );
        sendTelemetryEvent(telemetryReporter, res, question, clonedInputs);
      } catch (e) {
        return err(assembleError(e));
      }
      if (res.isErr()) {
        // Cancel or Error
        return err(res.error);
      }
      const inputResult = res.value;
      if (inputResult.type === "back") {
        const prevNode = visitedInputNodeArray.pop();
        if (!prevNode) {
          return err(new UserCancelError());
        }
        for (--i; i >= 0; --i) {
          const tmpNode = nodeList[i];
          visitedNodeSet.delete(tmpNode);
          // clear prevNode data
          if (tmpNode.data.type !== "group") {
            delete tmpNode.data.value;
            delete tmpNode.data.valueType;
            delete clonedInputs[tmpNode.data.name];
          }
          if (tmpNode === prevNode) {
            break;
          }
        }
        --i;
        continue;
      } else {
        //success or skip: set value
        question.value = inputResult.result;
        question.valueType = inputResult.type;
        clonedInputs[question.name] = question.value;
        visitedNodeSet.add(node);
        if (question.valueType === "success") {
          visitedInputNodeArray.push(node);
        }
      }
    } else {
      visitedNodeSet.add(node);
    }
  }
  assign(inputs, clonedInputs);
  return ok(Void);
}

function findValue(
  curr: QTreeNode | IQTreeNode,
  parentMap: Map<QTreeNode | IQTreeNode, QTreeNode | IQTreeNode>
): any {
  if (curr.data.type !== "group") {
    // need to convert OptionItem value into id for validation
    if (curr.data.type === "singleSelect") {
      const sq: SingleSelectQuestion = curr.data;
      if (sq.value && typeof sq.value !== "string" && sq.value.id) {
        return sq.value.id;
      }
    } else if (curr.data.type === "multiSelect") {
      const mq: MultiSelectQuestion = curr.data;
      if (mq.value && typeof mq.value[0] !== "string") {
        return (mq.value as OptionItem[]).map((i) => i.id);
      }
    }
    return curr.data.value;
  }
  const parent = parentMap.get(curr);
  if (parent) {
    return findValue(parent, parentMap);
  }
  return undefined;
}

function sendTelemetryEvent(
  telemetryReporter: TelemetryReporter | undefined,
  qvres: Result<InputResult<any>, FxError>,
  question: Question,
  inputs: Inputs
) {
  if (qvres.isErr()) {
    telemetryReporter?.sendTelemetryEvent(TelemetryEvent.askQuestion, {
      [TelemetryProperty.answerType]: qvres.error.name,
      [TelemetryProperty.question]: question.name,
      [TelemetryProperty.platform]: inputs.platform,
      [TelemetryProperty.stage]: inputs.stage ? inputs.stage : "",
    });
  } else {
    telemetryReporter?.sendTelemetryEvent(TelemetryEvent.askQuestion, {
      [TelemetryProperty.answerType]: qvres.value.type,
      [TelemetryProperty.question]: question.name,
      [TelemetryProperty.answer]:
        question.type == "singleSelect" || question.type == "multiSelect"
          ? qvres.value.result?.toString()
          : "",
      [TelemetryProperty.platform]: inputs.platform,
      [TelemetryProperty.stage]: inputs.stage ? inputs.stage : "",
    });
  }
}
