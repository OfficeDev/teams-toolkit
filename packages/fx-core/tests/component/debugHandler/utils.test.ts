// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";

import * as chai from "chai";
import * as path from "path";
import * as sinon from "sinon";

import { ok, err, ProjectSettingsV3, SystemError, Void, v3 } from "@microsoft/teamsfx-api";

import { MockM365TokenProvider } from "./utils";
import { MockLogProvider, MockTelemetryReporter, MockUserInteraction } from "../../core/utils";
import { LocalCrypto } from "../../../src/core/crypto";
import * as utils from "../../../src/component/provisionUtils";
import { checkM365Tenant } from "../../../src/component/debugHandler/utils";
import { environmentManager } from "../../../src/core/environment";
import { ComponentNames } from "../../../src/component/constants";

describe("utils", () => {
  afterEach(() => {
    sinon.restore();
  });

  describe("checkM365Tenant", () => {
    const projectPath = path.resolve(__dirname, "data");
    const tenantId = "11111111-1111-1111-1111-111111111111";
    const m365TokenProvider = new MockM365TokenProvider(tenantId);
    const logger = new MockLogProvider();
    const telemetry = new MockTelemetryReporter();
    const ui = new MockUserInteraction();
    const cryptoProvider = new LocalCrypto("11111111-1111-1111-1111-111111111111");

    it("happy path", async () => {
      const projectSettingsV3: ProjectSettingsV3 = {
        appName: "unit-test",
        projectId: "11111111-1111-1111-1111-111111111111",
        programmingLanguage: "javescript",
        components: [],
      };
      const envInfoV3: v3.EnvInfoV3 = {
        envName: environmentManager.getLocalEnvName(),
        config: {},
        state: {
          solution: {},
          [ComponentNames.AppManifest]: {
            tenantId,
          },
        },
      };
      sinon
        .stub(utils, "checkWhetherLocalDebugM365TenantMatches")
        .returns(Promise.resolve(ok(Void)));
      const result = await checkM365Tenant(
        projectPath,
        projectSettingsV3,
        envInfoV3,
        m365TokenProvider,
        logger,
        telemetry,
        ui,
        cryptoProvider
      );
      chai.assert(result.isOk());
      sinon.restore();
    });

    it("failed", async () => {
      const projectSettingsV3: ProjectSettingsV3 = {
        appName: "unit-test",
        projectId: "11111111-1111-1111-1111-111111111111",
        programmingLanguage: "javescript",
        components: [],
      };
      const envInfoV3: v3.EnvInfoV3 = {
        envName: environmentManager.getLocalEnvName(),
        config: {},
        state: {
          solution: {},
          [ComponentNames.AppManifest]: {
            tenantId,
          },
        },
      };
      const error = new SystemError(
        "solution",
        "checkWhetherLocalDebugM365TenantMatchesFailed",
        "checkWhetherLocalDebugM365TenantMatches failed"
      );
      sinon
        .stub(utils, "checkWhetherLocalDebugM365TenantMatches")
        .returns(Promise.resolve(err(error)));
      const result = await checkM365Tenant(
        projectPath,
        projectSettingsV3,
        envInfoV3,
        m365TokenProvider,
        logger,
        telemetry,
        ui,
        cryptoProvider
      );
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert(result.error instanceof SystemError);
        chai.assert.deepEqual(result.error.name, error.name);
      }
      sinon.restore();
    });
  });
});
