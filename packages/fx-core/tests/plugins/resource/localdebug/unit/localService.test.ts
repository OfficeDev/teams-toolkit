// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as sinon from "sinon";

import * as fs from "fs-extra";
import os from "os";
import * as path from "path";

import { getAuthServiceFolder } from "../../../../../src/plugins/resource/localdebug/util/localService";
import { ConfigFolderName } from "@microsoft/teamsfx-api";

chai.use(chaiAsPromised);

describe("localService", () => {
  const workspaceFolder = path.resolve(__dirname, "../data/");
  beforeEach(() => {
    fs.emptyDirSync(workspaceFolder);
  });

  describe("prepareLocalAuthService", () => {
    const fakeHomeDir = path.resolve(__dirname, "../data/.home/");

    beforeEach(() => {
      sinon.stub(os, "homedir").callsFake(() => fakeHomeDir);
      fs.emptyDirSync(fakeHomeDir);
    });

    afterEach(() => {
      sinon.restore();
    });

    it("auth service folder", () => {
      const localAuthFolder = getAuthServiceFolder();
      chai.assert.equal(localAuthFolder, `${fakeHomeDir}/.${ConfigFolderName}/localauth`);
    });
  });
});
