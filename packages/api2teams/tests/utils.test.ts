import { expect } from "chai";
import { getVersion, isFolderEmpty, getSafeCardName, wrapperCard } from "../src/utils";
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

  describe('getSafeCardName', () => {
    it('should generate a safe adaptive card name from operationId', () => {
      const api = { operationId: 'getUsers' };
      const url = '/users';
      const operation = 'get';

      const result = getSafeCardName(api, url, operation);

      expect(result).to.equal('getUsers');
    });

    it('should generate a safe adaptive card name from summary if operationId is not present', () => {
      const api = { summary: 'Get all users' };
      const url = '/users';
      const operation = 'get';

      const result = getSafeCardName(api, url, operation);

      expect(result).to.equal('getAllUsers');
    });

    it('should generate a safe adaptive card name from operation and url if operationId and summary are not present', () => {
      const api = {};
      const url = '/users';
      const operation = 'get';

      const result = getSafeCardName(api, url, operation);

      expect(result).to.equal('getUsers');
    });

    it('should remove special characters from the name', () => {
      const api = { operationId: 'get{User}Details' };
      const url = '/users/{userId}';
      const operation = 'get';

      const result = getSafeCardName(api, url, operation);

      expect(result).to.equal('getUserDetails');
    });

    it('should add an underscore to the beginning of the name if it starts with a number', () => {
      const api = { operationId: '123getUserDetails' };
      const url = '/users/{userId}';
      const operation = 'get';

      const result = getSafeCardName(api, url, operation);

      expect(result).to.equal('_123getUserDetails');
    });
  });

  describe('wrapperCard', () => {
    it('should return an AdaptiveCard object with the given body and version 1.5', () => {
      const body = [{ type: 'TextBlock', text: 'Hello World' }];
      const result = wrapperCard(body, 'test', '');
      expect(result.type).to.equal('AdaptiveCard');
      expect(result.body).to.deep.equal(body);
      expect(result.version).to.equal('1.5');
    });

    it('should include an Action.Execute action if an operation is provided', () => {
      const body = [{ type: 'TextBlock', text: 'Hello World' }];
      const result = wrapperCard(body, 'test', 'get');
      expect(result.actions).to.deep.equal([
        { type: 'Action.Execute', verb: 'test', title: 'GET' }
      ]);
    });

    it('should not include an actions property if no operation is provided', () => {
      const body = [{ type: 'TextBlock', text: 'Hello World' }];
      const result = wrapperCard(body, 'test');
      expect(result.actions).to.be.undefined;
    });
  });
})
