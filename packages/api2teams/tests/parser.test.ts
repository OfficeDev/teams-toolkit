import sinon from 'sinon';
import fs from 'fs-extra';
import * as utils from '../src/utils'
import { parseApi } from '../src/parser';
import chai from 'chai';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);
const { expect } = chai

describe('parseApi tests', () => {
  describe('parseApi', () => {
    let consoleLogStub: sinon.SinonStub;
    let consoleErrorStub: sinon.SinonStub;
    let existsSyncStub: sinon.SinonStub;
    let isFolderEmptyStub: sinon.SinonStub;

    beforeEach(() => {
      consoleLogStub = sinon.stub(console, 'log');
      consoleErrorStub = sinon.stub(console, 'error');
      existsSyncStub = sinon.stub(fs, 'existsSync');
      isFolderEmptyStub = sinon.stub(utils, 'isFolderEmpty');
    });

    afterEach(() => {
      consoleLogStub.restore();
      consoleErrorStub.restore();
      existsSyncStub.restore();
      isFolderEmptyStub.restore();
    });

    it('should log the yaml file path and output folder', async () => {
      existsSyncStub.returns(true);
      isFolderEmptyStub.resolves(true);

      await parseApi('path/to/yaml', { output: 'path/to/output' });

      expect(consoleLogStub).to.have.been.calledWith('yaml file path is: path/to/yaml');
      expect(consoleLogStub).to.have.been.calledWith('output folder is: path/to/output');
    });

    it('should log an error if the yaml file does not exist', async () => {
      existsSyncStub.returns(false);

      await parseApi('path/to/yaml', { output: 'path/to/output' });

      expect(consoleErrorStub).to.have.been.calledWith('yaml file path is not exist in the path: path/to/yaml');
    });

    it('should log an error if the output folder is not empty and the force option is not set', async () => {
      existsSyncStub.returns(true);
      isFolderEmptyStub.resolves(false);

      await parseApi('path/to/yaml', { output: 'path/to/output' });

      expect(consoleErrorStub).to.have.been.calledWith(
        'output folder is not empty, and you can use -f parameter to overwrite output folder'
      );
    });
  });
})
