// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import {
  CertificateAuthProvider,
  createApiClient,
  createPemCertOption,
  createPfxCertOption,
} from "../../../src";
import * as https from "https";
import { TLSSocket } from "tls";
import { extractIntegrationEnvVariables } from "../helper";
import mockedEnv from "mocked-env";

describe("CertificateAuthProvider Tests - Node", () => {
  extractIntegrationEnvVariables();
  const host = "localhost";
  const port = 53002;
  const apiBaseUrl = `https://${host}:${port}`;

  const testCerts: TestCerts = loadTestCertsFromEnv();

  const serverCertAuthConfig = {
    requestCert: true,
    cert: testCerts.serverCert,
    key: testCerts.serverKey,
    ca: testCerts.serverCert,
  };
  const server = https.createServer(serverCertAuthConfig, (req, res) => {
    res.writeHead(200);
    const cert = (req.socket as TLSSocket).getPeerCertificate();
    res.end(cert.subject.CN);
  });

  before(() => {
    server.listen(port, host, () => {
      console.log(`Server is running on http://${host}:${port}`);
    });
  });

  after(() => {
    server.close(() => {
      console.log(`Server closed`);
    });
  });

  it("can support PEM certs", async function () {
    const certProvider = new CertificateAuthProvider(
      createPemCertOption(testCerts.clientCert, testCerts.clientKey, {
        ca: testCerts.serverCert,
      })
    );
    const client = createApiClient(apiBaseUrl, certProvider);

    const result = await client.get("");

    assert.equal(result.data, testCerts.clientCN);
  });

  it("can support encrypted PEM key", async function () {
    const certProvider = new CertificateAuthProvider(
      createPemCertOption(testCerts.clientCert, testCerts.clientKeyEncrypted, {
        passphrase: testCerts.passphrase,
        ca: testCerts.serverCert,
      })
    );
    const client = createApiClient(apiBaseUrl, certProvider);

    const result = await client.get("");

    assert.equal(result.data, testCerts.clientCN);
  });

  it("can support pfx certs", async function () {
    const certProvider = new CertificateAuthProvider(createPfxCertOption(testCerts.clientPfx));
    const client = createApiClient(apiBaseUrl, certProvider);

    const result = await client.get("");

    assert.equal(result.data, testCerts.clientCN);
  });

  it("can support encrypted pfx certs", async function () {
    const certProvider = new CertificateAuthProvider(
      createPfxCertOption(testCerts.clientPfxEncrypted, { passphrase: testCerts.passphrase })
    );
    const client = createApiClient(apiBaseUrl, certProvider);

    const result = await client.get("");

    assert.equal(result.data, testCerts.clientCN);
  });

  it("can support certs without setting CA", async function () {
    const mockedEnvRestore = mockedEnv({
      NODE_TLS_REJECT_UNAUTHORIZED: "0", // We're using self signed certificate for test, so needs to set this flag to bypass CA check
    });
    try {
      const certProvider = new CertificateAuthProvider(
        createPemCertOption(testCerts.clientCert, testCerts.clientKey)
      );
      const client = createApiClient(apiBaseUrl, certProvider);

      const result = await client.get("");

      assert.equal(result.data, testCerts.clientCN);
    } finally {
      mockedEnvRestore();
    }
  });
});

interface TestCerts {
  serverCert: string;
  serverKey: string;
  clientCert: string;
  clientKey: string;
  clientKeyEncrypted: string;
  clientPfx: string | Buffer;
  clientPfxEncrypted: string | Buffer;
  passphrase: string;
  clientCN: string;
}

function loadTestCertsFromEnv(): TestCerts {
  const certs: TestCerts = JSON.parse(process.env.SDK_INTEGRATION_TEST_API_CERTPROVIDER!);
  certs.clientPfx = Buffer.from(certs.clientPfx as string, "base64");
  certs.clientPfxEncrypted = Buffer.from(certs.clientPfxEncrypted as string, "base64");
  return certs;
}
