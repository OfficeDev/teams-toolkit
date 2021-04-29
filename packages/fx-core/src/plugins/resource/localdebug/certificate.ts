// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as fs from "fs-extra";
import { ConfigFolderName, Dialog, DialogMsg, DialogType, LogProvider, PluginContext, QuestionType } from "fx-api";
import { asn1, md, pki } from "node-forge";
import * as os from "os";
import { v4 as uuidv4 } from "uuid";

import { LocalDebugCertificate } from "./constants";
import * as ps from "./util/process";

const continueText: string = "Continue";
const learnMoreText: string = "Learn More";
const learnMoreUrl: string = "https://aka.ms/teamsfx-ca-certificate";
const confirmMessage: string = "To debug applications in Teams, your localhost server must be on HTTPS.\
 For Teams to trust the self-signed SSL certificate used by the toolkit, a CA certificate can be added to your certificate store.\
 You may skip this step, but you'll have to manually trust the secure connection in a new browser window when debugging your apps in Teams.\
 For more information \"https://aka.ms/teamsfx-ca-certificate\". You may be asked for your account credentials if you continue to install the certificate.";

export interface LocalCertificate {
    certPath: string,
    keyPath: string,
    isTrusted: boolean,
}

export class LocalCertificateManager {
    private readonly dialog?: Dialog;
    private readonly logger?: LogProvider;
    private readonly certFolder: string;

    constructor(ctx: PluginContext | undefined) {
        this.dialog = ctx?.dialog;
        this.logger = ctx?.logProvider;
        this.certFolder = `${os.homedir()}/.${ConfigFolderName}/certificate`;
    }

    /**
     * Local certificates are located at {home}/.fx/certificate/
     * Public certificate should be trusted into user"s certificate store.
     * 
     * - Check and generate cert and key files (subject, usage, expiration, ...)
     * - Check cert store if trusted (thumbprint, expiration)
     * - Add to cert store if not trusted (friendly name as well)
     */
    public async setupCertificate(needTrust: boolean): Promise<LocalCertificate> {
        const certFilePath = `${this.certFolder}/${LocalDebugCertificate.CertFileName}`;
        const keyFilePath = `${this.certFolder}/${LocalDebugCertificate.KeyFileName}`;
        const localCert: LocalCertificate = {
            certPath: certFilePath,
            keyPath: keyFilePath,
            isTrusted: false,
        };
        let certThumbprint: string | undefined = undefined;
        await fs.ensureDir(this.certFolder);

        this.logger?.info("Detecting/Verifying local certificate.");

        if (await fs.pathExists(certFilePath) && await fs.pathExists(keyFilePath)) {
            const certContent = await fs.readFile(certFilePath, { encoding: "utf8" });
            const keyContent = await fs.readFile(keyFilePath, { encoding: "utf8" });
            certThumbprint = this.verifyCertificateContent(certContent, keyContent);
        }

        if (!certThumbprint) {
            // generate cert and key
            await this.generateCertificate(certFilePath, keyFilePath);
        }

        if (needTrust) {
            if (certThumbprint && await this.verifyCertificateInStore(certThumbprint)) {
                // already trusted
                localCert.isTrusted = true;
            } else {
                localCert.isTrusted = await this.trustCertificate(certFilePath, LocalDebugCertificate.FriendlyName);
            }
        }

        return localCert;
    }

    private async generateCertificate(certFile: string, keyFile: string): Promise<void> {
        // prepare attributes and extensions
        const now = new Date();
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);
        const serialNumber = uuidv4().replace(/-/g, "");
        const attrs = [{
            name: "commonName",
            value: "localhost",
        }];
        const exts = [{
            name: "basicConstraints",
            cA: true,
        }, {
            name: "extKeyUsage",
            serverAuth: true,
        }, {
            name: "subjectAltName",
            altNames: [{
                type: 2, // DNS
                value: "localhost"
            }]
        }];

        // generate key and cert
        const keys = pki.rsa.generateKeyPair({
            bits: 4096,
            algorithm: "sha256",
        });
        const cert = pki.createCertificate();
        cert.publicKey = keys.publicKey;
        cert.serialNumber = serialNumber;
        cert.validity.notBefore = now;
        cert.validity.notAfter = expiry;
        cert.setSubject(attrs);
        cert.setIssuer(attrs);
        cert.setExtensions(exts);
        cert.sign(keys.privateKey, md.sha256.create());

        // output
        const certContent = pki.certificateToPem(cert);
        const keyContent = pki.privateKeyToPem(keys.privateKey);
        await fs.writeFile(certFile, certContent, { encoding: "utf8" });
        await fs.writeFile(keyFile, keyContent, { encoding: "utf8" });

