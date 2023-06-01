import { expect } from "chai";
import sinon from "sinon";
import fs from "fs-extra";
import * as parser from '../../src/parser';
import { start } from "../../src/index";
import * as utils from "../../src/utils";

describe("start", () => {
  let pathExistsStub: sinon.SinonStub;
  let isFolderEmptyStub: sinon.SinonStub;
  let parseApiStub: sinon.SinonStub;
  let originalArgv: string[] =[];

  beforeEach(() => {
    pathExistsStub = sinon.stub(fs, "pathExists");
    isFolderEmptyStub = sinon.stub(utils, "isFolderEmpty").resolves(true);
    parseApiStub = sinon.stub(parser, 'parseApi');
    originalArgv = process.argv;
  });

  afterEach(() => {
    process.argv = originalArgv;
    sinon.restore();
  });

  it("should call parseApi with the correct arguments", async () => {
    const yaml = "path/to/yaml";
    const options = { output: "path/to/output" }; 

    pathExistsStub.withArgs(yaml).resolves(true);
    pathExistsStub.withArgs(options.output).resolves(false);

    process.argv = ['node', 'cli.js', yaml, '--output', options.output];
    await start();
  });

  it("should log an error if the yaml file does not exist", async () => {
    const yaml = "path/to/yaml";
    const options = { output: "path/to/output" }; 

    pathExistsStub.withArgs(yaml).resolves(false);
    pathExistsStub.withArgs(options.output).resolves(false);

    process.argv = ['node', 'cli.js', yaml, '--output', options.output];

    const consoleErrorStub = sinon.stub(console, "error");

    await start();
    expect(consoleErrorStub.calledWithExactly(`[ERROR] open api spec file path is not exist in the path: ${yaml}`)).to.be.true;
  });
});