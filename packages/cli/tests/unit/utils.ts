// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import fs from "fs-extra";
import os from "os";
import path from "path";

chai.use(chaiAsPromised);
export const expect = chai.expect;

export const TestFolder = path.join(os.homedir(), "test-folder");
fs.ensureDirSync(TestFolder);

export function deleteFolderIfExists(p: string) {
  if (fs.pathExistsSync(p)) {
    fs.removeSync(p);
  }
}

export function createFolderIfNotExist(folder: string) {
  if (!fs.pathExistsSync(folder)) {
    fs.mkdirSync(folder);
  }
}

export function createFileIfNotExist(p: string) {
  if (!fs.pathExistsSync(p)) {
    fs.createFileSync(p);
  }
}

export function getDirFiles(folder: string): string[] {
  if (!fs.pathExistsSync(folder)) {
    return [];
  }
  return fs.readdirSync(folder);
}