        this.logger?.info(`Local certificate generated to ${certFile}`);
    }

    private verifyCertificateContent(certContent: string, keyContent: string): string | undefined {
        try {
            const cert = pki.certificateFromPem(certContent);
            const privateKey = pki.privateKeyFromPem(keyContent);

            // verify key pair
            const expectedPublicKey = pki.rsa.setPublicKey(privateKey.n, privateKey.e);
            if (pki.publicKeyToPem(expectedPublicKey) !== pki.publicKeyToPem(cert.publicKey))
            {
                return undefined;
            }

            // verify subject and issuer
            const subject = cert.subject.getField("CN");
            if ("localhost" !== subject.value) {
                return undefined;
            }

            const issuer = cert.issuer.getField("CN");
            if ("localhost" !== issuer.value) {
                return undefined;
            }

            // verify date, add one day buffer
            const now = new Date();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const notBefore = cert.validity.notBefore;
            const notAfter = cert.validity.notAfter;
            if (notBefore > now || notAfter < tomorrow) {
                return undefined;
            }

            // verify extension
            const basicConstraints = cert.getExtension("basicConstraints") as {
                cA?: boolean
            };
            if (basicConstraints === undefined || basicConstraints.cA === undefined || !basicConstraints.cA) {
                return undefined;
            }

            const extKeyUsage = cert.getExtension("extKeyUsage") as {
                serverAuth?: boolean
            };
            if (extKeyUsage === undefined || extKeyUsage.serverAuth === undefined || !extKeyUsage.serverAuth) {
                return undefined;
            }

            const subjectAltName = cert.getExtension("subjectAltName") as {
                altNames?: {
                    type: number,
                    value: string,
                }[]
            };
            if (subjectAltName === undefined || subjectAltName.altNames === undefined || !subjectAltName.altNames.some(a => (a.type === 2 && a.value === "localhost"))) {
                return undefined;
            }

            // return thumbprint
            const der = asn1.toDer(pki.certificateToAsn1(cert)).getBytes();
            const m = md.sha1.create();
            m.update(der);
            return m.digest().toHex();
        } catch (error) {
            // treat any error as not verified, to not block the main progress
            return undefined;
        }
    }

    private async verifyCertificateInStore(thumbprint: string): Promise<boolean> {
        try {
            if (os.type() === "Windows_NT") {
                const getCertCommand = `(Get-ChildItem -Path Cert:\\CurrentUser\\Root | Where-Object { $_.Thumbprint -match '${thumbprint}' }).Thumbprint`;
                const existingThumbprint = (await ps.execPowerShell(getCertCommand)).trim();
                return (existingThumbprint.toUpperCase() === thumbprint.toUpperCase());
            } else if (os.type() === "Darwin") {
                const listCertCommand = "security find-certificate -c localhost -a -Z -p /Library/Keychains/System.keychain";
                const existingCertificates = await ps.execShell(listCertCommand);
                if (existingCertificates) {
                    const thumbprintRegex = /SHA-1 hash: ([0-9A-Z]+)/g;
                    let match = undefined;
                    while (match = thumbprintRegex.exec(existingCertificates))
                    {
                        const existingThumbprint = match[1];
                        if (existingThumbprint.toUpperCase() === thumbprint.toUpperCase()) {
                            return true;
                        }
                    }
                }

                return false;
            } else
            {
                // TODO: Linux
                return false;
            }
        } catch (error) {
            // treat any error as not verified, to not block the main progress
            this.logger?.warning(`Failed to verify certificate store. Error: ${error}`);
            return false;
        }
    }

    private async trustCertificate(certPath: string, friendlyName: string): Promise<boolean> {
        let progress = undefined;
        try {
            if (os.type() === "Windows_NT") {
                if (!await this.waitForUserConfirm()) {
                    return false;
                }
                
                const installCertCommand = `(Import-Certificate -FilePath '${certPath}' -CertStoreLocation Cert:\\CurrentUser\\Root)[0].Thumbprint`;
                const thumbprint = (await ps.execPowerShell(installCertCommand)).trim();

                const friendlyNameCommand = `(Get-ChildItem -Path Cert:\\CurrentUser\\Root\\${thumbprint}).FriendlyName='${friendlyName}'`;
                await ps.execPowerShell(friendlyNameCommand);

                return true;
            } else if (os.type() === "Darwin") {
                if (!await this.waitForUserConfirm()) {
                    return false;
                }

                await ps.execSudo(`security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain ${certPath}`);

                return true;
            } else
            {
                // TODO: Linux
                return false;
            }
        } catch (error) {
            // treat any error as install failure, to not block the main progress
            this.logger?.warning(`Failed to install certificate. Error: ${error}`);
            return false;
        }
    }

    private async waitForUserConfirm(): Promise<boolean> {
        if (this.dialog) {
            let userSelected: string | undefined;
            do {
                userSelected = (await this.dialog.communicate(new DialogMsg(
                    DialogType.Ask,
                    {
                        description: confirmMessage,
                        type: QuestionType.Confirm,
                        options: [learnMoreText, continueText], // Cancel is added by default
                    },
                ))).getAnswer();
                if (userSelected === learnMoreText) {
                    await this.dialog.communicate(new DialogMsg(
                        DialogType.Ask,
                        {
                            type: QuestionType.OpenExternal,
                            description: learnMoreUrl,
                        },
                    ));
                }
            } while (userSelected === learnMoreText);
            return userSelected === continueText;
        }

        // No dialog, always return true;
        return true;
    }
}