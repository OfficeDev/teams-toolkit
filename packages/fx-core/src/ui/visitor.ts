// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  TextInputQuestion,
  QTreeNode,
  Question,
  SingleSelectQuestion,
  StaticOptions,
  MultiSelectQuestion,
  Inputs,
  FxError,
  err,
  ok,
  OptionItem,
  UserInteraction,
  Result,
  InputResult,
  getValidationFunction,
  UserError,
  TelemetryReporter,
  Void,
  validate,
  TelemetryEvent,
  TelemetryProperty,
  DynamicOptions,
} from "@microsoft/teamsfx-api";
import { EmptyOptionError, UserCancelError, assembleError } from "../error";

export function isAutoSkipSelect(q: Question): boolean {
  if (q.type === "singleSelect" || q.type === "multiSelect") {
    const select = q as SingleSelectQuestion | MultiSelectQuestion;
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

type QuestionTreeVisitor = (
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
          return ok({ type: "success", result: fxresult.value });
        } else {
          return err(fxresult.error);
        }
      }
      return ok({ type: "success", result: res });
    } catch (e) {
      return err(assembleError(e));
    }
  } else {
    const defaultValue =
      question.forgetLastValue !== true && question.value
        ? question.value
        : await getCallFuncValue(inputs, question.default);
    const placeholder = (await getCallFuncValue(inputs, question.placeholder)) as string;
    const prompt = (await getCallFuncValue(inputs, question.prompt)) as string;
    if (question.type === "text") {
      const validationFunc = question.validation
        ? getValidationFunction<string>(question.validation, inputs)
        : undefined;
      const inputQuestion = question as TextInputQuestion;
      return await ui.inputText({
        name: question.name,
        title: title,
        password: (inputQuestion as TextInputQuestion).password,
        default: defaultValue as string,
        placeholder: placeholder,
        prompt: prompt,
        validation: validationFunc,
        step: step,
        totalSteps: totalSteps,
      });
    } else if (question.type === "singleSelect" || question.type === "multiSelect") {
      const selectQuestion = question as SingleSelectQuestion | MultiSelectQuestion;
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
          default: defaultValue as string,
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
          default: defaultValue as string[],
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
        default: defaultValue as string,
        step: step,
        totalSteps: totalSteps,
        validation: validationFunc,
        possibleOptions: question.possibleOptions,
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
        default: defaultValue as string,
        step: step,
        totalSteps: totalSteps,
        validation: validationFunc,
      });
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

export async function traverse(
  root: QTreeNode,
  inputs: Inputs,
  ui: UserInteraction,
  telemetryReporter?: TelemetryReporter,
  visitor: QuestionTreeVisitor = questionVisitor
): Promise<Result<Void, FxError>> {
  const stack: QTreeNode[] = [];
  const history: QTreeNode[] = [];
  stack.push(root);
  let step = 1; // manual input step
  let totalStep = 1;
  const parentMap = new Map<QTreeNode, QTreeNode>();
  // const valueMap = new Map<QTreeNode, unknown>();
  const autoSkipSet = new Set<QTreeNode>();
  while (stack.length > 0) {
    const curr = stack.pop();
    if (!curr) continue;
    //visit
    if (curr.data.type !== "group") {
      const question = curr.data as Question;
      totalStep = step + stack.length;
      let qvRes;
      try {
        qvRes = await visitor(question, ui, inputs, step, totalStep);
        sendTelemetryEvent(telemetryReporter, qvRes, question, inputs);
      } catch (e) {
        return err(assembleError(e));
      }
      if (qvRes.isErr()) {
        // Cancel or Error
        return err(qvRes.error);
      }
      const inputResult = qvRes.value;
      if (inputResult.type === "back") {
        stack.push(curr);

        // find the previous input that is neither group nor func nor single option select
        let found = false;
        while (history.length > 0) {
          const last = history.pop();
          if (!last) continue;
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
          if (last.data.type !== "group" && last.data.type !== "func" && !lastIsAutoSkip) {
            found = true;
            break;
          }
        }
        if (!found) {
          return err(new UserCancelError());
        }
        --step;
        continue; //ignore the following steps
      } else {
        //success or skip
        question.value = inputResult.result;
        inputs[question.name] = question.value;

        if (inputResult.type === "skip" || question.type === "func") {
          if (inputResult.type === "skip") autoSkipSet.add(curr);
        } else {
          ++step;
        }
      }
    }

    history.push(curr);

    if (curr.children) {
      const matchChildren: QTreeNode[] = [];
      const valueInMap = findValue(curr, parentMap); //curr.data.type !== "group" ? curr.data.value : undefined; //valueMap.get(curr);
      for (const child of curr.children) {
        if (!child) continue;
        if (child.condition) {
          const validRes = await validate(
            child.condition,
            valueInMap as string | string[] | OptionItem | OptionItem[],
            inputs
          );
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

function findValue(curr: QTreeNode, parentMap: Map<QTreeNode, QTreeNode>): any {
  if (curr.data.type !== "group") {
    // need to convert OptionItem value into id for validation
    if (curr.data.type === "singleSelect") {
      const sq: SingleSelectQuestion = curr.data as SingleSelectQuestion;
      if (sq.value && typeof sq.value !== "string" && (sq.value as OptionItem).id) {
        return (sq.value as OptionItem).id;
      }
    } else if (curr.data.type === "multiSelect") {
      const mq: MultiSelectQuestion = curr.data as MultiSelectQuestion;
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
