// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { asn1, md, pki } from "node-forge";
import * as sinon from "sinon";

import * as fs from "fs-extra";
import os from "os";
import * as path from "path";

import { LocalCertificateManager } from "../../../src/common/local/localCertificateManager";
import * as ps from "../../../src/common/local/process";
import { ConfigFolderName } from "@microsoft/teamsfx-api";

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
  beforeEach(() => {
    fs.emptyDirSync(workspaceFolder);
  });

  describe("setupCertificate", () => {
    const fakeHomeDir = path.resolve(workspaceFolder, ".home/");
    let certManager: LocalCertificateManager;

    beforeEach(() => {
      sinon.stub(os, "homedir").callsFake(() => fakeHomeDir);
      sinon.stub(ps, "execPowerShell").callsFake(async (command: string) => {
        if (command.startsWith("Get-ChildItem")) {
          // Command: `(Get-ChildItem -Path Cert:\\CurrentUser\\Root | Where-Object { $_.Thumbprint -match '${thumbprint}' }).Thumbprint`
          return command.split("'")[1];
        } else if (command.startsWith("Import-Certificate")) {
          // Command: `(Import-Certificate -FilePath '${certPath}' -CertStoreLocation Cert:\\CurrentUser\\Root)[0].Thumbprint`
          return "thumbprint";
        } else {
          return "";
        }
      });
      fs.emptyDirSync(fakeHomeDir);
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

        chai.assert.isTrue(fs.pathExistsSync(expectedCertFile));
        const certContent = fs.readFileSync(expectedCertFile, { encoding: "utf8" });
        chai.assert.isTrue(
          /-----BEGIN CERTIFICATE-----.*-----END CERTIFICATE-----/gs.test(certContent)
        );
        chai.assert.isTrue(fs.pathExistsSync(expectedKeyFile));
        const keyContent = fs.readFileSync(expectedKeyFile, { encoding: "utf8" });
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

        chai.assert.isTrue(fs.pathExistsSync(expectedCertFile));
        const certContent = fs.readFileSync(expectedCertFile, { encoding: "utf8" });
        chai.assert.isTrue(
          /-----BEGIN CERTIFICATE-----.*-----END CERTIFICATE-----/gs.test(certContent)
        );
        chai.assert.isTrue(fs.pathExistsSync(expectedKeyFile));
        const keyContent = fs.readFileSync(expectedKeyFile, { encoding: "utf8" });
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
        const certContent1 = fs.readFileSync(expectedCertFile, { encoding: "utf8" });
        const thumbprint1 = getCertThumbprint(certContent1);

        res = await certManager.setupCertificate(true);
        chai.assert.isTrue(fs.pathExistsSync(expectedCertFile));
        chai.assert.isTrue(fs.pathExistsSync(expectedKeyFile));
        const certContent2 = fs.readFileSync(expectedCertFile, { encoding: "utf8" });
        const thumbprint2 = getCertThumbprint(certContent2);
        chai.assert.equal(thumbprint1, thumbprint2);
        chai.assert.equal(res.isTrusted, data.isTrusted);
      });
    });
  });
});

function getCertThumbprint(certContent: string): string {
  const cert = pki.certificateFromPem(certContent);
  const der = asn1.toDer(pki.certificateToAsn1(cert)).getBytes();
  const m = md.sha1.create();
  m.update(der);
  return m.digest().toHex();
}
