// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Json } from "@microsoft/teamsfx-api";
import { assert, expect } from "chai";
import "mocha";
import { redactObject } from "../../src";
import { flattenConfigJson, isValidProject, newEnvInfo } from "../../src/core/tools";

describe("tools", () => {
  // it("base64 encode", () => {
  //   const source = "Hello, World!";
  //   expect(base64Encode(source)).to.equal("SGVsbG8sIFdvcmxkIQ==");
  // });

  it("newEnvInfo should return valid object", () => {
    const result = newEnvInfo();
    expect(result).to.be.not.null;
    expect(result.envName).to.be.not.empty;
    expect(result.config).to.be.not.null;
    expect(result.state).to.be.not.null;
  });

  it("is not valid project", () => {
    expect(isValidProject()).is.false;
  });
});

describe("flattenConfigJson", () => {
  it("should flatten output and secrets fields", () => {
    const config: Json = { a: { output: { b: 1 }, secrets: { value: 9 } }, c: 2 };
    const expected: Json = { a: { b: 1, value: 9 }, c: 2 };
    const result = flattenConfigJson(config);
    assert.deepEqual(result, expected);
  });
});

describe("redactObject", () => {
  const testCases: [unknown, unknown, unknown][] = [
    // happy path: redact unknown key and all values
    [
      { name: "user content 1", userContent2: "user content 3" },
      { type: "object", properties: { name: { type: "string" } } },
      { name: null },
    ],
    // no known keys
    [
      { userContent2: "user content 3" },
      { type: "object", properties: { name: { type: "string" } } },
      {},
    ],
    // second level
    [
      {
        appName: { short: "short name", long: "long name", other: "other name" },
        userContent2: "user content 3",
      },
      {
        type: "object",
        properties: {
          appName: {
            type: "object",
            properties: { short: { type: "string" }, long: { type: "string" } },
          },
        },
      },
      { appName: { short: null, long: null } },
    ],
    // user specified a wrong type
    [
      { appName: "", userContent2: "user content 3" },
      { type: "object", properties: { appName: { type: "object" } } },
      { appName: null },
    ],
    // null input
    [null, { type: "object", properties: { appName: { type: "object" } } }, null],
    [{ name: "name" }, null, null],
    // invalid JSON schema, though not likely because these are checked compile time and not changed frequently
    [{ name: "name" }, { type: "unkown" }, null],
    [{ name: "name" }, { type: "object", properties: "invalid" }, null],
    [{ name: "name" }, { type: "object", properties: { name: "name" } }, { name: null }],
    [{ name: "name" }, { type: "object", properties: { name: {} } }, { name: null }],
  ];

  it("should redact objects", () => {
    // test that the function does not change input object
    Object.freeze(testCases);
    for (const [obj, schema, expectedResult] of testCases) {
      const actualResult = redactObject(obj, schema);
      expect(actualResult).to.deep.equal(expectedResult);
    }
  });

  it("should prevent stackoverflow", () => {
    const input = {};
    (input as any).a = input;
    const jsonSchema = {
      type: "object",
      properties: {},
    };
    (jsonSchema.properties as any).a = jsonSchema;
    const actualResult = redactObject(input, jsonSchema, 1);
    expect(actualResult).to.deep.equal({ a: null });
  });
});
