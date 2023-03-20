// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yefuwang@microsoft.com
 */

import chai from "chai";
import path from "path";
import { describe, it } from "mocha";
import sinon from "sinon";
import { YamlParser } from "../../../src/component/configManager/parser";
import { LifecycleNames } from "../../../src/component/configManager/interface";
import fs from "fs-extra";

const assert = chai.assert;

describe("v3 yaml parser", () => {
  describe("when parsing an invalid path", () => {
    const sandbox = sinon.createSandbox();
    before(() => {
      sandbox.stub(fs, "readFile").rejects(new Error("file not found"));
    });

    afterEach(() => {
      sandbox.restore();
    });
    it("should return InvalidYamlSchemaError", async () => {
      const parser = new YamlParser();
      const result = await parser.parse("");
      assert(result.isErr() && result.error.name === "InvalidYamlSchemaError");
    });
  });

  describe("when parsing an empty file", () => {
    const sandbox = sinon.createSandbox();
    before(async () => {
      sandbox.stub<any, any>(fs, "readFile").resolves("");
    });

    after(() => {
      sandbox.restore();
    });

    it("should return InvalidYamlSchemaError", async () => {
      const parser = new YamlParser();
      const result = await parser.parse("");
      assert(result.isErr() && result.error.name === "InvalidYamlSchemaError");
    });
  });

  describe("when parsing a file containing only array", () => {
    it("should return InvalidYamlSchemaError", async () => {
      const parser = new YamlParser();
      const yamlPath = path.resolve(__dirname, "testing_data", "array.yml");
      const result = await parser.parse(yamlPath);
      assert(result.isErr() && result.error.name === "InvalidYamlSchemaError");
    });
  });

  describe("when parsing a file with lifecycle content not being array", () => {
    it("should return YamlFieldTypeError", async () => {
      const parser = new YamlParser();
      const result = await parser.parse(
        path.resolve(__dirname, "testing_data", "invalid_lifecycle_content.yml")
      );
      assert(result.isErr() && result.error.name === "YamlFieldTypeError");
    });
  });

  describe(`when parsing a file with lifecycle content with invalid "uses" and "with"`, () => {
    it("should return YamlFieldMissingError without 'with'", async () => {
      const parser = new YamlParser();
      const result = await parser.parse(
        path.resolve(__dirname, "testing_data", "invalid_lifecycle_without_with.yml")
      );
      assert(result.isErr() && result.error.name === "YamlFieldMissingError");
    });
    it("should return YamlFieldMissingError without 'uses'", async () => {
      const parser = new YamlParser();
      const result = await parser.parse(
        path.resolve(__dirname, "testing_data", "invalid_lifecycle_without_uses.yml")
      );
      assert(result.isErr() && result.error.name === "YamlFieldMissingError");
    });
    it("should return YamlFieldTypeError with wrong 'uses' type", async () => {
      const parser = new YamlParser();
      const result = await parser.parse(
        path.resolve(__dirname, "testing_data", "invalid_lifecycle_with_wrong_uses_type.yml")
      );
      assert(result.isErr() && result.error.name === "YamlFieldTypeError");
    });
    it("should return YamlFieldTypeError with wrong 'with' type", async () => {
      const parser = new YamlParser();
      const result = await parser.parse(
        path.resolve(__dirname, "testing_data", "invalid_lifecycle_with_wrong_with_type.yml")
      );
      assert(result.isErr() && result.error.name === "YamlFieldTypeError");
    });
  });

  describe(`when parsing a file with right schema, but unknown drivers`, () => {
    // because driver resolution happens when the driver actually runs.
    it("should return ok", async () => {
      const parser = new YamlParser();
      const result = await parser.parse(
        path.resolve(__dirname, "testing_data", "valid_with_unknown_driver.yml")
      );
      assert(result.isOk());
    });
  });

  describe(`when parsing real app.yml`, () => {
    // because driver resolution happens when the driver actually runs.
    it("should return ok", async () => {
      const parser = new YamlParser();
      const result = await parser.parse(path.resolve(__dirname, "testing_data", "app.yml"));
      assert(result.isOk());
      if (result.isOk()) {
        const model = result.value;
        for (const lifecycle of LifecycleNames) {
          chai.expect(model[lifecycle]).is.not.undefined;
        }
      }
    });
  });

  describe(`when parsing yml with invalid env field`, () => {
    it("should return error if env field is of type string", async () => {
      const parser = new YamlParser();
      const result = await parser.parse(
        path.resolve(__dirname, "testing_data", "invalid_env_field_string.yml")
      );
      assert(result.isErr() && result.error.name === "YamlFieldTypeError");
    });
    it("should return error if env field value has wrong type", async () => {
      const parser = new YamlParser();
      const result = await parser.parse(
        path.resolve(__dirname, "testing_data", "invalid_env_subfield_type.yml")
      );
      assert(result.isErr() && result.error.name === "YamlFieldTypeError");
    });
    it("should return error if env field is of type array", async () => {
      const parser = new YamlParser();
      const result = await parser.parse(
        path.resolve(__dirname, "testing_data", "invalid_env_field_array.yml")
      );
      assert(result.isErr() && result.error.name === "YamlFieldTypeError");
    });
  });

  describe(`when parsing yml with valid env field`, async () => {
    it("should return ok", async () => {
      const parser = new YamlParser();
      const result = await parser.parse(
        path.resolve(__dirname, "testing_data", "valid_env_field.yml")
      );
      assert(result.isOk());
    });
  });

  describe(`when parsing yml with valid envrionmentFolderPath`, async () => {
    it("should return ok", async () => {
      const parser = new YamlParser();
      const result = await parser.parse(
        path.resolve(__dirname, "testing_data", "valid_env_folder_path.yml")
      );
      assert(result.isOk() && result.value.environmentFolderPath === "/home/xxx");
    });
  });

  describe(`when parsing yml with invalid `, async () => {
    it("should return ok", async () => {
      const parser = new YamlParser();
      const result = await parser.parse(
        path.resolve(__dirname, "testing_data", "invalid_env_folder_path.yml")
      );
      assert(result.isErr() && result.error.name === "YamlFieldTypeError");
    });
  });

  describe(`when parsing yml with valid writeToEnvironmentFile`, async () => {
    it("should return ok", async () => {
      const parser = new YamlParser();
      const result = await parser.parse(
        path.resolve(__dirname, "testing_data", "valid_write_to_environment_file.yml")
      );
      assert(
        result.isOk() &&
          result.value.provision &&
          result.value.provision.driverDefs[0].writeToEnvironmentFile &&
          result.value.provision.driverDefs[0].writeToEnvironmentFile["xxx"] === "YYY_XXX"
      );
    });
  });

  describe(`when parsing yml with invalid writeToEnvironmentFile`, async () => {
    it("should return YamlFieldTypeError", async () => {
      const parser = new YamlParser();
      let result = await parser.parse(
        path.resolve(__dirname, "testing_data", "invalid_write_to_environment_file_array.yml")
      );
      assert(result.isErr() && result.error.name === "YamlFieldTypeError");

      result = await parser.parse(
        path.resolve(__dirname, "testing_data", "invalid_write_to_environment_file_number.yml")
      );
      assert(result.isErr() && result.error.name === "YamlFieldTypeError");
    });
  });
});
