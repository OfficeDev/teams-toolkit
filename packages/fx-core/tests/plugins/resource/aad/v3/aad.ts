// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { assert } from "chai";
import fs from "fs-extra";
import "mocha";
import * as os from "os";
import * as path from "path";
import "reflect-metadata";
import sinon from "sinon";
import {
  checkPermissionRequest,
  createPermissionRequestFile,
  getPermissionRequest,
} from "../../../../../src/plugins/resource/aad/v3";
import { deleteFolder, randomAppName } from "../../core/utils";
describe("AAD resource plugin V3", () => {
  const sandbox = sinon.createSandbox();
  beforeEach(async () => {
    // sandbox
    //   .stub<any, any>(appStudio, "loadManifest")
    //   .callsFake(
    //     async (
    //       ctx: v2.Context,
    //       inputs: v2.InputsWithProjectPath
    //     ): Promise<Result<{ local: TeamsAppManifest; remote: TeamsAppManifest }, FxError>> => {
    //       return ok({ local: new TeamsAppManifest(), remote: new TeamsAppManifest() });
    //     }
    //   );
    // sandbox
    //   .stub<any, any>(appStudio, "saveManifest")
    //   .callsFake(
    //     async (
    //       ctx: v2.Context,
    //       inputs: v2.InputsWithProjectPath,
    //       manifest: { local: TeamsAppManifest; remote: TeamsAppManifest }
    //     ): Promise<Result<any, FxError>> => {
    //       return ok({ local: {}, remote: {} });
    //     }
    //   );
  });
  afterEach(async () => {
    sandbox.restore();
  });
  it("permission request file", async () => {
    const projectPath = path.join(os.tmpdir(), randomAppName());
    fs.ensureDir(projectPath);
    const createRes = await createPermissionRequestFile(projectPath);
    assert.isTrue(createRes.isOk() && createRes.value);
    const checkRes = await checkPermissionRequest(projectPath);
    assert.isTrue(checkRes.isOk() && createRes.isOk() && checkRes.value === createRes.value);
    const getRes = await getPermissionRequest(projectPath);
    assert.isTrue(getRes.isOk() && getRes.value);
    deleteFolder(projectPath);
  });
});
