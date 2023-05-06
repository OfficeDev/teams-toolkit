import { expect } from "chai";
import { getVersion, isFolderEmpty } from "../src/utils";
import path from "path";
import sinon from 'sinon';
import fs from 'fs-extra';

describe('utils tests', () => {
  describe('getVersion', () => {
    it('should return the version number', () => {
      const currentVersion = fs.readJsonSync(__dirname + "/../package.json").version;
      expect(getVersion()).to.equal(currentVersion);
    });
  });

  describe('isFolderEmpty', () => {
    it('should return true for an empty folder', async () => {
      const folderPath = path.resolve(__dirname, 'empty-folder');
      const readdirStub = sinon.stub(fs, 'readdir').resolves([]);
      expect(await isFolderEmpty(folderPath)).to.be.true;
      readdirStub.restore();
    });

    it('should return false for a non-empty folder', async () => {
      const folderPath = path.resolve(__dirname, 'non-empty-folder');
      const file = new fs.Dirent();
      file.name = "file1";
      const readdirStub = sinon.stub(fs, 'readdir').resolves([file]);
      expect(await isFolderEmpty(folderPath)).to.be.false;
      readdirStub.restore();
    });
  });
})
