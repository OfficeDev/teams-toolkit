// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as sinon from "sinon";
import * as vscode from "vscode";
import fs from "fs-extra";
import { deleteAad } from "../../src/debug/deleteAadHelper";
import * as globalVariables from "../../src/globalVariables";
import M365TokenInstance from "../../src/commonlib/m365Login";
import { ok } from "@microsoft/teamsfx-api";
import { ExtTelemetry } from "../../src/telemetry/extTelemetry";
import axios from "axios";
import * as chai from "chai";

describe("delete aad helper", () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe("delete aad", () => {
    it("file does not exist", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("path"));
      sandbox.stub(fs, "existsSync").returns(false);
      const res = await deleteAad();
      chai.assert.isTrue(res);
    });

    it("no aad id", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("path"));
      sandbox.stub(fs, "existsSync").returns(true);
      sandbox.stub(fs, "readFileSync").returns("{}");
      const res = await deleteAad();
      chai.assert.isTrue(res);
    });

    it("normal test account", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("path"));
      sandbox.stub(fs, "existsSync").returns(true);
      sandbox.stub(fs, "readFileSync").returns("BOT_ID=botId\n");
      sandbox.stub(M365TokenInstance, "getCachedAccountInfo").returns({
        username: "test.email.com",
        homeAccountId: "homeAccountId",
        environment: "test",
        tenantId: "tenantId",
        localAccountId: "localAccountId",
      });
      sandbox
        .stub(M365TokenInstance, "getAccessToken")
        .resolves(
          ok(
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidW5pcXVlX25hbWUiOiJKb2huIERvZSIsImlhdCI6MTUxNjIzOTAyMn0.Y7_rghuQEaTILkMN_421Cut4myfHIhk3hpvHVbpOvnQ"
          )
        );
      const res = await deleteAad();
      chai.assert.isTrue(res);
    });

    it("no telemetry handler", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("path"));
      sandbox.stub(fs, "existsSync").returns(true);
      sandbox.stub(fs, "readFileSync").returns("BOT_ID=botId\n");
      sandbox.stub(M365TokenInstance, "getCachedAccountInfo").resolves({ upn: "test.email.com" });
      sandbox
        .stub(M365TokenInstance, "getAccessToken")
        .resolves(
          ok(
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidW5pcXVlX25hbWUiOiJ0ZXN0QG1pY3Jvc29mdC5jb20iLCJpYXQiOjE1MTYyMzkwMjJ9.Rejz-cPndtObAYVa3k3Q7BaltQGXY8KRDxRYKyUoHDw"
          )
        );
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent").throws(new Error("test error"));
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const res = await deleteAad();
      chai.assert.isFalse(res);
    });

    it("happy path for bot id", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("path"));
      sandbox.stub(fs, "existsSync").returns(true);
      sandbox.stub(fs, "readFileSync").returns("BOT_ID=botId\n");
      sandbox.stub(fs, "writeFileSync");
      sandbox.stub(M365TokenInstance, "getCachedAccountInfo").resolves({ upn: "test.email.com" });
      sandbox
        .stub(M365TokenInstance, "getAccessToken")
        .resolves(
          ok(
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidW5pcXVlX25hbWUiOiJ0ZXN0QG1pY3Jvc29mdC5jb20iLCJpYXQiOjE1MTYyMzkwMjJ9.Rejz-cPndtObAYVa3k3Q7BaltQGXY8KRDxRYKyUoHDw"
          )
        );
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const fakeAxiosInstance = axios.create();
      sandbox.stub(axios, "create").returns(fakeAxiosInstance);
      sandbox.stub(fakeAxiosInstance, "delete").resolves({ data: { status: 204 } });
      const res = await deleteAad();
      chai.assert.isTrue(res);
    });

    it("happy path for sso id", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("path"));
      sandbox.stub(fs, "existsSync").returns(true);
      sandbox.stub(fs, "readFileSync").returns("AAD_APP_CLIENT_ID=clientId\n");
      sandbox.stub(fs, "writeFileSync");
      sandbox.stub(M365TokenInstance, "getCachedAccountInfo").resolves({ upn: "test.email.com" });
      sandbox
        .stub(M365TokenInstance, "getAccessToken")
        .resolves(
          ok(
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidW5pcXVlX25hbWUiOiJ0ZXN0QG1pY3Jvc29mdC5jb20iLCJpYXQiOjE1MTYyMzkwMjJ9.Rejz-cPndtObAYVa3k3Q7BaltQGXY8KRDxRYKyUoHDw"
          )
        );
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const fakeAxiosInstance = axios.create();
      sandbox.stub(axios, "create").returns(fakeAxiosInstance);
      sandbox.stub(fakeAxiosInstance, "delete").resolves({ data: { status: 204 } });
      const res = await deleteAad();
      chai.assert.isTrue(res);
    });

    it("happy path for bot id and sso id", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("path"));
      sandbox.stub(fs, "existsSync").returns(true);
      sandbox.stub(fs, "readFileSync").returns("BOT_ID=botId\nAAD_APP_CLIENT_ID=clientId\n");
      sandbox.stub(fs, "writeFileSync");
      sandbox.stub(M365TokenInstance, "getCachedAccountInfo").resolves({ upn: "test.email.com" });
      sandbox
        .stub(M365TokenInstance, "getAccessToken")
        .resolves(
          ok(
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidW5pcXVlX25hbWUiOiJ0ZXN0QG1pY3Jvc29mdC5jb20iLCJpYXQiOjE1MTYyMzkwMjJ9.Rejz-cPndtObAYVa3k3Q7BaltQGXY8KRDxRYKyUoHDw"
          )
        );
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const fakeAxiosInstance = axios.create();
      sandbox.stub(axios, "create").returns(fakeAxiosInstance);
      sandbox.stub(fakeAxiosInstance, "delete").resolves({ data: { status: 204 } });
      const res = await deleteAad();
      chai.assert.isTrue(res);
    });

    it("axios handler error", async () => {
      sandbox.stub(globalVariables, "workspaceUri").value(vscode.Uri.file("path"));
      sandbox.stub(fs, "existsSync").returns(true);
      sandbox.stub(fs, "readFileSync").returns("BOT_ID=botId\n");
      sandbox.stub(fs, "writeFileSync");
      sandbox.stub(M365TokenInstance, "getCachedAccountInfo").resolves({ upn: "test.email.com" });
      sandbox
        .stub(M365TokenInstance, "getAccessToken")
        .resolves(
          ok(
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidW5pcXVlX25hbWUiOiJ0ZXN0QG1pY3Jvc29mdC5jb20iLCJpYXQiOjE1MTYyMzkwMjJ9.Rejz-cPndtObAYVa3k3Q7BaltQGXY8KRDxRYKyUoHDw"
          )
        );
      sandbox.stub(ExtTelemetry, "sendTelemetryEvent");
      sandbox.stub(ExtTelemetry, "sendTelemetryErrorEvent");
      const fakeAxiosInstance = axios.create();
      sandbox.stub(axios, "create").returns(fakeAxiosInstance);
      sandbox.stub(fakeAxiosInstance, "delete").rejects(new Error("error"));
      const res = await deleteAad();
      chai.assert.isTrue(res);
    });
  });
});
