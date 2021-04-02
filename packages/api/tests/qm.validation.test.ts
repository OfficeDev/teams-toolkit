// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  ConfigMap,
  Core,
  Environment,
  err,
  FileValidation,
  Func,
  FunctionRouter,
  FuncValidation,
  FxError,
  LocalFuncValidation,
  NumberValidation,
  ok,
  QTreeNode,
  ReadonlyConfigMap,
  Result,
  StringArrayValidation,
  StringValidation,
  Task,
  ToolsProvider,
  UserError,
  Void
} from "../src/index";
import * as chai from "chai";
import { validate } from "../src/utils/validation";
import * as fs from "fs-extra";
import * as os from "os";

/**
 * cmd: mocha -r ts-node/register --no-timeout tests/qm.validation.test.ts
 */

class MockCore implements Core{
  async init(globalConfig: ReadonlyConfigMap, tools: ToolsProvider) : Promise<Result<Void, FxError>> {return err(new UserError("NotSupportError", "NotSupportError", "UnitTest"));}
  async create(userAnswers: ReadonlyConfigMap)  : Promise<Result<string, FxError>>{return err(new UserError("NotSupportError", "NotSupportError", "UnitTest"));}
  async provision(userAnswers: ReadonlyConfigMap) : Promise<Result<Void, FxError>>{return err(new UserError("NotSupportError", "NotSupportError", "UnitTest"));}
  async build (userAnswers: ReadonlyConfigMap) : Promise<Result<Void, FxError>>{return err(new UserError("NotSupportError", "NotSupportError", "UnitTest"));}
  async deploy (userAnswers: ReadonlyConfigMap) : Promise<Result<Void, FxError>>{return err(new UserError("NotSupportError", "NotSupportError", "UnitTest"));}
  async publish(userAnswers: ReadonlyConfigMap) : Promise<Result<Void, FxError>>{return err(new UserError("NotSupportError", "NotSupportError", "UnitTest"));}
  async createEnv(env: Environment) : Promise<Result<Void, FxError>>{return err(new UserError("NotSupportError", "NotSupportError", "UnitTest"));}
  async removeEnv(env: string) : Promise<Result<Void, FxError>>{return err(new UserError("NotSupportError", "NotSupportError", "UnitTest"));}
  async switchEnv(env: string) : Promise<Result<Void, FxError>>{return err(new UserError("NotSupportError", "NotSupportError", "UnitTest"));}
  async listEnvs() : Promise<Result<Environment[], FxError>>{return err(new UserError("NotSupportError", "NotSupportError", "UnitTest"));}
  async getQuestionsForLifecycleTask (task:Task, getQuestionConfig: ReadonlyConfigMap) : Promise<Result<QTreeNode | undefined, FxError>>{return err(new UserError("NotSupportError", "NotSupportError", "UnitTest"));}
  async getQuestionsForUserTask(router:FunctionRouter, getQuestionConfig: ReadonlyConfigMap) : Promise<Result<QTreeNode | undefined, FxError>>{return err(new UserError("NotSupportError", "NotSupportError", "UnitTest"));}
  async executeUserTask(func:Func, userTaskAnswers: ReadonlyConfigMap) : Promise<Result<unknown, FxError>>{return err(new UserError("NotSupportError", "NotSupportError", "UnitTest"));}
  async executeFuncQuestion(func:Func, answersOfPreviousQuestions: ReadonlyConfigMap) : Promise<Result<unknown, FxError>>
  {
    const input = func.params as string;
    if(input.length > 5) return ok("input too long");
    return ok(undefined);
  }
}


describe("Validation Test", () => {
   
  it("StringValidation.equals", async () => {
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

  it("StringValidation.minLength,maxLength", async () => {
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

  it("StringValidation.enum", async () => {
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

  it("StringValidation.pattern", async () => {
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

  it("StringValidation.startsWith", async () => {
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

  it("StringValidation.endsWith", async () => {
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

  it("StringValidation.startsWith,endsWith", async () => {
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

  it("StringValidation.includes", async () => {
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

  it("StringValidation.includes,startsWith,endsWith", async () => {
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
  it("StringValidation.includes,startsWith,endsWith,maxLength", async () => {
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

  it("NumberValidation.maximum,minimum", async () => {
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

  it("NumberValidation.exclusiveMaximum,exclusiveMinimumm", async () => {
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

  it("NumberValidation.multipleOf", async () => {
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

  it("NumberValidation.enum", async () => {
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

  it("NumberValidation.equals", async () => {
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

  it("StringArrayValidation.maxItems,minItems", async () => {
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

  it("StringArrayValidation.uniqueItems", async () => {
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

  it("StringArrayValidation.equals", async () => {
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

  it("StringArrayValidation.enum", async () => {
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

  it("StringArrayValidation.contains", async () => {
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

  it("StringArrayValidation.containsAll", async () => {
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

  it("StringArrayValidation.containsAny", async () => {
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

  it("FileValidation.exists", async () => {
    const validation: FileValidation = {
      exists: true
    };
    const folder = os.tmpdir();
    const value1 = folder;
    const res1 = await validate(validation, value1);
    chai.assert.isTrue(res1 === undefined);
    const value2 = folder + "/hahaha";
    const res2 = await validate(validation, value2);
    chai.assert.isTrue(fs.existsSync(value2) ? res2 === undefined : res2 !== undefined);
  });

  it("FileValidation.notExist", async () => {
    const validation: FileValidation = {
      notExist: true
    };
    const folder = os.tmpdir();
    const value1 = folder;
    const res1 = await validate(validation, value1);
    chai.assert.isTrue(res1 !== undefined);
    const value2 = folder + "/hahaha";
    const res2 = await validate(validation, value2);
    chai.assert.isTrue(!fs.existsSync(value2) ? res2 === undefined : res2 !== undefined);
  });

  it("FuncValidation", async () => {
    const core:Core = new MockCore();
    const validation:FuncValidation = {
      namespace : "",
      method : "validateTest"
    };
    const answers = new ConfigMap();
    answers.set("app-name", "myapp");
    const value1 = "1234888888888888888856";
    const res1 = await validate(validation, value1, core, answers);
    chai.assert.isTrue(res1 === "input too long");
  });
});
