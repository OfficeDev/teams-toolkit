// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Json } from "@microsoft/teamsfx-api";
import { ProjectSettings } from "@microsoft/teamsfx-api/build/types";
import { assert, expect } from "chai";
import * as dotenv from "dotenv";
import "mocha";
import { isValidProject, validateProjectSettings } from "../../src/common/projectSettingsHelper";
import {
  convertDotenvToEmbeddedJson,
  redactObject,
  replaceTemplateWithUserData,
} from "../../src/common/tools";
import { newEnvInfo } from "../../src/core/environment";
describe("tools", () => {
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

  it("validateProjectSettings()", () => {
    const projectSettings: ProjectSettings = {
      appName: "my app",
      projectId: "123234",
      solutionSettings: {
        name: "test",
        version: "3.0.0",
        capabilities: ["Tab"],
        hostType: "Azure",
        azureResources: [],
        activeResourcePlugins: [],
      },
    };
    expect(validateProjectSettings(projectSettings)).is.undefined;
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

  it("replaceTemplateWithUserData", () => {
    const str =
      "solution.teamsAppTenantId=abcdesdfs234fg" +
      "\nsolution.provisionSuccess=true" +
      "\nfx-resource-aad-app-for-teams.clientSecret=sdfsfsdfwerwer" +
      "\nfx-resource-bot.botPassword=sdfsd23wfw324sfd";
    const userDateExpected = {
      "solution.teamsAppTenantId": "abcdesdfs234fg",
      "solution.provisionSuccess": "true",
      "fx-resource-aad-app-for-teams.clientSecret": "sdfsfsdfwerwer",
      "fx-resource-bot.botPassword": "sdfsd23wfw324sfd",
    };
    const expectedResult: Json = {
      solution: {
        teamsAppTenantId: "abcdesdfs234fg",
        provisionSuccess: "true",
      },
      "fx-resource-bot": {
        botPassword: "sdfsd23wfw324sfd",
      },
      "fx-resource-aad-app-for-teams": {
        clientSecret: "sdfsfsdfwerwer",
      },
    };
    const template =
      '{"solution": {"teamsAppTenantId": "{{solution.teamsAppTenantId}}", "provisionSuccess":"{{solution.provisionSuccess}}"},' +
      '"fx-resource-bot": {"botPassword": "{{fx-resource-bot.botPassword}}"},"fx-resource-aad-app-for-teams": {"clientSecret": "{{fx-resource-aad-app-for-teams.clientSecret}}"}}';
    const userData = dotenv.parse(str);
    assert.deepEqual(userData, userDateExpected);
    const view = convertDotenvToEmbeddedJson(userData);
    assert.deepEqual(view, expectedResult);
    const result = replaceTemplateWithUserData(template, userData);
    const actual = JSON.parse(result);
    assert.deepEqual(actual, expectedResult);
  });
});
