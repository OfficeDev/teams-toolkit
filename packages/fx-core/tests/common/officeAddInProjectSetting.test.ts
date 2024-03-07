import * as chai from "chai";
import * as fs from "fs-extra";
import mockFs from "mock-fs";
import * as sinon from "sinon";
import * as projectSettingsHelper from "../../src/common/projectSettingsHelper";

describe("validateIsOfficeAddInProject", () => {
  const sandbox = sinon.createSandbox();
  let fetchManifestListStub: any;

  beforeEach(() => {
    fetchManifestListStub = sinon.stub(projectSettingsHelper, "fetchManifestList");
  });

  afterEach(() => {
    fetchManifestListStub.restore();
    mockFs.restore();
    sandbox.restore();
  });

  it("should return true if manifest list is not empty", () => {
    fetchManifestListStub.returns(["manifest.xml"]);
    mockFs({
      "/test/manifest.xml": "",
    });
    chai.expect(projectSettingsHelper.isValidOfficeAddInProject("/test")).to.be.true;
  });

  it("should return false if no manifest file", () => {
    fetchManifestListStub.returns([]);
    mockFs({
      "/test/useless.xml": "",
    });
    chai.expect(projectSettingsHelper.isValidOfficeAddInProject("/test")).to.be.false;
  });

  it("should return false if fetchManifestList throws an error", () => {
    fetchManifestListStub.throws(new Error("Error fetching manifest list"));
    chai.expect(projectSettingsHelper.isValidOfficeAddInProject("")).to.be.false;
  });
});

describe("fetchManifestList", () => {
  let readdirSyncStub: any, isOfficeAddInManifestStub: any;

  beforeEach(() => {
    readdirSyncStub = sinon.stub(fs, "readdirSync");
    isOfficeAddInManifestStub = sinon.stub(projectSettingsHelper, "isOfficeAddInManifest");
  });

  afterEach(() => {
    readdirSyncStub.restore();
    isOfficeAddInManifestStub.restore();
  });

  it("should return undefined if workspacePath is not provided", () => {
    chai.expect(projectSettingsHelper.fetchManifestList()).to.be.undefined;
  });

  it("should return manifest list if workspacePath is provided", () => {
    mockFs({
      "/test/manifest.xml": "",
    });
    readdirSyncStub.returns(["manifest.xml"]);
    isOfficeAddInManifestStub.callsFake((fileName: string) => fileName === "manifest.xml");
    chai.expect(projectSettingsHelper.fetchManifestList("/test")).to.deep.equal(["manifest.xml"]);
    mockFs.restore();
  });
});
