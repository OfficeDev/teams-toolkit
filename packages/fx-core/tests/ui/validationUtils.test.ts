// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, Platform } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import sinon from "sinon";
import { validationUtils } from "../../src/ui/validationUtils";

describe("ValidationUtils", () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  describe("validateInputForMultipleSelectQuestion", () => {
    it("should return undefined", async () => {
      const res = await validationUtils.validateInputForMultipleSelectQuestion(
        {
          type: "multiSelect",
          name: "name",
          staticOptions: [],
          dynamicOptions: (inputs: Inputs) => ["a", "b", "c"],
          title: "title",
        },
        ["a"],
        { platform: Platform.VSCode }
      );
      assert.isUndefined(res);
    });
    it("should return error string", async () => {
      const res = await validationUtils.validateInputForMultipleSelectQuestion(
        {
          type: "multiSelect",
          name: "name",
          staticOptions: [],
          dynamicOptions: (inputs: Inputs) => ["a", "b", "c"],
          title: "title",
        },
        ["d"],
        { platform: Platform.VSCode }
      );
      assert.isDefined(res);
    });
  });
  describe("validateInputForSingleSelectQuestion", () => {
    it("should return undefined", async () => {
      const res = await validationUtils.validateInputForSingleSelectQuestion(
        {
          type: "singleSelect",
          name: "name",
          staticOptions: [],
          dynamicOptions: (inputs: Inputs) => ["a", "b", "c"],
          title: "title",
        },
        "a",
        { platform: Platform.VSCode }
      );
      assert.isUndefined(res);
    });
    it("should return error string", async () => {
      const res = await validationUtils.validateInputForSingleSelectQuestion(
        {
          type: "singleSelect",
          name: "name",
          staticOptions: [],
          dynamicOptions: (inputs: Inputs) => ["a", "b", "c"],
          title: "title",
        },
        "d",
        { platform: Platform.VSCode }
      );
      assert.isDefined(res);
    });

    it("should return error string when invalid question definition", async () => {
      const res = await validationUtils.validateInputForSingleSelectQuestion(
        {
          type: "singleSelect",
          name: "name",
          staticOptions: [],
          dynamicOptions: (inputs: Inputs) => ["a", "b", "c"],
          title: "title",
          returnObject: true,
        },
        "d",
        { platform: Platform.VSCode }
      );
      assert.isDefined(res);
    });

    it("should return error string when input is string and object is expected", async () => {
      const res = await validationUtils.validateInputForSingleSelectQuestion(
        {
          type: "singleSelect",
          name: "name",
          staticOptions: [],
          dynamicOptions: (inputs: Inputs) => [
            { id: "a", label: "a" },
            { id: "b", label: "b" },
          ],
          title: "title",
          returnObject: true,
        },
        "a",
        { platform: Platform.VSCode }
      );
      assert.isDefined(res);
    });

    it("should return error string when input is not in the allowed list", async () => {
      const res = await validationUtils.validateInputForSingleSelectQuestion(
        {
          type: "singleSelect",
          name: "name",
          staticOptions: [],
          dynamicOptions: (inputs: Inputs) => [
            { id: "a", label: "a" },
            { id: "b", label: "b" },
          ],
          title: "title",
          returnObject: true,
        },
        { id: "c", label: "c" },
        { platform: Platform.VSCode }
      );
      assert.isDefined(res);
    });

    it("should return error string when option list is empty array", async () => {
      const res = await validationUtils.validateInputForSingleSelectQuestion(
        {
          type: "singleSelect",
          name: "name",
          staticOptions: [],
          dynamicOptions: (inputs: Inputs) => [],
          title: "title",
          returnObject: true,
        },
        { id: "a", label: "a" },
        { platform: Platform.VSCode }
      );
      assert.isDefined(res);
    });
  });

  describe("validateInputs", () => {
    it("should return undefined for multiSelect", async () => {
      const res = await validationUtils.validateInputs(
        {
          type: "multiSelect",
          name: "name",
          staticOptions: [],
          dynamicOptions: (inputs: Inputs) => ["a", "b", "c"],
          title: "title",
        },
        ["a"],
        { platform: Platform.VSCode }
      );
      assert.isUndefined(res);
    });
    it("should return error string for multiSelect", async () => {
      const res = await validationUtils.validateInputs(
        {
          type: "multiSelect",
          name: "name",
          staticOptions: [],
          dynamicOptions: (inputs: Inputs) => ["a", "b", "c"],
          title: "title",
        },
        ["d"],
        { platform: Platform.VSCode }
      );
      assert.isDefined(res);
    });
    it("should return undefined for singleSelect", async () => {
      const res = await validationUtils.validateInputs(
        {
          type: "singleSelect",
          name: "name",
          staticOptions: [],
          dynamicOptions: (inputs: Inputs) => ["a", "b", "c"],
          title: "title",
        },
        "a",
        { platform: Platform.VSCode }
      );
      assert.isUndefined(res);
    });
    it("should return error string for singleSelect", async () => {
      const res = await validationUtils.validateInputs(
        {
          type: "singleSelect",
          name: "name",
          staticOptions: [],
          dynamicOptions: (inputs: Inputs) => ["a", "b", "c"],
          title: "title",
        },
        "d",
        { platform: Platform.VSCode }
      );
      assert.isDefined(res);
    });
    it("should return error string for textInput", async () => {
      const res = await validationUtils.validateInputs(
        {
          type: "text",
          name: "name",
          validation: { pattern: "^[a-z]+$" },
          title: "title",
        },
        "123",
        { platform: Platform.VSCode }
      );
      assert.isDefined(res);
    });
    it("should return undefined for textInput", async () => {
      const res = await validationUtils.validateInputs(
        {
          type: "text",
          name: "name",
          validation: { pattern: "^[a-z]+$" },
          title: "title",
        },
        "abc",
        { platform: Platform.VSCode }
      );
      assert.isUndefined(res);
    });
    it("should return error for textInput with additional validation", async () => {
      const res = await validationUtils.validateInputs(
        {
          type: "text",
          name: "name",
          validation: { pattern: "^[a-z]+$" },
          title: "title",
          additionalValidationOnAccept: { pattern: "^[a]+$" },
        },
        "abc",
        { platform: Platform.VSCode }
      );
      assert.isDefined(res);
    });
    it("should return undefined for textInput with additional validation", async () => {
      const res = await validationUtils.validateInputs(
        {
          type: "text",
          name: "name",
          validation: { pattern: "^[a-z]+$" },
          title: "title",
          additionalValidationOnAccept: { pattern: "^[a-z]+$" },
        },
        "abc",
        { platform: Platform.VSCode }
      );
      assert.isUndefined(res);
    });
  });
});
