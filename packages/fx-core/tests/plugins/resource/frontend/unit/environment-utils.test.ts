// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import fs, { PathLike } from "fs-extra";
import * as faker from "faker";

import sinon from "sinon";
import { EnvironmentUtils } from "../../../../../src/plugins/resource/frontend/utils/environment-utils";

chai.use(chaiAsPromised);

describe("EnvironmentUtils", async () => {
  const fakePath = faker.system.filePath();

  const newPropertyKey = faker.unique(faker.lorem.word);
  const newPropertyValue = faker.lorem.word();
  const fakeVariables = { [newPropertyKey]: newPropertyValue };

  const length = 3;
  const existingPropertyKeys = Array.from(Array(length), () => faker.unique(faker.lorem.word));
  const existingPropertyValues = Array.from(Array(length), () => faker.lorem.word());
  const fakeEnv = existingPropertyKeys
    .map((v, i) => `${v}=${existingPropertyValues[i]}\r\n`)
    .join("");

  describe("write environments", async () => {
    beforeEach(() => {
      sinon.stub(fs, "ensureFile").resolves(Buffer.from(""));
      sinon.stub(fs, "readFile").resolves(Buffer.from(fakeEnv));
    });

    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      sinon.stub(fs, "writeFile").callsFake((path: number | PathLike, data: any) => {
        chai.assert.equal(`${fakeEnv}${newPropertyKey}=${newPropertyValue}\r\n`, data);
      });

      await EnvironmentUtils.writeEnvironments(fakePath, fakeVariables);
    });

    it("skip writing", async () => {
      sinon.stub(fs, "writeFile").callsFake((path: number | PathLike, data: any) => {
        chai.assert.fail("Should skip writing environments in this case.");
      });

      const existingVariables = { [existingPropertyKeys[0]]: existingPropertyValues[0] };
      await EnvironmentUtils.writeEnvironments(fakePath, existingVariables);
    });
  });

  describe("read environments", async () => {
    beforeEach(() => {
      sinon.stub(fs, "pathExists").resolves(true);
      sinon.stub(fs, "readFile").resolves(Buffer.from(fakeEnv));
    });

    afterEach(() => {
      sinon.restore();
    });

    it("happy path", async () => {
      const envs = await EnvironmentUtils.readEnvironments(fakePath);

      if (envs === undefined) {
        chai.assert.fail("Read environments failed with undefined value.");
      }
      chai.assert.equal(envs[existingPropertyKeys[0]], existingPropertyValues[0]);
    });
  });
});
