import sinon from 'sinon';
import fs from 'fs-extra';
import * as utils from '../src/utils'
import { parseApi } from '../src/parser';
import chai from 'chai';
import sinonChai from 'sinon-chai';
import * as requestCardGenerator from "../src/generateRequestCard";
import * as responseCardGenerator from "../src/generateResponseCard";
import SwaggerParser from '@apidevtools/swagger-parser';

chai.use(sinonChai);
const { expect } = chai

describe('parseApi tests', () => {
  describe('parseApi', () => {
    let sandbox: sinon.SinonSandbox;
    let isFolderEmptyStub: sinon.SinonStub;
    let pathExistsStub: sinon.SinonStub;
    let mkdirStub: sinon.SinonStub;
    let validateStub: sinon.SinonStub;
    let parseStub: sinon.SinonStub;
    let generateRequestCardStub: sinon.SinonStub;
    let generateResponseCardStub: sinon.SinonStub;
    let outputFileStub: sinon.SinonStub;
    let getSchemaRefStub: sinon.SinonStub;
    beforeEach(() => {
      sandbox = sinon.createSandbox();
      isFolderEmptyStub = sandbox.stub(utils, 'isFolderEmpty');
      pathExistsStub = sandbox.stub(fs, 'pathExists');
      mkdirStub = sandbox.stub(fs, 'mkdir');
      outputFileStub = sandbox.stub(fs, 'outputFile');
      validateStub = sandbox.stub(SwaggerParser, 'validate');
      parseStub = sandbox.stub(SwaggerParser, "parse");
      getSchemaRefStub = sandbox.stub(utils, 'getSchemaRef');
      generateRequestCardStub = sandbox.stub(
        requestCardGenerator,
        'generateRequestCard'
      ).resolves([]);
      generateResponseCardStub = sandbox.stub(
        responseCardGenerator,
        'generateResponseCard'
      ).resolves([]);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should return early if args are not valid', async () => {
      pathExistsStub.resolves(false);

      await parseApi('path/to/yaml', { output: 'path/to/output' });

      expect(validateStub.called).to.be.false;
    });

    it('should create output directory if it does not exist', async () => {
      pathExistsStub.onCall(0).returns(true);
      pathExistsStub.onCall(1).returns(false);
      isFolderEmptyStub.resolves(true);
      validateStub.resolves({ info: { title: 'API', version: '1.0' } });

      await parseApi('path/to/yaml', { output: 'path/to/output' });

      expect(mkdirStub.calledOnceWith('path/to/output', { recursive: true }))
        .to.be.true;
    });

    it('should call generateRequestCard with correct args', async () => {
      pathExistsStub.onCall(0).returns(true);
      pathExistsStub.onCall(1).returns(true);
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
