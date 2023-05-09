import sinon from 'sinon';
import fs from 'fs-extra';
import * as utils from '../src/utils'
import { parseApi } from '../src/parser';
import chai from 'chai';
import sinonChai from 'sinon-chai';
import * as generator from "../src/generateRequestCard";
import SwaggerParser from '@apidevtools/swagger-parser';

chai.use(sinonChai);
const { expect } = chai

describe('parseApi tests', () => {
  describe('parseApi', () => {
    let sandbox: sinon.SinonSandbox;
    let isFolderEmptyStub: sinon.SinonStub;
    let existsSyncStub: sinon.SinonStub;
    let mkdirSyncStub: sinon.SinonStub;
    let validateStub: sinon.SinonStub;
    let generateRequestCardStub: sinon.SinonStub;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      isFolderEmptyStub = sandbox.stub(utils, 'isFolderEmpty');
      existsSyncStub = sandbox.stub(fs, 'existsSync');
      mkdirSyncStub = sandbox.stub(fs, 'mkdirSync');
      validateStub = sandbox.stub(SwaggerParser, 'validate');
      generateRequestCardStub = sandbox.stub(
        generator,
        'generateRequestCard'
      ).resolves([]);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return early if args are not valid', async () => {
      existsSyncStub.returns(false);

      await parseApi('path/to/yaml', { output: 'path/to/output' });

      expect(validateStub.called).to.be.false;
    });

    it('should create output directory if it does not exist', async () => {
      existsSyncStub.onCall(0).returns(true);
      existsSyncStub.onCall(1).returns(false);
      isFolderEmptyStub.resolves(true);
      validateStub.resolves({ info: { title: 'API', version: '1.0' } });

      await parseApi('path/to/yaml', { output: 'path/to/output' });

      expect(mkdirSyncStub.calledOnceWith('path/to/output', { recursive: true }))
        .to.be.true;
    });

    it('should call generateRequestCard with correct args', async () => {
      existsSyncStub.onCall(0).returns(true);
      existsSyncStub.onCall(1).returns(true);
      isFolderEmptyStub.resolves(true);
      const api = { info: { title: 'API', version: '1.0' } };
      validateStub.resolves(api);

      await parseApi('path/to/yaml', { output: 'path/to/output' });

      expect(
        generateRequestCardStub.calledOnceWith(api)
      ).to.be.true;
    });
  });
})
