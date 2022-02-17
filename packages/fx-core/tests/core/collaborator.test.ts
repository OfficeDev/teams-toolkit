// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  Platform,
  ProjectSettings,
  TokenProvider,
  v2,
  v3,
  UserError,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import os from "os";
import * as path from "path";
import sinon from "sinon";
import * as uuid from "uuid";
import { CollaborationState, SolutionError } from "../../src";
import { checkPermission, listCollaborator } from "../../src/core/collaborator";
import { AppStudioPluginV3 } from "../../src/plugins/resource/appstudio/v3";
import { CollaborationUtil } from "../../src/plugins/solution/fx-solution/v2/collaborationUtil";
import {
  BuiltInFeaturePluginNames,
  BuiltInSolutionNames,
} from "../../src/plugins/solution/fx-solution/v3/constants";
import {
  MockedAppStudioTokenProvider,
  MockedAzureAccountProvider,
  MockedGraphTokenProvider,
  MockedSharepointProvider,
  MockedV2Context,
} from "../plugins/solution/util";
import { randomAppName } from "./utils";
import { Container } from "typedi";
import { AadAppForTeamsPluginV3 } from "../../src/plugins/resource/aad/v3";
describe("Collaborator APIs for V3", () => {
  const sandbox = sinon.createSandbox();
  const projectSettings: ProjectSettings = {
    appName: "my app",
    projectId: uuid.v4(),
    solutionSettings: {
      name: BuiltInSolutionNames.azure,
      version: "3.0.0",
      capabilities: ["Tab"],
      hostType: "Azure",
      azureResources: [],
      activeResourcePlugins: [],
    },
  };
  const ctx = new MockedV2Context(projectSettings);
  const inputs: v2.InputsWithProjectPath = {
    platform: Platform.VSCode,
    projectPath: path.join(os.tmpdir(), randomAppName()),
  };
  const tokenProvider: TokenProvider = {
    azureAccountProvider: new MockedAzureAccountProvider(),
    appStudioToken: new MockedAppStudioTokenProvider(),
    graphTokenProvider: new MockedGraphTokenProvider(),
    sharepointTokenProvider: new MockedSharepointProvider(),
  };
  beforeEach(() => {});
  afterEach(() => {
    sandbox.restore();
  });
  describe("listCollaborator", () => {
    it("should return NotProvisioned state if Teamsfx project hasn't been provisioned", async () => {
      sandbox.stub(CollaborationUtil, "getUserInfo").resolves({
        tenantId: "fake_tid",
        aadId: "fake_oid",
        userPrincipalName: "fake_unique_name",
        displayName: "displayName",
        isAdministrator: true,
      });
      const envInfo: v3.EnvInfoV3 = {
        envName: "dev",
        state: { solution: {} },
        config: {},
      };
      const result = await listCollaborator(ctx, inputs, envInfo, tokenProvider);
      if (result.isErr()) {
        console.log(`!!! ${result.error.name}: ${result.error.message}`);
      }
      assert.isTrue(result.isOk());
      if (result.isOk()) {
        assert.equal(result.value.state, CollaborationState.NotProvisioned);
      }
    });
    it("should return error if cannot get user info", async () => {
      const envInfo: v3.EnvInfoV3 = {
        envName: "dev",
        state: { solution: { provisionSucceeded: true } },
        config: {},
      };
      sandbox.stub(tokenProvider.graphTokenProvider, "getJsonObject").resolves(undefined);
      const result = await listCollaborator(ctx, inputs, envInfo, tokenProvider);
      assert.isTrue(result.isErr() && result.error.name === SolutionError.FailedToRetrieveUserInfo);
    });

    it("should return M365TenantNotMatch state if tenant is not match", async () => {
      sandbox.stub(tokenProvider.graphTokenProvider, "getJsonObject").resolves({
        tid: "fake_tid",
        oid: "fake_oid",
        unique_name: "fake_unique_name",
        name: "fake_name",
      });
      const envInfo: v3.EnvInfoV3 = {
        envName: "dev",
        state: {
          solution: { provisionSucceeded: true },
          "fx-resource-appstudio": { tenantId: "mock_project_tenant_id" },
        },
        config: {},
      };
      const result = await listCollaborator(ctx, inputs, envInfo, tokenProvider);
      assert.isTrue(result.isOk() && result.value.state === CollaborationState.M365TenantNotMatch);
    });

    it("should return error if list collaborator failed", async () => {
      sandbox.stub(tokenProvider.graphTokenProvider, "getJsonObject").resolves({
        tid: "mock_project_tenant_id",
        oid: "fake_oid",
        unique_name: "fake_unique_name",
        name: "fake_name",
      });
      const appStudio = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
      sandbox
        .stub(appStudio, "listCollaborator")
        .resolves(
          err(
            new UserError(
              SolutionError.FailedToListCollaborator,
              "List collaborator failed.",
              "AppStudioPlugin"
            )
          )
        );
      const envInfo: v3.EnvInfoV3 = {
        envName: "dev",
        state: {
          solution: { provisionSucceeded: true },
          "fx-resource-appstudio": { tenantId: "mock_project_tenant_id" },
        },
        config: {},
      };

      const result = await listCollaborator(ctx, inputs, envInfo, tokenProvider);
      assert.isTrue(result.isErr() && result.error.name === SolutionError.FailedToListCollaborator);
    });

    it("happy path", async () => {
      ctx.projectSetting.solutionSettings!.activeResourcePlugins = [
        "fx-resource-frontend-hosting",
        "fx-resource-identity",
        "fx-resource-aad-app-for-teams",
      ];

      const envInfo: v3.EnvInfoV3 = {
        envName: "dev",
        state: {
          solution: { provisionSucceeded: true },
          "fx-resource-appstudio": { tenantId: "mock_project_tenant_id" },
        },
        config: {},
      };

      sandbox.stub(tokenProvider.graphTokenProvider, "getJsonObject").resolves({
        tid: "mock_project_tenant_id",
        oid: "fake_oid",
        unique_name: "fake_unique_name",
        name: "fake_name",
      });
      const appStudio = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
      const aadPlugin = Container.get<AadAppForTeamsPluginV3>(BuiltInFeaturePluginNames.aad);
      sandbox.stub(appStudio, "listCollaborator").resolves(
        ok([
          {
            userObjectId: "fake-aad-user-object-id",
            resourceId: "fake-resource-id",
            displayName: "fake-display-name",
            userPrincipalName: "fake-user-principal-name",
          },
        ])
      );
      sandbox.stub(aadPlugin, "listCollaborator").resolves(
        ok([
          {
            userObjectId: "fake-aad-user-object-id",
            resourceId: "fake-resource-id",
            displayName: "fake-display-name",
            userPrincipalName: "fake-user-principal-name",
          },
        ])
      );
      const result = await listCollaborator(ctx, inputs, envInfo, tokenProvider);
      assert.isTrue(result.isOk() && result.value.collaborators!.length === 1);
    });

    it("happy path without aad", async () => {
      ctx.projectSetting.solutionSettings!.activeResourcePlugins = [
        "fx-resource-frontend-hosting",
        "fx-resource-identity",
      ];

      const envInfo: v3.EnvInfoV3 = {
        envName: "dev",
        state: {
          solution: { provisionSucceeded: true },
          "fx-resource-appstudio": { tenantId: "mock_project_tenant_id" },
        },
        config: {},
      };

      sandbox.stub(tokenProvider.graphTokenProvider, "getJsonObject").resolves({
        tid: "mock_project_tenant_id",
        oid: "fake_oid",
        unique_name: "fake_unique_name",
        name: "fake_name",
      });
      const appStudio = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
      sandbox.stub(appStudio, "listCollaborator").resolves(
        ok([
          {
            userObjectId: "fake-aad-user-object-id",
            resourceId: "fake-resource-id",
            displayName: "fake-display-name",
            userPrincipalName: "fake-user-principal-name",
          },
        ])
      );
      const result = await listCollaborator(ctx, inputs, envInfo, tokenProvider);
      assert.isTrue(result.isOk() && result.value.collaborators!.length === 1);
    });
  });

  describe("checkPermission", () => {
    it("should return NotProvisioned state if Teamsfx project hasn't been provisioned", async () => {
      sandbox.stub(CollaborationUtil, "getUserInfo").resolves({
        tenantId: "fake_tid",
        aadId: "fake_oid",
        userPrincipalName: "fake_unique_name",
        displayName: "displayName",
        isAdministrator: true,
      });
      const envInfo: v3.EnvInfoV3 = {
        envName: "dev",
        state: { solution: {} },
        config: {},
      };
      const result = await checkPermission(ctx, inputs, envInfo, tokenProvider);
      assert.isTrue(result.isOk() && result.value.state === CollaborationState.NotProvisioned);
    });

    it("should return error if cannot get user info", async () => {
      const envInfo: v3.EnvInfoV3 = {
        envName: "dev",
        state: { solution: { provisionSucceeded: true } },
        config: {},
      };
      sandbox.stub(tokenProvider.graphTokenProvider, "getJsonObject").resolves(undefined);
      const result = await checkPermission(ctx, inputs, envInfo, tokenProvider);
      assert.isTrue(result.isErr() && result.error.name === SolutionError.FailedToRetrieveUserInfo);
    });

    it("should return M365TenantNotMatch state if tenant is not match", async () => {
      sandbox.stub(tokenProvider.graphTokenProvider, "getJsonObject").resolves({
        tid: "fake_tid",
        oid: "fake_oid",
        unique_name: "fake_unique_name",
        name: "fake_name",
      });
      const envInfo: v3.EnvInfoV3 = {
        envName: "dev",
        state: {
          solution: { provisionSucceeded: true },
          "fx-resource-appstudio": { tenantId: "mock_project_tenant_id" },
        },
        config: {},
      };
      const result = await checkPermission(ctx, inputs, envInfo, tokenProvider);
      assert.isTrue(result.isOk() && result.value.state === CollaborationState.M365TenantNotMatch);
    });

    it("should return error if check permission failed", async () => {
      sandbox.stub(tokenProvider.graphTokenProvider, "getJsonObject").resolves({
        tid: "mock_project_tenant_id",
        oid: "fake_oid",
        unique_name: "fake_unique_name",
        name: "fake_name",
      });
      const appStudio = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
      sandbox
        .stub(appStudio, "checkPermission")
        .resolves(
          err(
            new UserError(
              SolutionError.FailedToCheckPermission,
              "List collaborator failed.",
              "AppStudioPlugin"
            )
          )
        );
      const envInfo: v3.EnvInfoV3 = {
        envName: "dev",
        state: {
          solution: { provisionSucceeded: true },
          "fx-resource-appstudio": { tenantId: "mock_project_tenant_id" },
        },
        config: {},
      };
      const result = await checkPermission(ctx, inputs, envInfo, tokenProvider);
      assert.isTrue(result.isErr() && result.error.name === SolutionError.FailedToCheckPermission);
    });
    it("happy path", async () => {
      ctx.projectSetting.solutionSettings!.activeResourcePlugins = [
        "fx-resource-frontend-hosting",
        "fx-resource-identity",
        "fx-resource-aad-app-for-teams",
      ];

      const envInfo: v3.EnvInfoV3 = {
        envName: "dev",
        state: {
          solution: { provisionSucceeded: true },
          "fx-resource-appstudio": { tenantId: "mock_project_tenant_id" },
        },
        config: {},
      };

      sandbox.stub(tokenProvider.graphTokenProvider, "getJsonObject").resolves({
        tid: "mock_project_tenant_id",
        oid: "fake_oid",
        unique_name: "fake_unique_name",
        name: "fake_name",
      });
      const appStudio = Container.get<AppStudioPluginV3>(BuiltInFeaturePluginNames.appStudio);
      const aadPlugin = Container.get<AadAppForTeamsPluginV3>(BuiltInFeaturePluginNames.aad);
      sandbox.stub(appStudio, "checkPermission").resolves(
        ok([
          {
            name: "teams_app",
            resourceId: "fake_teams_app_resource_id",
            roles: ["Administrator"],
            type: "M365",
          },
        ])
      );
      sandbox.stub(aadPlugin, "checkPermission").resolves(
        ok([
          {
            name: "aad_app",
            resourceId: "fake_aad_app_resource_id",
            roles: ["Owner"],
            type: "M365",
          },
        ])
      );
      const result = await checkPermission(ctx, inputs, envInfo, tokenProvider);
      assert.isTrue(result.isOk() && result.value.permissions!.length === 2);
    });
  });
});
