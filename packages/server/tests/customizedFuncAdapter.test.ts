// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import { assert, expect } from "chai";
import { callFunc, getFunc, setFunc, reset } from "../src/customizedFuncAdapter";
import {
  LocalFunc,
  ok,
  err,
  OnSelectionChangeFunc,
  ValidateFunc,
  SystemError,
} from "@microsoft/teamsfx-api";
import { assembleError } from "@microsoft/teamsfx-core";
let FuncId = 0;

const func = () => {
  return "test";
};

describe("customizedFuncAdapter", () => {
  it("setFunc", () => {
    const res = setFunc(func as LocalFunc<any>);
    assert.equal(res, ++FuncId);
  });

  it("getFunc", () => {
    const res = getFunc(FuncId);
    assert.equal(res, func);
  });

  it("reset", () => {
    reset();
    FuncId = 0;
  });

  describe("callFunc", () => {
    it("case 1: LocalFunc", () => {
      const func = (p: string) => {
        return p;
      };
      const id = setFunc(func);
      const res = callFunc("LocalFunc", id, "test func");
      res.then((data) => {
        expect(data).to.equal(ok("test func1"));
      });
    });

    it("case 2: ValidateFunc", () => {
      const func = (p1: string, p2: string) => {
        return p1 + p2;
      };
      const id = setFunc(func as unknown as ValidateFunc<any>);
      const res = callFunc("ValidateFunc", id, "param 1", "param 2");
      res.then((data) => {
        expect(data).to.equal(ok("param 1" + "param 2"));
      });
    });

    it("case 3: OnSelectionChangeFunc", () => {
      const func = (p1: Set<string>, p2: Set<string>) => {
        const s = new Set<string>();
        p1.forEach((a) => s.add(a));
        p2.forEach((a) => s.add(a));
        return s;
      };
      const s1 = new Set<string>("s1");
      const s2 = new Set<string>("s2");
      const id = setFunc(func as unknown as OnSelectionChangeFunc);
      const res = callFunc("OnSelectionChangeFunc", id, s1, s2);
      res.then((data) => {
        expect(data).to.equal(ok(func(s1, s2)));
      });
    });

    it("case 4: error id", () => {
      const id = -1;
      const res = callFunc("LocalFunc", id);
      res.then((data) => {
        expect(data).to.equal(
          err(new SystemError("FxCoreServer", "FuncNotFound", `Function not found, id: ${id}`))
        );
      });
    });

    it("case 5: exception", () => {
      const e = new Error("test");
      const func = () => {
        throw e;
      };
      const id = setFunc(func);
      const res = callFunc("LocalFunc", id);
      reset();
      res.then((data) => {
        expect(data).to.equal(err(assembleError(e)));
      });
    });
  });
});
