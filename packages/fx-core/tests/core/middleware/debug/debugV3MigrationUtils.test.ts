// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import fs from "fs-extra";
import * as chai from "chai";
import * as os from "os";
import * as sinon from "sinon";

import {
  generateLabel,
  updateLocalEnv,
} from "../../../../src/core/middleware/utils/debug/debugV3MigrationUtils";
import { mockMigrationContext } from "./utils";
import { MigrationContext } from "../../../../src/core/middleware/utils/migrationContext";

describe("debugV3MigrationUtils", () => {
  describe("generateLabel", () => {
    it("no plus", () => {
      const labels = ["label", "label 1", "label 2", "label 3"];
      const base = "base";
      const result = generateLabel(base, labels);
      chai.assert.equal(result, base);
    });

    it("plus 3", () => {
      const labels = ["label", "label 1", "label 2", "label 3"];
      const base = "label";
      const result = generateLabel(base, labels);
      chai.assert.equal(result, "label 4");
    });
  });

  describe("updateLocalEnv", () => {
    const projectPath = "projectPath";
    let localEnvContent = "";

    beforeEach(() => {
      sinon.stub(MigrationContext.prototype, "fsEnsureDir").callsFake(async () => {});
      sinon.stub(MigrationContext.prototype, "fsPathExists").returns(Promise.resolve(true));
      sinon.stub(fs, "readFile").returns(Promise.resolve(Buffer.from(localEnvContent)));
      sinon.stub(MigrationContext.prototype, "fsWriteFile").callsFake(async (file, data) => {
        localEnvContent = data;
      });
    });

    afterEach(() => {
      sinon.restore();
      localEnvContent = "";
    });

    it("empty envs", async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      const envs = {};
      const expected = "";
      await updateLocalEnv(migrationContext, envs);
      chai.assert.equal(localEnvContent, expected);
    });

    it("happy path: existing", async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      const envs = {
        key1: "value1",
        key2: "value2",
      };
      const expected = "key1=value1" + os.EOL + "key2=value2";
      await updateLocalEnv(migrationContext, envs);
      chai.assert.equal(localEnvContent, expected);
    });

    it("happy path: not existing", async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      localEnvContent = "key1=value1" + os.EOL + "key2=value2";
      const envs = {
        key1: "new-value1",
        key2: "new-value2",
        key3: "value3",
      };
      const expected = "key1=new-value1" + os.EOL + "key2=new-value2" + os.EOL + "key3=value3";
      await updateLocalEnv(migrationContext, envs);
      chai.assert.equal(localEnvContent, expected);
    });
  });
});
