// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import mockedEnv, { RestoreFn } from "mocked-env";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { UpdateAadAppDriver } from "../../../../src/component/driver/aad/update";
import { MockedLogProvider, MockedM365Provider } from "../../../plugins/solution/util";
import { AadAppClient } from "../../../../src/component/driver/aad/utility/aadAppClient";
import { UserError } from "@microsoft/teamsfx-api";
import path from "path";
import * as fs from "fs-extra";
import { MissingFieldInManifestUserError } from "../../../../src/component/driver/aad/error/invalidFieldInManifestError";
import {
  UnhandledSystemError,
  UnhandledUserError,
} from "../../../../src/component/driver/aad/error/unhandledError";
import { InvalidParameterUserError } from "../../../../src/component/driver/aad/error/invalidParameterUserError";

chai.use(chaiAsPromised);
const expect = chai.expect;

const outputKeys = {
  AAD_APP_OAUTH2_PERMISSION_ID: "AAD_APP_OAUTH2_PERMISSION_ID",
};

const testAssetsRoot = "./tests/component/drivers/aad/testAssets";
const outputRoot = path.join(testAssetsRoot, "output");

describe("aadAppUpdate", async () => {
  const expectedObjectId = "00000000-0000-0000-0000-000000000000";
  const expectedClientId = "00000000-0000-0000-0000-111111111111";
  const expectedPermissionId = "00000000-0000-0000-0000-222222222222";
  const updateAadAppDriver = new UpdateAadAppDriver();
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
    logProvider: new MockedLogProvider(),
  };

  let envRestore: RestoreFn | undefined;

  afterEach(async () => {
    sinon.restore();
    if (envRestore) {
      envRestore();
      envRestore = undefined;
    }
    await fs.remove(outputRoot);
  });

  it("should throw error if argument property is missing", async () => {
    let args: any = {};

    await expect(updateAadAppDriver.run(args, mockedDriverContext))
      .to.be.eventually.rejectedWith(
        "Following parameter is missing or invalid for aadApp/update action: manifestPath, manifestOutputPath."
      )
      .and.is.instanceOf(InvalidParameterUserError);

    args = {
      manifestPath: "./aad.manifest.json",
    };

    await expect(updateAadAppDriver.run(args, mockedDriverContext))
      .to.be.eventually.rejectedWith(
        "Following parameter is missing or invalid for aadApp/update action: manifestOutputPath."
      )
      .and.is.instanceOf(InvalidParameterUserError);

    args = {
      manifestOutputPath: "./build/aad.manifest.dev.json",
    };

    await expect(updateAadAppDriver.run(args, mockedDriverContext))
      .to.be.eventually.rejectedWith(
        "Following parameter is missing or invalid for aadApp/update action: manifestPath."
      )
      .and.is.instanceOf(InvalidParameterUserError);
  });

  it("should throw error if argument property is invalid", async () => {
    let args: any = {
      manifestPath: "",
      manifestOutputPath: "./build/aad.manifest.dev.json",
    };

    await expect(updateAadAppDriver.run(args, mockedDriverContext))
      .to.be.eventually.rejectedWith(
        "Following parameter is missing or invalid for aadApp/update action: manifestPath."
      )
      .and.is.instanceOf(InvalidParameterUserError);

    args = {
      manifestPath: "./aad.manifest.json",
      manifestOutputPath: "",
    };

    await expect(updateAadAppDriver.run(args, mockedDriverContext))
      .to.be.eventually.rejectedWith(
        "Following parameter is missing or invalid for aadApp/update action: manifestOutputPath."
      )
      .and.is.instanceOf(InvalidParameterUserError);

    args = {
      manifestPath: true,
      manifestOutoutPath: true,
    };

    await expect(updateAadAppDriver.run(args, mockedDriverContext))
      .to.be.eventually.rejectedWith(
        "Following parameter is missing or invalid for aadApp/update action: manifestPath, manifestOutputPath."
      )
      .and.is.instanceOf(InvalidParameterUserError);
  });

  it("should success with valid manifest", async () => {
    sinon.stub(AadAppClient.prototype, "updateAadApp").resolves();
    envRestore = mockedEnv({
      AAD_APP_OBJECT_ID: expectedObjectId,
      AAD_APP_CLIENT_ID: expectedClientId,
    });

    const outputPath = path.join(outputRoot, "manifest.output.json");
    const args = {
      manifestPath: path.join(testAssetsRoot, "manifest.json"),
      manifestOutputPath: outputPath,
    };

    const result = await updateAadAppDriver.run(args, mockedDriverContext);

    expect(result.get(outputKeys.AAD_APP_OAUTH2_PERMISSION_ID)).to.be.not.empty;
    expect(result.size).to.equal(1);
    expect(await fs.pathExists(path.join(outputPath))).to.be.true;
    const actualManifest = JSON.parse(await fs.readFile(outputPath, "utf8"));
    expect(actualManifest.id).to.equal(expectedObjectId);
    expect(actualManifest.appId).to.equal(expectedClientId);
    expect(actualManifest.requiredResourceAccess[0].resourceAppId).to.equal(
      "00000003-0000-0000-c000-000000000000"
    ); // Should convert Microsoft Graph to its id
    expect(actualManifest.requiredResourceAccess[0].resourceAccess[0].id).to.equal(
      "e1fe6dd8-ba31-4d61-89e7-88639da4683d"
    ); // Should convert User.Read to its id
    expect(actualManifest.oauth2Permissions[0].id).to.not.equal(
      "${{AAD_APP_OAUTH2_PERMISSION_ID}}"
    ); // Should be replaced with an actual value
  });

  it("should throw error if manifest does not contain id", async () => {
    sinon.stub(AadAppClient.prototype, "updateAadApp").resolves();
    envRestore = mockedEnv({
      AAD_APP_CLIENT_ID: expectedClientId,
    });

    let args = {
      manifestPath: path.join(testAssetsRoot, "manifest.json"),
      manifestOutputPath: path.join(outputRoot, "manifest.output.json"),
    };

    await expect(updateAadAppDriver.run(args, mockedDriverContext))
      .to.be.eventually.rejectedWith("Field id is missing or invalid in AAD app manifest.") // The env does not have AAD_APP_OBJECT_ID so the id value is invalid
      .and.is.instanceOf(MissingFieldInManifestUserError)
      .and.has.property("source", "aadApp/update");

    args = {
      manifestPath: path.join(testAssetsRoot, "manifestWithoutId.json"),
      manifestOutputPath: path.join(outputRoot, "manifest.output.json"),
    };

    await expect(updateAadAppDriver.run(args, mockedDriverContext))
      .to.be.eventually.rejectedWith("Field id is missing or invalid in AAD app manifest.")
      .and.is.instanceOf(MissingFieldInManifestUserError)
      .and.has.property("source", "aadApp/update");
  });

  it("should only call MS Graph API once if manifest does not have preAuthorizedApplications", async () => {
    sinon
      .stub(AadAppClient.prototype, "updateAadApp")
      .onCall(0)
      .resolves()
      .onCall(1)
      .rejects("updateAadApp should not be called twice");

    envRestore = mockedEnv({
      AAD_APP_OBJECT_ID: expectedObjectId,
      AAD_APP_CLIENT_ID: expectedClientId,
    });

    const args = {
      manifestPath: path.join(testAssetsRoot, "manifestWithoutPreAuthorizedApp.json"),
      manifestOutputPath: path.join(outputRoot, "manifest.output.json"),
    };

    await expect(updateAadAppDriver.run(args, mockedDriverContext)).to.not.eventually.be.rejected;
  });

  it("should call MS Graph API twice if manifest has preAuthorizedApplications", async () => {
    let requestCount = 0;
    sinon
      .stub(AadAppClient.prototype, "updateAadApp")
      .onCall(0)
      .callsFake(async (manifest) => {
        requestCount++;
        expect(manifest.preAuthorizedApplications.length).to.equal(0); // should have no preAuthorizedApplication in first request
      })
      .onCall(1)
      .callsFake(async (manifest) => {
        requestCount++;
        expect(manifest.preAuthorizedApplications.length).to.greaterThan(0); // should have preAuthorizedApplication in second request
      });

    envRestore = mockedEnv({
      AAD_APP_OBJECT_ID: expectedObjectId,
      AAD_APP_CLIENT_ID: expectedClientId,
    });

    const args = {
      manifestPath: path.join(testAssetsRoot, "manifest.json"),
      manifestOutputPath: path.join(outputRoot, "manifest.output.json"),
    };

    await updateAadAppDriver.run(args, mockedDriverContext);
    expect(requestCount).to.equal(2); // should call MS Graph API twice
  });

  it("should not generate new permission id if the value already exists", async () => {
    sinon.stub(AadAppClient.prototype, "updateAadApp").resolves();
    envRestore = mockedEnv({
      AAD_APP_OBJECT_ID: expectedObjectId,
      AAD_APP_CLIENT_ID: expectedClientId,
      AAD_APP_OAUTH2_PERMISSION_ID: expectedPermissionId,
    });

    const outputPath = path.join(outputRoot, "manifest.output.json");
    const args = {
      manifestPath: path.join(testAssetsRoot, "manifest.json"),
      manifestOutputPath: outputPath,
    };

    const result = await updateAadAppDriver.run(args, mockedDriverContext);

    const actualManifest = JSON.parse(await fs.readFile(outputPath, "utf8"));

    expect(result.get(outputKeys.AAD_APP_OAUTH2_PERMISSION_ID)).to.equal(expectedPermissionId);
    expect(result.size).to.equal(1);
    expect(actualManifest.oauth2Permissions[0].id).to.equal(expectedPermissionId);
  });

  it("should not generate new permission id if manifest does not need it", async () => {
    sinon.stub(AadAppClient.prototype, "updateAadApp").resolves();
    envRestore = mockedEnv({
      AAD_APP_OBJECT_ID: expectedObjectId,
      AAD_APP_CLIENT_ID: expectedClientId,
      MY_PERMISSION_ID: expectedPermissionId,
    });

    const outputPath = path.join(outputRoot, "manifest.output.json");
    const args = {
      manifestPath: path.join(testAssetsRoot, "manifestWithNoPermissionId.json"),
      manifestOutputPath: outputPath,
    };

    const result = await updateAadAppDriver.run(args, mockedDriverContext);

    const actualManifest = JSON.parse(await fs.readFile(outputPath, "utf8"));
    expect(result.size).to.equal(0);
    expect(actualManifest.oauth2Permissions[0].id).to.equal(expectedPermissionId);
  });

  it("should throw user error when AadAppClient failed with 4xx error", async () => {
    sinon.stub(AadAppClient.prototype, "updateAadApp").rejects({
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          error: {
            code: "Request_BadRequest",
            message:
              "Invalid value specified for property 'displayName' of resource 'Application'.",
          },
        },
      },
    });
    envRestore = mockedEnv({
      AAD_APP_OBJECT_ID: expectedObjectId,
      AAD_APP_CLIENT_ID: expectedClientId,
    });

    const args = {
      manifestPath: path.join(testAssetsRoot, "manifest.json"),
      manifestOutputPath: path.join(outputRoot, "manifest.output.json"),
    };

    await expect(updateAadAppDriver.run(args, mockedDriverContext))
      .to.be.eventually.rejected.and.is.instanceOf(UnhandledUserError)
      .and.property("message")
      .contain("Unhandled error happened in aadApp/update action");
  });

  it("should throw system error when AadAppClient failed with non 4xx error", async () => {
    sinon.stub(AadAppClient.prototype, "updateAadApp").rejects({
      isAxiosError: true,
      response: {
        status: 500,
        data: {
          error: {
            code: "InternalServerError",
            message: "Internal server error",
          },
        },
      },
    });
    envRestore = mockedEnv({
      AAD_APP_OBJECT_ID: expectedObjectId,
      AAD_APP_CLIENT_ID: expectedClientId,
    });

    const args = {
      manifestPath: path.join(testAssetsRoot, "manifest.json"),
      manifestOutputPath: path.join(outputRoot, "manifest.output.json"),
    };

    await expect(updateAadAppDriver.run(args, mockedDriverContext))
      .to.be.eventually.rejected.and.is.instanceOf(UnhandledSystemError)
      .and.property("message")
      .contain("Unhandled error happened in aadApp/update action");
  });
});
