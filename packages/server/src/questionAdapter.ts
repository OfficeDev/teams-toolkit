// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  assembleError,
  err,
  FxError,
  Json,
  LocalFunc,
  ok,
  OnSelectionChangeFunc,
  QTreeNode,
  Question,
  Result,
  SystemError,
  ValidateFunc,
} from "@microsoft/teamsfx-api";

import { CustomizeFuncRequestType, CustomizeFuncType } from "./APIs";

export let GlobalFuncId = 0;
export type FuncType = LocalFunc<any> | ValidateFunc<any> | OnSelectionChangeFunc;

export const GlobalFuncMap = new Map<number, FuncType>();

export function setFunc(func: FuncType): number {
  ++GlobalFuncId;
  GlobalFuncMap.set(GlobalFuncId, func);
  return GlobalFuncId;
}

export function getFunc(id: number): FuncType | undefined {
  const func = GlobalFuncMap.get(id);
  return func;
}

export async function callFunc(
  type: CustomizeFuncType,
  id: number,
  ...params: any[]
): Promise<Result<any, FxError>> {
  const func = getFunc(id);
  if (func) {
    let result: any;
    try {
      if (type === "LocalFunc") {
        result = await (func as LocalFunc<any>)(params[0]);
      } else if (type === "ValidateFunc") {
        result = await (func as ValidateFunc<any>)(params[0], params[1]);
      } else if (type === "OnSelectionChangeFunc") {
        result = await (func as OnSelectionChangeFunc)(
          new Set<string>(params[0]),
          new Set<string>(params[1])
        );
      }
      return ok(result);
    } catch (e) {
      return err(assembleError(e));
    }
  }
  return err(new SystemError("FuncNotFound", `Function not found, id: ${id}`, "FxCoreServer"));
}

export function visit(question: Question): void {
  if (question.type === "func") {
    const id = setFunc(question.func);
    (question as any).func = { type: "LocalFunc", id: id } as CustomizeFuncRequestType;
  } else {
    if (typeof question.default === "function") {
      const id = setFunc(question.default);
      (question as any).default = { type: "LocalFunc", id: id } as CustomizeFuncRequestType;
    }
    if (typeof question.placeholder === "function") {
      const id = setFunc(question.placeholder);
      (question as any).placeholder = { type: "LocalFunc", id: id } as CustomizeFuncRequestType;
    }
    if (typeof question.prompt === "function") {
      const id = setFunc(question.prompt);
      (question as any).prompt = { type: "LocalFunc", id: id } as CustomizeFuncRequestType;
    }
    if (question.validation) {
      if ((question.validation as any).validFunc) {
        const id = setFunc((question.validation as any).validFunc);
        (question.validation as any).validFunc = {
          type: "ValidateFunc",
          id: id,
        } as CustomizeFuncRequestType;
      }
    }
    if (question.type === "singleSelect" || question.type === "multiSelect") {
      if (question.dynamicOptions) {
        const id = setFunc(question.dynamicOptions);
        (question as any).dynamicOptions = {
          type: "LocalFunc",
          id: id,
        } as CustomizeFuncRequestType;
      }
      if (question.type === "multiSelect") {
        if (question.onDidChangeSelection) {
          const id = setFunc(question.onDidChangeSelection);
          (question as any).onDidChangeSelection = {
            type: "OnSelectionChangeFunc",
            id: id,
          } as CustomizeFuncRequestType;
        }
      }
    }
  }
}

export function traverseToJson(root: QTreeNode): void {
  if (root.condition) {
    const cond: any = root.condition;
    if (cond.validFunc) {
      const id = setFunc(cond.validFunc);
      cond.validFunc = { type: "ValidateFunc", id: id } as CustomizeFuncRequestType;
    }
  }
  if (root.data.type !== "group") {
    const question = root.data as Question;
    visit(question);
  }
  if (root.children) {
    for (const child of root.children) {
      if (!child) continue;
      traverseToJson(child);
    }
  }
}

export function questionToJson(root: QTreeNode): Json {
  const copy = deepCopy(root);
  traverseToJson(copy);
  return copy as Json;
}

export const deepCopy = <T>(target: T): T => {
  if (target === null) {
    return target;
  }
  if (target instanceof Date) {
    return new Date(target.getTime()) as any;
  }
  if (target instanceof Array) {
    const cp = [] as any[];
    (target as any[]).forEach((v) => {
      cp.push(v);
    });
    return cp.map((n: any) => deepCopy<any>(n)) as any;
  }
  if (typeof target === "object" && target !== {}) {
    const cp = { ...(target as { [key: string]: any }) } as {
      [key: string]: any;
    };
    Object.keys(cp).forEach((k) => {
      cp[k] = deepCopy<any>(cp[k]);
    });
    return cp as T;
  }
  return target;
};

export function reset(): void {
  GlobalFuncId = 0;
  GlobalFuncMap.clear();
}
