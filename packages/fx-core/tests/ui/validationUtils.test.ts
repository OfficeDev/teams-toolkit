// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Inputs, Platform, QTreeNode } from "@microsoft/teamsfx-api";
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
        { platform: Platform.VSCode, name: ["a"] }
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
        { platform: Platform.VSCode, name: ["d"] }
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
        { platform: Platform.VSCode, name: "a" }
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
        { platform: Platform.VSCode, name: "d" }
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
        { platform: Platform.VSCode, name: "d" }
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
        { platform: Platform.VSCode, name: "a" }
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
        { platform: Platform.VSCode, name: { id: "c", label: "c" } }
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
        { platform: Platform.VSCode, name: { id: "a", label: "a" } }
      );
      assert.isDefined(res);
    });
  });

  describe("validateManualInputs", () => {
    it("should return undefined for multiSelect", async () => {
      const res = await validationUtils.validateManualInputs(
        {
          type: "multiSelect",
          name: "name",
          staticOptions: [],
          dynamicOptions: (inputs: Inputs) => ["a", "b", "c"],
          title: "title",
        },
        { platform: Platform.VSCode, name: ["a"] }
      );
      assert.isUndefined(res);
    });
    it("should return error string for multiSelect", async () => {
      const res = await validationUtils.validateManualInputs(
        {
          type: "multiSelect",
          name: "name",
          staticOptions: [],
          dynamicOptions: (inputs: Inputs) => ["a", "b", "c"],
          title: "title",
        },
        { platform: Platform.VSCode, name: ["d"] }
      );
      assert.isDefined(res);
    });
    it("should return undefined for singleSelect", async () => {
      const res = await validationUtils.validateManualInputs(
        {
          type: "singleSelect",
          name: "name",
          staticOptions: [],
          dynamicOptions: (inputs: Inputs) => ["a", "b", "c"],
          title: "title",
        },
        { platform: Platform.VSCode, name: "a" }
      );
      assert.isUndefined(res);
    });
    it("should return error string for singleSelect", async () => {
      const res = await validationUtils.validateManualInputs(
        {
          type: "singleSelect",
          name: "name",
          staticOptions: [],
          dynamicOptions: (inputs: Inputs) => ["a", "b", "c"],
          title: "title",
        },
        { platform: Platform.VSCode, name: "d" }
      );
      assert.isDefined(res);
    });
    it("should return error string for textInput", async () => {
      const res = await validationUtils.validateManualInputs(
        {
          type: "text",
          name: "name",
          validation: { pattern: "^[a-z]+$" },
          title: "title",
        },
        { platform: Platform.VSCode, name: "123" }
      );
      assert.isDefined(res);
    });
    it("should return undefined for textInput", async () => {
      const res = await validationUtils.validateManualInputs(
        {
          type: "text",
          name: "name",
          validation: { pattern: "^[a-z]+$" },
          title: "title",
        },
        { platform: Platform.VSCode, name: "abc" }
      );
      assert.isUndefined(res);
    });
  });
});
