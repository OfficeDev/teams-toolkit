// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import mockedEnv, { RestoreFn } from "mocked-env";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { UpdateAadAppDriver } from "../../../../src/component/driver/aad/update";
import {
  MockedLogProvider,
  MockedM365Provider,
  MockedTelemetryReporter,
  MockedUserInteraction,
} from "../../../plugins/solution/util";
import { AadAppClient } from "../../../../src/component/driver/aad/utility/aadAppClient";
import path from "path";
import * as fs from "fs-extra";
import { MissingFieldInManifestUserError } from "../../../../src/component/driver/aad/error/invalidFieldInManifestError";
import { cwd } from "process";
import {
  FileNotFoundError,
  HttpClientError,
  HttpServerError,
  InvalidActionInputError,
  JSONSyntaxError,
  MissingEnvironmentVariablesError,
  UnhandledError,
} from "../../../../src/error/common";
import { Platform, ok, err } from "@microsoft/teamsfx-api";
chai.use(chaiAsPromised);
const expect = chai.expect;

const outputKeys = {
  AAD_APP_ACCESS_AS_USER_PERMISSION_ID: "AAD_APP_ACCESS_AS_USER_PERMISSION_ID",
};

const testAssetsRoot = "./tests/component/driver/aad/testAssets";
const outputRoot = path.join(testAssetsRoot, "output");
const promtionOnVSC =
  'Your Microsoft Entra application has been successfully deployed. Click "Learn more" to check how to view your Microsoft Entra application.';

