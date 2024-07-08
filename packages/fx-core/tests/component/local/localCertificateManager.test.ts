// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { ConfigFolderName, FxError, Result, UserInteraction, ok } from "@microsoft/teamsfx-api";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import fs from "fs-extra";
import "mocha";
import { asn1, md, pki } from "node-forge";
import os from "os";
import * as path from "path";
import * as sinon from "sinon";
import * as localizeUtils from "../../../src/common/localizeUtils";
import { LocalCertificateManager } from "../../../src/component/local/localCertificateManager";
import * as ps from "../../../src/component/local/process";

chai.use(chaiAsPromised);

describe("certificate", () => {
  const workspaceFolder = path.resolve(__dirname, "../data/n/t/r/test space 1/");
  const expectedWorkspaceFolder = path.resolve(__dirname, "../data/n/t/r/test space 1/");
  const expectedCertFile = path.resolve(
    expectedWorkspaceFolder,
    `.home/.${ConfigFolderName}/certificate/localhost.crt`
  );
  const expectedKeyFile = path.resolve(
    expectedWorkspaceFolder,
    `.home/.${ConfigFolderName}/certificate/localhost.key`
  );
  describe("setupCertificate", () => {
    const fakeHomeDir = path.resolve(workspaceFolder, ".home/");
    let files: Record<string, any> = {};
    let certManager: LocalCertificateManager;

    beforeEach(() => {
      files = {};
      sinon.restore();
      sinon.stub(fs, "ensureDir").callsFake(async (dir: string) => {
        return Promise.resolve();
      });
      sinon.stub(fs, "pathExists").callsFake(async (file: string) => {
        return Promise.resolve(files[path.resolve(file)] !== undefined);
      });
      sinon.stub(fs, "readFile").callsFake(async (file: fs.PathLike | number, options?: any) => {
        return Promise.resolve(files[path.resolve(file as string)]);
      });
      sinon
        .stub(fs, "writeFile")
        .callsFake(async (file: fs.PathLike | number, data: any, options?: any) => {
          files[path.resolve(file as string)] = data;
          return Promise.resolve();
        });
      sinon.stub(os, "homedir").callsFake(() => fakeHomeDir);
      sinon.stub(ps, "execPowerShell").callsFake(async (command: string) => {
        if (command.startsWith("Get-ChildItem")) {
          // Command: `Get-ChildItem -Path Cert:\\CurrentUser\\Root | Where-Object { $_.Thumbprint -match '${thumbprint}' }`
          return command.split("'")[1];
        } else if (command.startsWith("Import-Certificate")) {
          // Command: `Import-Certificate -FilePath '${localCert.certPath}' -CertStoreLocation Cert:\\CurrentUser\\Root)`
          return "thumbprint";
        } else {
          return "";
        }
      });
      certManager = new LocalCertificateManager();
    });

    afterEach(() => {
      sinon.restore();
    });

    [
      { osType: "Windows_NT", isTrusted: true },
      { osType: "Linux", isTrusted: undefined },
    ].forEach((data) => {
      it(`happy path ${data.osType}`, async () => {
        sinon.stub(os, "type").returns(data.osType);
        const res = await certManager.setupCertificate(true);

        chai.assert.equal(
          res.certPath,
          path.normalize(expectedCertFile).split(path.sep).join(path.posix.sep)
        );
        chai.assert.equal(
          res.keyPath,
          path.normalize(expectedKeyFile).split(path.sep).join(path.posix.sep)
        );

        const certContent = files[path.resolve(expectedCertFile)];
        chai.assert.isDefined(certContent);
        chai.assert.isTrue(
          /-----BEGIN CERTIFICATE-----.*-----END CERTIFICATE-----/gs.test(certContent)
        );
        const keyContent = files[path.resolve(expectedKeyFile)];
        chai.assert.isDefined(keyContent);
        chai.assert.isTrue(
          /-----BEGIN RSA PRIVATE KEY-----.*-----END RSA PRIVATE KEY-----/gs.test(keyContent)
        );
        chai.assert.equal(res.isTrusted, data.isTrusted);
      });
    });

    [
      { osType: "Windows_NT", isTrusted: undefined },
      { osType: "Linux", isTrusted: undefined },
    ].forEach((data) => {
      it(`skip trust ${data.osType}`, async () => {
        sinon.stub(os, "type").returns(data.osType);
        const res = await certManager.setupCertificate(false);

        const certContent = files[path.resolve(expectedCertFile)];
        chai.assert.isDefined(certContent);
        chai.assert.isTrue(
          /-----BEGIN CERTIFICATE-----.*-----END CERTIFICATE-----/gs.test(certContent)
        );
        const keyContent = files[path.resolve(expectedKeyFile)];
        chai.assert.isDefined(keyContent);
        chai.assert.isTrue(
          /-----BEGIN RSA PRIVATE KEY-----.*-----END RSA PRIVATE KEY-----/gs.test(keyContent)
        );
        chai.assert.equal(res.isTrusted, data.isTrusted);
      });
    });

    [
      { osType: "Windows_NT", isTrusted: true },
      { osType: "Linux", isTrusted: undefined },
    ].forEach((data) => {
      it(`existing verified cert ${data.osType}`, async () => {
        sinon.stub(os, "type").returns(data.osType);
        let res = await certManager.setupCertificate(true);
        const certContent1 = files[path.resolve(expectedCertFile)];
        chai.assert.isDefined(certContent1);
        const thumbprint1 = getCertThumbprint(certContent1);

        res = await certManager.setupCertificate(true);
        const certContent2 = files[path.resolve(expectedCertFile)];
        chai.assert.isDefined(certContent2);
        const keyContent = files[path.resolve(expectedKeyFile)];
        chai.assert.isDefined(keyContent);
        const thumbprint2 = getCertThumbprint(certContent2);
        chai.assert.equal(thumbprint1, thumbprint2);
        chai.assert.equal(res.isTrusted, data.isTrusted);
      });
    });
  });

  describe("setupCertificate certutil", () => {
    const fakeHomeDir = path.resolve(workspaceFolder, ".home/");
    let files: Record<string, any> = {};
    let certManager: LocalCertificateManager;

    beforeEach(() => {
      files = {};
      sinon.restore();
      sinon.stub(os, "type").returns("Windows_NT");
      sinon.stub(fs, "ensureDir").resolves();
      sinon.stub(fs, "pathExists").callsFake(async (file: string) => {
        return Promise.resolve(files[path.resolve(file)] !== undefined);
      });
      sinon.stub(fs, "readFile").callsFake(async (file: fs.PathLike | number, options?: any) => {
        return Promise.resolve(files[path.resolve(file as string)]);
      });
      sinon
        .stub(fs, "writeFile")
        .callsFake(async (file: fs.PathLike | number, data: any, options?: any) => {
          files[path.resolve(file as string)] = data;
          return Promise.resolve();
        });
      sinon.stub(os, "homedir").callsFake(() => fakeHomeDir);
      sinon.stub(ps, "execPowerShell").rejects();
      sinon.stub(ps, "execShell").callsFake(async (command: string) => {
        if (command.startsWith("certutil -user -verifystore")) {
          // Command: `certutil -user -verifystore root ${thumbprint}`
          return "Not Found";
        } else if (command.startsWith("certutil -user -addstore")) {
          // Command: `certutil -user -addstore root "${localCert.certPath}"`
          return "addstore";
        } else if (command.startsWith("certutil -user -repairstore")) {
          // Command: `certutil -user -repairstore root ${thumbprint} "${certInfPath}"`
          return "repairstore";
        } else {
          return "";
        }
      });
      certManager = new LocalCertificateManager();
    });

    afterEach(() => {
      sinon.restore();
    });

    it(`happy path windows`, async () => {
      const res = await certManager.setupCertificate(true);

      chai.assert.equal(
        res.certPath,
        path.normalize(expectedCertFile).split(path.sep).join(path.posix.sep)
      );
      chai.assert.equal(
        res.keyPath,
        path.normalize(expectedKeyFile).split(path.sep).join(path.posix.sep)
      );

      const certContent = files[path.resolve(expectedCertFile)];
      chai.assert.isDefined(certContent);
      chai.assert.isTrue(
        /-----BEGIN CERTIFICATE-----.*-----END CERTIFICATE-----/gs.test(certContent)
      );
      const keyContent = files[path.resolve(expectedKeyFile)];
      chai.assert.isDefined(keyContent);
      chai.assert.isTrue(
        /-----BEGIN RSA PRIVATE KEY-----.*-----END RSA PRIVATE KEY-----/gs.test(keyContent)
      );
      chai.assert.equal(res.isTrusted, true);
    });
  });

  describe("platform specific", () => {
    const fakeHomeDir = path.resolve(workspaceFolder, ".home/");
    const files: Record<string, any> = {};
    let certManager: LocalCertificateManager;

    beforeEach(() => {
      sinon.restore();
    });

    afterEach(() => {
      sinon.restore();
    });

    it("waitForUserConfirm once", async () => {
      sinon.stub(localizeUtils, "getLocalizedString").callsFake((key, ...params) => {
        if (key === "debug.install") {
          return "install";
        }

        return "empty";
      });
      const ui = {
        showMessage(
          level: "info" | "warn" | "error",
          message: string,
          modal: boolean,
          ...items: string[]
        ): Promise<Result<string | undefined, FxError>> {
          return Promise.resolve(ok("install"));
        },
      } as UserInteraction;
      certManager = new LocalCertificateManager(ui);
      const userConfirm = await (certManager as any).waitForUserConfirm();
      chai.assert.isTrue(userConfirm);
    });

    it("waitForUserConfirm twice", async () => {
      sinon.stub(localizeUtils, "getLocalizedString").callsFake((key, ...params) => {
        if (key === "debug.install") {
          return "install";
        } else if (key === "core.provision.learnMore") {
          return "learnmore";
        }

        return "empty";
      });
      let count = 0;
      const ui = {
        openUrl(link: string): Promise<Result<boolean, FxError>> {
          return Promise.resolve(ok(true));
        },
        showMessage(
          level: "info" | "warn" | "error",
          message: string,
          modal: boolean,
          ...items: string[]
        ): Promise<Result<string | undefined, FxError>> {
          count++;
          return Promise.resolve(ok(count > 1 ? "install" : "learnmore"));
        },
      } as UserInteraction;
      certManager = new LocalCertificateManager(ui);
      const userConfirm = await (certManager as any).waitForUserConfirm();
      chai.assert.isTrue(userConfirm);
    });

    it("trustCertificateWindows", async () => {
      sinon.stub(ps, "execPowerShell").callsFake(async (command: string) => {
        if (command.startsWith("(Get-ChildItem")) {
          // Command: `(Get-ChildItem -Path Cert:\\CurrentUser\\Root\\${thumbprint}).FriendlyName='${friendlyName}'`
          return "friendlyname";
        } else if (command.startsWith("Import-Certificate")) {
          // Command: `Import-Certificate -FilePath '${localCert.certPath}' -CertStoreLocation Cert:\\CurrentUser\\Root`
          return "import";
        } else {
          return "";
        }
      });
      const certManager = new LocalCertificateManager();
      await (certManager as any).trustCertificateWindows(
        {
          certPath: "certPath",
          keyPath: "keyPath",
        },
        "thumbprint",
        "friendlyname"
      );
    });

    it("trustCertificate error", async () => {
      sinon.stub(os, "type").returns("Windows_NT");
      const certManager = new LocalCertificateManager();
      (certManager as any).waitForUserConfirm = function (): Promise<boolean> {
        return Promise.reject(new Error("test"));
      };
      const cert = {
        certPath: "certPath",
        keyPath: "keyPath",
      } as any;
      await (certManager as any).trustCertificate(cert, "thumbprint", "friendlyname");
      chai.assert.isFalse(cert.isTrusted);
      chai.assert.isDefined(cert.error);
    });
  });
});

