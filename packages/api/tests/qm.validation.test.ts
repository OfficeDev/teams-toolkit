// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  FileValidation,
  Func,
  FxError,
  LocalFuncValidation,
  NumberValidation,
  ok,
  Platform,
  Inputs,
  RemoteFuncValidation,
  Result,
  StringArrayValidation,
  StringValidation,
  UserInputs
} from "../src/index";
import * as chai from "chai";
import { RemoteFuncExecutor, validate } from "../src/qm/validation";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";

/**
 * cmd: mocha -r ts-node/register --no-timeout tests/qm.validation.test.ts
 */

const mockRemoteFuncExecutor:RemoteFuncExecutor = async function (func:Func, answers: Inputs) : Promise<Result<string|undefined, FxError>>
{
  if(func.method === "mockValidator"){
    const input = func.params as string;
    if(input.length > 5) return ok("input too long");
    else return ok(undefined);
  }
  return ok(undefined);
};


describe("Question Model - Validation Test", () => {
  describe("StringValidation", () => {
    it("equals", async () => {
      const validation: StringValidation = { equals: "123" };
      const value1 = "123";
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 === undefined);
      const value2 = "1234";
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 !== undefined);
      const value3 = "";
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 !== undefined);
    });

    it("minLength,maxLength", async () => {
      const validation: StringValidation = { minLength: 2, maxLength: 5 };
      const value1 = "a";
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 !== undefined);
      const value2 = "aa";
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 === undefined);
      const value3 = "aaaa";
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 === undefined);
      const value4 = "aaaaaa";
      const res4 = await validate(validation, value4);
      chai.assert.isTrue(res4 !== undefined);
    });

    it("enum", async () => {
      const validation: StringValidation = { enum: ["1", "2", "3"] };
      const value1 = "1";
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 === undefined);
      const value2 = "3";
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 === undefined);
      const value3 = "4";
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 !== undefined);
    });

    it("pattern", async () => {
      const validation: StringValidation = { pattern: "^[0-9a-z]+$" };
      const value1 = "1";
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 === undefined);
      const value2 = "asb13";
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 === undefined);
      const value3 = "as--123";
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 !== undefined);
    });

    it("startsWith", async () => {
      const validation: StringValidation = { startsWith: "123" };
      const value1 = "123";
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 === undefined);
      const value2 = "234";
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 !== undefined);
      const value3 = "1234";
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 === undefined);
    });

    it("endsWith", async () => {
      const validation: StringValidation = { endsWith: "123" };
      const value1 = "123";
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 === undefined);
      const value2 = "234";
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 !== undefined);
      const value3 = "345sdf123";
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 === undefined);
    });

    it("startsWith,endsWith", async () => {
      const validation: StringValidation = { startsWith: "123", endsWith: "789" };
      const value1 = "123";
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 !== undefined);
      const value2 = "123asfsdwer7892345789";
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 === undefined);
      const value3 = "sadfws789";
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 !== undefined);
    });

    it("includes", async () => {
      const validation: StringValidation = { includes: "123" };
      const value1 = "123";
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 === undefined);
      const value2 = "123asfsdwer7892345789";
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 === undefined);
      const value3 = "sadfws789";
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 !== undefined);
    });

    it("includes,startsWith,endsWith", async () => {
      const validation: StringValidation = { startsWith: "123", endsWith: "789", includes: "abc" };
      const value1 = "123";
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 !== undefined);
      const value2 = "123asfabcer7892345789";
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 === undefined);
      const value3 = "123sadfws789";
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 !== undefined);
      const value4 = "abc789";
      const res4 = await validate(validation, value4);
      chai.assert.isTrue(res4 !== undefined);
    });

    it("includes,startsWith,endsWith,maxLength", async () => {
      const validation: StringValidation = {
        startsWith: "123",
        endsWith: "789",
        includes: "abc",
        maxLength: 10
      };
      const value1 = "123";
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 !== undefined);
      const value2 = "123asfabcer7892345789";
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 !== undefined);
      const value3 = "123sadfws789";
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 !== undefined);
      const value4 = "123abch789";
      const res4 = await validate(validation, value4);
      chai.assert.isTrue(res4 === undefined);
    });
  });
  describe("NumberValidation", () => {
    it("maximum,minimum", async () => {
      const validation: NumberValidation = { maximum: 10, minimum: 5 };
      const value1 = "4";
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 !== undefined);
      const value2 = "8";
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 === undefined);
      const value3 = "10";
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 === undefined);
      const value4 = "100";
      const res4 = await validate(validation, value4);
      chai.assert.isTrue(res4 !== undefined);
    });

    it("exclusiveMaximum,exclusiveMinimumm", async () => {
      const validation: NumberValidation = { exclusiveMaximum: 10, exclusiveMinimum: 5 };
      const value1 = "5";
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 !== undefined);
      const value2 = "10";
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 !== undefined);
      const value3 = "11";
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 !== undefined);
      const value4 = "8";
      const res4 = await validate(validation, value4);
      chai.assert.isTrue(res4 === undefined);
    });

    it("multipleOf", async () => {
      const validation: NumberValidation = { multipleOf: 10 };
      const value1 = "50";
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 === undefined);
      const value2 = "10";
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 === undefined);
      const value3 = "11";
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 !== undefined);
      const value4 = "8";
      const res4 = await validate(validation, value4);
      chai.assert.isTrue(res4 !== undefined);
    });

    it("enum", async () => {
      const validation: NumberValidation = { enum: [1, 3, 5, 7] };
      const value1 = "1";
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 === undefined);
      const value2 = "3";
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 === undefined);
      const value3 = "2";
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 !== undefined);
      const value4 = "8";
      const res4 = await validate(validation, value4);
      chai.assert.isTrue(res4 !== undefined);
    });

    it("equals", async () => {
      const validation: NumberValidation = { equals: 2 };
      const value1 = "-2";
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 !== undefined);
      const value2 = "3";
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 !== undefined);
      const value3 = "2";
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 === undefined);
      const value4 = "8";
      const res4 = await validate(validation, value4);
      chai.assert.isTrue(res4 !== undefined);
    });
  });

  describe("StringArrayValidation", () => {
    it("maxItems,minItems", async () => {
      const validation: StringArrayValidation = { maxItems: 3, minItems: 1 };
      const value1 = ["1", "2", "3"];
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 === undefined);
      const value2 = ["1", "2", "3", "4"];
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 !== undefined);
      const value3 = ["1", "2"];
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 === undefined);
      const value4: string[] = [];
      const res4 = await validate(validation, value4);
      chai.assert.isTrue(res4 !== undefined);
    });

    it("uniqueItems", async () => {
      const validation: StringArrayValidation = { uniqueItems: true };
      const value1 = ["1", "2", "3"];
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 === undefined);
      const value2 = ["1", "2", "1", "2"];
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 !== undefined);
      const value3 = ["1", "2"];
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 === undefined);
      const value4: string[] = [];
      const res4 = await validate(validation, value4);
      chai.assert.isTrue(res4 === undefined);
    });

    it("equals", async () => {
      const validation: StringArrayValidation = { equals: ["1", "2", "3"] };
      const value1 = ["1", "2", "3"];
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 === undefined);
      const value2 = ["1", "2", "1", "2"];
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 !== undefined);
      const value3 = ["1", "2"];
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 !== undefined);
      const value4: string[] = [];
      const res4 = await validate(validation, value4);
      chai.assert.isTrue(res4 !== undefined);
    });

    it("enum", async () => {
      const validation: StringArrayValidation = { enum: ["1", "2", "3"] };
      const value1 = ["1", "2", "3"];
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 === undefined);
      const value2 = ["1", "2", "4", "2"];
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 !== undefined);
      const value3 = ["1", "2"];
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 === undefined);
      const value4: string[] = [];
      const res4 = await validate(validation, value4);
      chai.assert.isTrue(res4 === undefined);
    });

    it("contains", async () => {
      const validation: StringArrayValidation = { contains: "4" };
      const value1 = ["1", "2", "3"];
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 !== undefined);
      const value2 = ["1", "2", "4", "2"];
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 === undefined);
      const value3 = ["1", "2"];
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 !== undefined);
      const value4: string[] = [];
      const res4 = await validate(validation, value4);
      chai.assert.isTrue(res4 !== undefined);
    });

    it("containsAll", async () => {
      const validation: StringArrayValidation = { containsAll: ["1", "2"] };
      const value1 = ["1", "2", "3"];
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 === undefined);
      const value2 = ["1", "2", "4", "2"];
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 === undefined);
      const value3 = ["1", "3"];
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 !== undefined);
      const value4: string[] = [];
      const res4 = await validate(validation, value4);
      chai.assert.isTrue(res4 !== undefined);
    });

    it("containsAny", async () => {
      const validation: StringArrayValidation = { containsAny: ["1", "2"] };
      const value1 = ["1", "2", "3"];
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 === undefined);
      const value2 = ["4", "5", "6", "1"];
      const res2 = await validate(validation, value2);
      chai.assert.isTrue(res2 === undefined);
      const value3 = ["5", "7"];
      const res3 = await validate(validation, value3);
      chai.assert.isTrue(res3 !== undefined);
      const value4: string[] = [];
      const res4 = await validate(validation, value4);
      chai.assert.isTrue(res4 !== undefined);
    });
  });

  
   
  it("LocalFuncValidation", async () => {
    const validation: LocalFuncValidation = {
      validFunc: function(input: string): string | undefined | Promise<string | undefined> {
        if (input.length > 5) return "length > 5";
        return undefined;
      }
    };
    const value1 = "123456";
    const res1 = await validate(validation, value1);
    chai.assert.isTrue(res1 !== undefined);
    const value2 = "12345";
    const res2 = await validate(validation, value2);
    chai.assert.isTrue(res2 === undefined);
    const value3 = "";
    const res3 = await validate(validation, value3);
    chai.assert.isTrue(res3 === undefined);
  });
  describe("FileValidation", () => {
    it("exists", async () => {
      const validation: FileValidation = {
        exists: true
      };
      const folder = os.tmpdir();
      const value1 = folder;
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 === undefined);
      const filePath = path.resolve(folder, `${new Date().getTime()}.txt`);
      await fs.ensureFile(filePath);
      const res2 = await validate(validation, filePath);
      chai.assert.isTrue( res2 === undefined);
      await fs.remove(filePath);
      const res3 = await validate(validation, filePath);
      chai.assert.isTrue( res3 !== undefined);
    });

    it("notExist", async () => {
      const validation: FileValidation = {
        notExist: true
      };
      const folder = os.tmpdir();
      const value1 = folder;
      const res1 = await validate(validation, value1);
      chai.assert.isTrue(res1 !== undefined);
      const filePath = path.resolve(folder, `${new Date().getTime()}.txt`);
      await fs.ensureFile(filePath);
      const res2 = await validate(validation, filePath);
      chai.assert.isTrue( res2 !== undefined);
      await fs.remove(filePath);
      const res3 = await validate(validation, filePath);
      chai.assert.isTrue( res3 === undefined);
    });
  });

  it("RemoteFuncValidation", async () => {
    const validation:RemoteFuncValidation = {
      namespace : "",
      method : "mockValidator"
    };
    const answers:UserInputs = {platform:Platform.VSCode};
    answers["app-name"] = "myapp";
    const value1 = "1234888888888888888856";
    const res1 = await validate(validation, value1, mockRemoteFuncExecutor, answers);
    chai.assert.isTrue(res1 === "input too long");
    const value2 = "1234";
    const res2 = await validate(validation, value2, mockRemoteFuncExecutor, answers);
    chai.assert.isTrue(res2 === undefined);
  });
});
