// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { TeamsCollaboration } from "../../../../src/component/driver/teamsApp/collaboration";
import { MockedM365Provider, MockedV2Context } from "../../../plugins/solution/util";
import { AppStudioClient } from "../../../../src/component/driver/teamsApp/clients/appStudioClient";
import axios from "axios";
import { AppUser } from "../../../../src/component/driver/teamsApp/interfaces/appdefinitions/appUser";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("TeamsCollaboration", async () => {
  const context = new MockedV2Context();
  const m365TokenProvider = new MockedM365Provider();
  const teamsCollaboration = new TeamsCollaboration(context, m365TokenProvider);
  const sandbox = sinon.createSandbox();
  const expectedAppId = "00000000-0000-0000-0000-000000000000";
  const expectedUserId = "expectedUserId";
  const expectedUserInfo: AppUser = {
    tenantId: "tenantId",
    aadId: expectedUserId,
    displayName: "displayName",
    userPrincipalName: "userPrincipalName",
    isAdministrator: true,
  };

  afterEach(() => {
    sandbox.restore();
  });

  it("grant permission: should add owner", async () => {
    sandbox.stub(AppStudioClient, "grantPermission").resolves();

    const result = await teamsCollaboration.grantPermission(
      context,
      expectedAppId,
      expectedUserInfo
    );
    expect(result.isOk() && result.value[0].resourceId == expectedAppId).to.be.true;
  });

  it("list collaborator: should return all owners", async () => {
    sandbox.stub(AppStudioClient, "getUserList").resolves([expectedUserInfo]);

    const result = await teamsCollaboration.listCollaborator(context, expectedAppId);
    expect(result.isOk() && result.value[0].resourceId == expectedAppId).to.be.true;
  });

  it("check permission: should return admin if user is teams app owner", async () => {
    sandbox.stub(AppStudioClient, "checkPermission").resolves("Administrator");

    const result = await teamsCollaboration.checkPermission(
      context,
      expectedAppId,
      expectedUserInfo
    );
    expect(result.isOk() && result.value[0].roles![0] == "Administrator").to.be.true;
  });

  it("check permission: should return no permission if user is not aad owner", async () => {
    sandbox.stub(AppStudioClient, "checkPermission").resolves("No permission");

    const result = await teamsCollaboration.checkPermission(
      context,
      expectedAppId,
      expectedUserInfo
    );
    expect(result.isOk() && result.value[0].roles![0] == "No permission").to.be.true;
  });

  it("errors: should return HttpClientError for 4xx errors", async () => {
    sandbox.stub(AppStudioClient, "getUserList").rejects({
      message: "Request failed with status code 404",
      response: {
        status: 400,
        data: {},
      },
    });
    sandbox.stub(axios, "isAxiosError").returns(true);

    const result = await teamsCollaboration.listCollaborator(context, expectedAppId);
    expect(result.isErr() && result.error.name == "HttpClientError").to.be.true;
  });

  it("errors: should return HttpServerError for 5xx errors", async () => {
    sandbox.stub(AppStudioClient, "getUserList").rejects({
      message: "Request failed with status code 500",
      response: {
        status: 500,
        data: {},
      },
    });
    sandbox.stub(axios, "isAxiosError").returns(true);

    const result = await teamsCollaboration.listCollaborator(context, expectedAppId);
    expect(result.isErr() && result.error.name == "HttpServerError").to.be.true;
  });

  it("errors: should return UnhandledError for unknown errors", async () => {
    sandbox.stub(AppStudioClient, "getUserList").rejects({
      message: "Request failed with status code 500",
      response: {
        status: 500,
        data: {},
      },
    });
    sandbox.stub(axios, "isAxiosError").returns(false);

    const result = await teamsCollaboration.listCollaborator(context, expectedAppId);
    expect(result.isErr() && result.error.name == "UnhandledError").to.be.true;
  });
});