describe("setupCertificate check only", () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  it("not found", async () => {
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(fs, "pathExists").resolves(false);
    const certManager = new LocalCertificateManager();
    const res = await certManager.setupCertificate(true, true);
    chai.assert.isFalse(res.found);
  });
  it("found but not trusted", async () => {
    sandbox.stub(fs, "ensureDir").resolves();
    sandbox.stub(fs, "pathExists").resolves(true);
    sandbox.stub(fs, "readFile").resolves("aaa" as any);
    const certManager = new LocalCertificateManager();
    sandbox
      .stub(LocalCertificateManager.prototype, "verifyCertificateContent")
      .returns(["test", true]);
    sandbox.stub(LocalCertificateManager.prototype, "generateCertificate").resolves("test");
    sandbox.stub(LocalCertificateManager.prototype, "verifyCertificateInStore").resolves(false);
    const res = await certManager.setupCertificate(true, true);
    chai.assert.isTrue(res.found);
    chai.assert.isFalse(res.alreadyTrusted);
  });
});

function getCertThumbprint(certContent: string): string {
  const cert = pki.certificateFromPem(certContent);
  const der = asn1.toDer(pki.certificateToAsn1(cert)).getBytes();
  const m = md.sha1.create();
  m.update(der);
  return m.digest().toHex();
}
