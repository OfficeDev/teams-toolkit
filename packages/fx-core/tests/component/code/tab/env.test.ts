// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/* eslint-disable import/no-named-as-default-member */
import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import fs, { PathLike } from "fs-extra";
import * as os from "os";
import * as faker from "faker";

import sinon from "sinon";
import { envFilePath, saveEnvFile } from "../../../../src/component/code/tab/env";

chai.use(chaiAsPromised);

describe("Frontend Hosting Customize Env", async () => {
  const fakePath = faker.system.filePath();

  const teamsfxEnvKey = faker.unique(faker.lorem.word);
  const teamsfxEnvValue = faker.lorem.word();
  const teamsfxEnv = { [teamsfxEnvKey]: teamsfxEnvValue };
  const teamsfxEnvString = `${teamsfxEnvKey}=${teamsfxEnvValue}${os.EOL}`;

  const length = 3;
  const customizeEnvKeys = Array.from(Array(length), () => faker.unique(faker.lorem.word));
  const customizeEnvValues = Array.from(Array(length), () => faker.lorem.word());

  const customizeEnvString = customizeEnvKeys
    .map((v, i) => `${v}=${customizeEnvValues[i]}${os.EOL}`)
    .join("");

  describe("save env file", async () => {
    beforeEach(() => {
      sinon.stub(fs, "ensureFile").resolves(Buffer.from(""));
    });

    afterEach(() => {
      sinon.restore();
    });

    it("write into new env file", async () => {
      sinon.stub(fs, "pathExists").resolves(false);
      sinon.stub(fs, "writeFile").callsFake((path: number | PathLike, data: any) => {
        chai.assert.include(data, teamsfxEnvString);
      });

      await saveEnvFile(envFilePath("dev", fakePath), {
        teamsfxRemoteEnvs: teamsfxEnv,
        customizedRemoteEnvs: {},
      });
    });

    it("write into env file with existing customize variable", async () => {
      sinon.stub(fs, "pathExists").resolves(true);
      sinon.stub(fs, "readFile").resolves(Buffer.from(customizeEnvString));
      sinon.stub(fs, "writeFile").callsFake((path: number | PathLike, data: any) => {
        chai.assert.include(data, teamsfxEnvString);
        chai.assert.include(data, customizeEnvString);
      });

      await saveEnvFile(envFilePath("dev", fakePath), {
        teamsfxRemoteEnvs: teamsfxEnv,
        customizedRemoteEnvs: {},
      });
    });
  });
});