describe("aadAppUpdate", async () => {
  const expectedObjectId = "00000000-0000-0000-0000-000000000000";
  const expectedClientId = "00000000-0000-0000-0000-111111111111";
  const expectedPermissionId = "00000000-0000-0000-0000-222222222222";
  const updateAadAppDriver = new UpdateAadAppDriver();
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
    logProvider: new MockedLogProvider(),
    projectPath: cwd(),
    ui: new MockedUserInteraction(),
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

    let result = await updateAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr()).is.instanceOf(InvalidActionInputError);

    args = {
      manifestPath: "./aad.manifest.json",
    };

    result = await updateAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr()).is.instanceOf(InvalidActionInputError);

    args = {
      outputFilePath: "./build/aad.manifest.dev.json",
    };

    result = await updateAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr()).is.instanceOf(InvalidActionInputError);
  });

  it("should throw error if argument property is invalid", async () => {
    let args: any = {
      manifestTempaltePath: "",
      outputFilePath: "./build/aad.manifest.dev.json",
    };

    let result = await updateAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr()).is.instanceOf(InvalidActionInputError);

    args = {
      manifestPath: "./aad.manifest.json",
      outputFilePath: "",
    };

    result = await updateAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr()).is.instanceOf(InvalidActionInputError);

    args = {
      manifestPath: true,
      outputFilePath: true,
    };

    result = await updateAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr()).is.instanceOf(InvalidActionInputError);
  });

  it("should throw error if manifest file does not exist", async () => {
    const args: any = {
      manifestPath: "invalidpath.json",
      outputFilePath: "./build/aad.manifest.dev.json",
    };

    const result = await updateAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr()).is.instanceOf(FileNotFoundError);
  });

  it("should throw error if manifest file is invalid", async () => {
    const args: any = {
      manifestPath: path.join(testAssetsRoot, "invalidJson.json"),
      outputFilePath: "./build/aad.manifest.dev.json",
    };

    const result = await updateAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr()).is.instanceOf(JSONSyntaxError);
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
      outputFilePath: outputPath,
    };
    const informationSpy = sinon.spy(mockedDriverContext.logProvider, "info");
    const result = await updateAadAppDriver.execute(args, mockedDriverContext);
    chai.assert.isTrue(informationSpy.called);
    chai.assert.equal(informationSpy.getCall(0).args[0], "Executing action aadApp/update");
    const manifestOutputFilePath = path.join(
      mockedDriverContext.projectPath,
      outputRoot,
      "manifest.output.json"
    );
    const manifestPath = path.join(testAssetsRoot, "manifest.json");
    chai.assert.equal(
      informationSpy.getCall(1).args[0],
      `Build Microsoft Entra app manifest completed, and app manifest content is written to ${manifestOutputFilePath}`
    );
    chai.assert.equal(
      informationSpy.getCall(2).args[0],
      `Applied manifest ${manifestPath} to Microsoft Entra application with object id 00000000-0000-0000-0000-000000000000`
    );
    chai.assert.equal(
      informationSpy.getCall(3).args[0],
      `Action aadApp/update executed successfully`
    );
    expect(result.result.isOk()).to.be.true;
    expect(result.result._unsafeUnwrap().get(outputKeys.AAD_APP_ACCESS_AS_USER_PERMISSION_ID)).to.be
      .not.empty;
    expect(result.result._unsafeUnwrap().size).to.equal(1);
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
      "${{AAD_APP_ACCESS_AS_USER_PERMISSION_ID}}"
    ); // Should be replaced with an actual value
    expect(result.summaries.length).to.equal(1);
    console.log(result.summaries[0]);
    expect(result.summaries).includes(
      `Applied manifest ${args.manifestPath} to Microsoft Entra application with object id ${expectedObjectId}`
    );
  });
  it("should success with valid manifest on cli", async () => {
    sinon.stub(AadAppClient.prototype, "updateAadApp").resolves();
    envRestore = mockedEnv({
      AAD_APP_OBJECT_ID: expectedObjectId,
      AAD_APP_CLIENT_ID: expectedClientId,
    });

    const outputPath = path.join(outputRoot, "manifest.output.json");
    const args = {
      manifestPath: path.join(testAssetsRoot, "manifest.json"),
      outputFilePath: outputPath,
    };
    mockedDriverContext.platform = Platform.CLI;
    const result = await updateAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isOk()).to.be.true;
  });
  it("should success while context ui not support on cli", async () => {
    sinon.stub(AadAppClient.prototype, "updateAadApp").resolves();
    envRestore = mockedEnv({
      AAD_APP_OBJECT_ID: expectedObjectId,
      AAD_APP_CLIENT_ID: expectedClientId,
    });

    const outputPath = path.join(outputRoot, "manifest.output.json");
    const args = {
      manifestPath: path.join(testAssetsRoot, "manifest.json"),
      outputFilePath: outputPath,
    };
    delete mockedDriverContext.ui;
    mockedDriverContext.platform = Platform.CLI;
    const result = await updateAadAppDriver.execute(args, mockedDriverContext);
    expect(result.result.isOk()).to.be.true;
  });

  it("should use absolute path in args directly", async () => {
    const outputPath = path.join(cwd(), outputRoot, "manifest.output.json");
    const manifestPath = path.join(cwd(), testAssetsRoot, "manifest.json");
    process.chdir("tests"); // change cwd for test
    try {
      sinon.stub(AadAppClient.prototype, "updateAadApp").resolves();
      envRestore = mockedEnv({
        AAD_APP_OBJECT_ID: expectedObjectId,
        AAD_APP_CLIENT_ID: expectedClientId,
      });

      const args = {
        manifestPath: manifestPath,
        outputFilePath: outputPath,
      };

      const result = await updateAadAppDriver.execute(args, mockedDriverContext);

      expect(result.result.isOk()).to.be.true;
    } finally {
      process.chdir(".."); // restore cwd
    }
  });

  it("should add project path to relative path in args", async () => {
    process.chdir("tests"); // change cwd for test
    try {
      sinon.stub(AadAppClient.prototype, "updateAadApp").resolves();
      envRestore = mockedEnv({
        AAD_APP_OBJECT_ID: expectedObjectId,
        AAD_APP_CLIENT_ID: expectedClientId,
      });

      const args = {
        manifestPath: path.join(testAssetsRoot, "manifest.json"),
        outputFilePath: path.join(outputRoot, "manifest.output.json"),
      };

      const result = await updateAadAppDriver.execute(args, mockedDriverContext);

      expect(result.result.isOk()).to.be.true;
    } finally {
      process.chdir(".."); // restore cwd
    }
  });

  it("should throw error if manifest does not contain id", async () => {
    sinon.stub(AadAppClient.prototype, "updateAadApp").resolves();
    envRestore = mockedEnv({
      AAD_APP_CLIENT_ID: expectedClientId,
    });

    let args = {
      manifestPath: path.join(testAssetsRoot, "manifest.json"),
      outputFilePath: path.join(outputRoot, "manifest.output.json"),
    };

    let result = await updateAadAppDriver.execute(args, mockedDriverContext);

    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr()).is.instanceOf(MissingEnvironmentVariablesError);

    args = {
      manifestPath: path.join(testAssetsRoot, "manifestWithoutId.json"),
      outputFilePath: path.join(outputRoot, "manifest.output.json"),
    };

    result = await updateAadAppDriver.execute(args, mockedDriverContext);

    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr())
      .is.instanceOf(MissingFieldInManifestUserError)
      .and.include({
        message: "Field id is missing or invalid in Microsoft Entra app manifest.", // The manifest does not has an id property
        source: "aadApp/update",
      });
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
      outputFilePath: path.join(outputRoot, "manifest.output.json"),
    };

    const result = await updateAadAppDriver.execute(args, mockedDriverContext);

    expect(result.result.isOk()).to.be.true;
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
      outputFilePath: path.join(outputRoot, "manifest.output.json"),
    };

    const result = await updateAadAppDriver.execute(args, mockedDriverContext);

    expect(result.result.isOk()).to.be.true;
    expect(requestCount).to.equal(2); // should call MS Graph API twice
  });

  it("should not generate new permission id if the value already exists", async () => {
    sinon.stub(AadAppClient.prototype, "updateAadApp").resolves();
    envRestore = mockedEnv({
      AAD_APP_OBJECT_ID: expectedObjectId,
      AAD_APP_CLIENT_ID: expectedClientId,
      AAD_APP_ACCESS_AS_USER_PERMISSION_ID: expectedPermissionId,
    });

    const outputPath = path.join(outputRoot, "manifest.output.json");
    const args = {
      manifestPath: path.join(testAssetsRoot, "manifest.json"),
      outputFilePath: outputPath,
    };

    const result = await updateAadAppDriver.execute(args, mockedDriverContext);

    const actualManifest = JSON.parse(await fs.readFile(outputPath, "utf8"));

    expect(result.result.isOk()).to.be.true;
    expect(
      result.result._unsafeUnwrap().get(outputKeys.AAD_APP_ACCESS_AS_USER_PERMISSION_ID)
    ).to.equal(expectedPermissionId);
    expect(result.result._unsafeUnwrap().size).to.equal(1);
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
      outputFilePath: outputPath,
    };

    const result = await updateAadAppDriver.execute(args, mockedDriverContext);

    const actualManifest = JSON.parse(await fs.readFile(outputPath, "utf8"));

    expect(result.result.isOk()).to.be.true;
    expect(result.result._unsafeUnwrap().size).to.equal(0);
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
      outputFilePath: path.join(outputRoot, "manifest.output.json"),
    };

    const result = await updateAadAppDriver.execute(args, mockedDriverContext);

    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr())
      .is.instanceOf(HttpClientError)
      .and.property("message")
      .equals(
        'A http client error happened while performing the aadApp/update task. The error response is: {"error":{"code":"Request_BadRequest","message":"Invalid value specified for property \'displayName\' of resource \'Application\'."}}'
      );
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
      outputFilePath: path.join(outputRoot, "manifest.output.json"),
    };

    const result = await updateAadAppDriver.execute(args, mockedDriverContext);

    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr())
      .is.instanceOf(HttpServerError)
      .and.property("message")
      .equals(
        'A http server error happened while performing the aadApp/update task. Please try again later. The error response is: {"error":{"code":"InternalServerError","message":"Internal server error"}}'
      );
  });

  it("should throw unhandled error when axios error contains no response", async () => {
    sinon.stub(AadAppClient.prototype, "updateAadApp").rejects({
      isAxiosError: true,
    });
    envRestore = mockedEnv({
      AAD_APP_OBJECT_ID: expectedObjectId,
      AAD_APP_CLIENT_ID: expectedClientId,
    });

    const args = {
      manifestPath: path.join(testAssetsRoot, "manifest.json"),
      outputFilePath: path.join(outputRoot, "manifest.output.json"),
    };

    const result = await updateAadAppDriver.execute(args, mockedDriverContext);

    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr())
      .is.instanceOf(UnhandledError)
      .and.property("message")
      .equals(
        'An unexpected error has occurred while performing the aadAppUpdate task. {"isAxiosError":true}'
      );
  });

  it("should send telemetries when success", async () => {
    const mockedTelemetryReporter = new MockedTelemetryReporter();
    let startTelemetry: any, endTelemetry: any;

    sinon.stub(AadAppClient.prototype, "updateAadApp").resolves();
    envRestore = mockedEnv({
      AAD_APP_OBJECT_ID: expectedObjectId,
      AAD_APP_CLIENT_ID: expectedClientId,
    });

    sinon
      .stub(mockedTelemetryReporter, "sendTelemetryEvent")
      .onFirstCall()
      .callsFake((eventName, properties, measurements) => {
        startTelemetry = {
          eventName,
          properties,
          measurements,
        };
      })
      .onSecondCall()
      .callsFake((eventName, properties, measurements) => {
        endTelemetry = {
          eventName,
          properties,
          measurements,
        };
      });

    const outputPath = path.join(outputRoot, "manifest.output.json");
    const args = {
      manifestPath: path.join(testAssetsRoot, "manifest.json"),
      outputFilePath: outputPath,
    };
    const dirverContext: any = {
      m365TokenProvider: new MockedM365Provider(),
      logProvider: new MockedLogProvider(),
      telemetryReporter: mockedTelemetryReporter,
      projectPath: cwd(),
    };

    const result = await updateAadAppDriver.execute(args, dirverContext);

    expect(result.result.isOk()).to.be.true;
    expect(startTelemetry.eventName).to.equal("aadApp/update-start");
    expect(startTelemetry.properties.component).to.equal("aadAppupdate");
    expect(endTelemetry.eventName).to.equal("aadApp/update");
    expect(endTelemetry.properties.component).to.equal("aadAppupdate");
    expect(endTelemetry.properties.success).to.equal("yes");
  });

  it("should send error telemetries when fail", async () => {
    const mockedTelemetryReporter = new MockedTelemetryReporter();
    let startTelemetry: any, endTelemetry: any;

    sinon
      .stub(mockedTelemetryReporter, "sendTelemetryEvent")
      .onFirstCall()
      .callsFake((eventName, properties, measurements) => {
        startTelemetry = {
          eventName,
          properties,
          measurements,
        };
      });

    sinon
      .stub(mockedTelemetryReporter, "sendTelemetryErrorEvent")
      .onFirstCall()
      .callsFake((eventName, properties, measurements) => {
        endTelemetry = {
          eventName,
          properties,
          measurements,
        };
      });

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
      outputFilePath: path.join(outputRoot, "manifest.output.json"),
    };
    const dirverContext: any = {
      m365TokenProvider: new MockedM365Provider(),
      logProvider: new MockedLogProvider(),
      telemetryReporter: mockedTelemetryReporter,
      projectPath: cwd(),
    };

    const result = await updateAadAppDriver.execute(args, dirverContext);

    expect(result.result.isOk()).to.be.false;
    expect(startTelemetry.eventName).to.equal("aadApp/update-start");
    expect(startTelemetry.properties.component).to.equal("aadAppupdate");
    expect(endTelemetry.eventName).to.equal("aadApp/update");
    expect(endTelemetry.properties.component).to.equal("aadAppupdate");
    expect(endTelemetry.properties.success).to.equal("no");
    expect(endTelemetry.properties["error-code"]).to.equal("aadAppUpdate.HttpServerError");
    expect(endTelemetry.properties["error-type"]).to.equal("system");
    // expect(endTelemetry.properties["error-message"]).to.equal(
    //   'A http server error happened while performing the aadApp/update task. Please try again later. The error response is: {"error":{"code":"InternalServerError","message":"Internal server error"}}'
    // );
  });

  it("should throw error when missing required environment variable in manifest", async () => {
    sinon.stub(AadAppClient.prototype, "updateAadApp").resolves();
    envRestore = mockedEnv({
      AAD_APP_OBJECT_ID: expectedObjectId,
      AAD_APP_CLIENT_ID: expectedClientId,
    });

    const args = {
      manifestPath: path.join(testAssetsRoot, "manifestWithMissingEnv.json"),
      outputFilePath: path.join(outputRoot, "manifest.output.json"),
    };

    const result = await updateAadAppDriver.execute(args, mockedDriverContext);

    expect(result.result.isErr()).to.be.true;
    expect(result.result._unsafeUnwrapErr()).is.instanceOf(MissingEnvironmentVariablesError);
  });
});
