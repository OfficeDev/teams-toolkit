"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.reset =
  exports.deepCopy =
  exports.questionToJson =
  exports.traverseToJson =
  exports.visit =
  exports.callFunc =
  exports.getFunc =
  exports.setFunc =
  exports.GlobalFuncMap =
  exports.GlobalFuncId =
    void 0;
const teamsfx_api_1 = require("@microsoft/teamsfx-api");
exports.GlobalFuncId = 0;
exports.GlobalFuncMap = new Map();
function setFunc(func) {
  ++exports.GlobalFuncId;
  exports.GlobalFuncMap.set(exports.GlobalFuncId, func);
  return exports.GlobalFuncId;
}
exports.setFunc = setFunc;
function getFunc(id) {
  const func = exports.GlobalFuncMap.get(id);
  return func;
}
exports.getFunc = getFunc;
function callFunc(rpc, ...params) {
  return __awaiter(this, void 0, void 0, function* () {
    const func = getFunc(rpc.id);
    if (func) {
      let result;
      try {
        if (rpc.type === "LocalFunc") {
          result = yield func(params[0]);
        } else if (rpc.type === "ValidateFunc") {
          result = yield func(params[0], params[1]);
        } else if (rpc.type === "OnSelectionChangeFunc") {
          result = yield func(new Set(params[0]), new Set(params[1]));
        }
        return (0, teamsfx_api_1.ok)(result);
      } catch (e) {
        return (0, teamsfx_api_1.err)((0, teamsfx_api_1.assembleError)(e));
      }
    }
    return (0,
    teamsfx_api_1.err)(new teamsfx_api_1.SystemError("FuncNotFound", `Function not found, id:${rpc.id}`, "FxCoreServer"));
  });
}
exports.callFunc = callFunc;
function visit(question) {
  if (question.type === "func") {
    const id = setFunc(question.func);
    question.func = { type: "LocalFunc", id: id };
  } else {
    if (typeof question.default === "function") {
      const id = setFunc(question.default);
      question.default = { type: "LocalFunc", id: id };
    }
    if (typeof question.placeholder === "function") {
      const id = setFunc(question.placeholder);
      question.placeholder = { type: "LocalFunc", id: id };
    }
    if (typeof question.prompt === "function") {
      const id = setFunc(question.prompt);
      question.prompt = { type: "LocalFunc", id: id };
    }
    if (question.validation) {
      if (question.validation.validFunc) {
        const id = setFunc(question.validation.validFunc);
        question.validation.validFunc = { type: "ValidateFunc", id: id };
      }
    }
    if (question.type === "singleSelect" || question.type === "multiSelect") {
      if (question.dynamicOptions) {
        const id = setFunc(question.dynamicOptions);
        question.dynamicOptions = { type: "LocalFunc", id: id };
      }
      if (question.type === "multiSelect") {
        if (question.onDidChangeSelection) {
          const id = setFunc(question.onDidChangeSelection);
          question.onDidChangeSelection = { type: "OnSelectionChangeFunc", id: id };
        }
      }
    }
  }
}
exports.visit = visit;
function traverseToJson(root) {
  if (root.condition) {
    const cond = root.condition;
    if (cond.validFunc) {
      const id = setFunc(cond.validFunc);
      cond.validFunc = { type: "ValidateFunc", id: id };
    }
  }
  if (root.data.type !== "group") {
    const question = root.data;
    visit(question);
  }
  if (root.children) {
    for (const child of root.children) {
      if (!child) continue;
      traverseToJson(child);
    }
  }
}
exports.traverseToJson = traverseToJson;
function questionToJson(root) {
  const copy = (0, exports.deepCopy)(root);
  traverseToJson(copy);
  return copy;
}
exports.questionToJson = questionToJson;
const deepCopy = (target) => {
  if (target === null) {
    return target;
  }
  if (target instanceof Date) {
    return new Date(target.getTime());
  }
  if (target instanceof Array) {
    const cp = [];
    target.forEach((v) => {
      cp.push(v);
    });
    return cp.map((n) => (0, exports.deepCopy)(n));
  }
  if (typeof target === "object" && target !== {}) {
    const cp = Object.assign({}, target);
    Object.keys(cp).forEach((k) => {
      cp[k] = (0, exports.deepCopy)(cp[k]);
    });
    return cp;
  }
  return target;
};
exports.deepCopy = deepCopy;
function reset() {
  exports.GlobalFuncId = 0;
  exports.GlobalFuncMap.clear();
}
exports.reset = reset;
//# sourceMappingURL=adapter.js.map
