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

import { LocalCertificateManager } from "../../../../../src/plugins/resource/localdebug/certificate";

chai.use(chaiAsPromised);

describe("certificate", () => {
    const workspaceFolder = path.resolve(__dirname, "../data/");
    const expectedCertFile = path.resolve(workspaceFolder, ".home/.teamsfx/certificate/localhost.crt");
    const expectedKeyFile = path.resolve(workspaceFolder, ".home/.teamsfx/certificate/localhost.key");
    beforeEach(() => {
        fs.emptyDirSync(workspaceFolder);
    });

    describe("setupCertificate", () => {
        const fakeHomeDir = path.resolve(__dirname, "../data/.home/");
        let certManager: LocalCertificateManager;

        beforeEach(() => {
            sinon.stub(os, "homedir").callsFake(() => fakeHomeDir);
            sinon.stub(os, "type").returns("Linux");

            fs.emptyDirSync(fakeHomeDir);
            certManager = new LocalCertificateManager(undefined);
        });

        afterEach(() => {
            sinon.restore();
        });

        it("happy path", async () => {
            await certManager.setupCertificate();

            chai.assert.isTrue(fs.pathExistsSync(expectedCertFile));
            const certContent = fs.readFileSync(expectedCertFile, {encoding: "utf8"});
            chai.assert.isTrue(/-----BEGIN CERTIFICATE-----.*-----END CERTIFICATE-----/sg.test(certContent));
            chai.assert.isTrue(fs.pathExistsSync(expectedKeyFile));
            const keyContent = fs.readFileSync(expectedKeyFile, {encoding: "utf8"});
            chai.assert.isTrue(/-----BEGIN RSA PRIVATE KEY-----.*-----END RSA PRIVATE KEY-----/sg.test(keyContent));
        });

        it("existing verified cert", async () => {
            await certManager.setupCertificate();
            const certContent1 = fs.readFileSync(expectedCertFile, {encoding: "utf8"});
            const thumbprint1 = getCertThumbprint(certContent1);

            await certManager.setupCertificate();
            chai.assert.isTrue(fs.pathExistsSync(expectedCertFile));
            chai.assert.isTrue(fs.pathExistsSync(expectedKeyFile));
            const certContent2 = fs.readFileSync(expectedCertFile, {encoding: "utf8"});
            const thumbprint2 = getCertThumbprint(certContent2);
            chai.assert.equal(thumbprint1, thumbprint2);
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