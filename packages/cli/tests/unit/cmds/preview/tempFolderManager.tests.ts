// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import fs from "fs-extra";

import sinon from "sinon";

import { TempFolderManager } from "../../../../src/cmds/preview/tempFolderManager";
import { expect } from "../../utils";

describe("TempFolderManager", () => {
  const sandbox = sinon.createSandbox();
  const basePath = "basePath";
  let folderNumber: number;
  let folders: string[];

  beforeEach(() => {
    sandbox.stub(fs, "readdir").callsFake(async () => Array.from(folders));
    sandbox.stub(fs, "remove").callsFake(async (folderPath) => {
      const index = folders.map((value) => path.join(basePath, value)).indexOf(folderPath);
      if (index > -1) {
        folders.splice(index, 1);
      }
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("clean", () => {
    it("less than maxFolderNumber", async () => {
      folderNumber = 6;
      folders = Array.from(Array(folderNumber).keys()).map((value) => value + "");
      const tempFolderManager = new TempFolderManager(basePath, 10);
      await tempFolderManager.clean();
      expect(folders.length).to.deep.equals(folderNumber);
    });

    it("greater than maxFolderNumber", async () => {
      folderNumber = 10;
      folders = Array.from(Array(folderNumber).keys()).map((value) => value + "");
      const tempFolderManager = new TempFolderManager(basePath, 8);
      await tempFolderManager.clean();
      expect(folders.length).to.deep.equals(7);
      expect(folders).to.deep.equals(Array.from(Array(7).keys()).map((value) => value + 3 + ""));
    });
  });

  describe("getTempFolderPath", () => {
    it("happy path", async () => {
      const datetime = new Date().toISOString();
      sandbox.stub(Date.prototype, "toISOString").returns(datetime);
      folderNumber = 6;
      folders = Array.from(Array(folderNumber).keys()).map((value) => value + "");
      const tempFolderManager = new TempFolderManager(basePath, 10);
      let actual = "";
      sandbox.stub(fs, "ensureDir").callsFake((path) => {
        actual = path;
      });
      const expected = path.join(basePath, datetime.replace(/:/g, "_").replace(/\./g, "_"));
      expect(await tempFolderManager.getTempFolderPath()).to.deep.equals(expected);
      expect(actual).to.deep.equals(expected);
      expect(folders.length).to.deep.equals(folderNumber);
    });
  });
});
