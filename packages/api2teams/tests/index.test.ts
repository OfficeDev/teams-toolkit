import { expect } from 'chai';
import sinon from 'sinon';
import * as parser from '../src/parser';
import { start } from '../src/index';

describe('index tests', () => {
  describe('start', () => {
    let parseApiStub: sinon.SinonStub;
    let originalArgv: string[];

    beforeEach(() => {
      parseApiStub = sinon.stub(parser, 'parseApi');
      originalArgv = process.argv;
    });

    afterEach(() => {
      parseApiStub.restore();
      process.argv = originalArgv;
    });

    it('should call parseApi with the yaml file path and options', async () => {
      process.argv = ['node', 'cli.js', 'path/to/yaml', '--output', 'path/to/output'];

      await start();

      expect(parseApiStub).to.have.been.calledWith('path/to/yaml', { output: 'path/to/output' });
    });
  });
})
