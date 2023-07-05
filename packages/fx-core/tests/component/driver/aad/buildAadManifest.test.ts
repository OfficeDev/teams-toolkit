// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { cwd } from "process";
import { buildAadManifest } from "../../../../src/component/driver/aad/utility/buildAadManifest";
import path from "path";
import * as fs from "fs-extra";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("buildAadManifest", async () => {
  const testAssetsRoot = "./tests/component/driver/aad/testAssets/buildAadManifest";
  const outputRoot = path.join(testAssetsRoot, "output");
  const outputPath = path.join(outputRoot, "manifest.output.json");
  const mockedContext: any = {
    projectPath: cwd(),
  };

  afterEach(async () => {
    await fs.remove(outputRoot);
  });

  it("should success when non-nullable properties all exist", async () => {
    const manifestPath = path.join(testAssetsRoot, "validManifest.json");
    await expect(buildAadManifest(mockedContext, manifestPath, outputPath)).eventually.not.rejected;
  });

  it("should success when some non-nullable properties missing", async () => {
    const manifestPath = path.join(testAssetsRoot, "manifestWithMissingProperties.json");
    await expect(buildAadManifest(mockedContext, manifestPath, outputPath)).to.be.rejectedWith(
      "Field name, oauth2AllowIdTokenImplicitFlow, oauth2AllowImplicitFlow, oauth2Permissions, preAuthorizedApplications, replyUrlsWithType, requiredResourceAccess, signInAudience, tags is missing or invalid in Azure Active Directory app manifest."
    );
  });

  it("should success when some non-nullable properties is null", async () => {
    const manifestPath = path.join(testAssetsRoot, "manifestWithNullProperties.json");
    await expect(buildAadManifest(mockedContext, manifestPath, outputPath)).to.be.rejectedWith(
      "Field addIns, appRoles, name, oauth2AllowIdTokenImplicitFlow, oauth2AllowImplicitFlow, oauth2Permissions, preAuthorizedApplications, replyUrlsWithType, requiredResourceAccess, signInAudience, tags is missing or invalid in Azure Active Directory app manifest"
    );
  });

  it("should test all the non-nullable properties", async () => {
    const manifestPath = path.join(testAssetsRoot, "emptyManifest.json");
    await expect(buildAadManifest(mockedContext, manifestPath, outputPath)).to.be.rejectedWith(
      "Field addIns, appRoles, identifierUris, informationalUrls, keyCredentials, knownClientApplications, name, oauth2AllowIdTokenImplicitFlow, oauth2AllowImplicitFlow, oauth2Permissions, preAuthorizedApplications, replyUrlsWithType, requiredResourceAccess, signInAudience, tags is missing or invalid in Azure Active Directory app manifest."
    );
  });
});
