// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import sinon from "sinon";
import * as chai from "chai";
import * as Utils from "../../../../../src/component/resource/spfx/utils/utils";
import { InputsWithProjectPath, ok, Platform, ResourceContextV3 } from "@microsoft/teamsfx-api";
import { SPOClient } from "../../../../../src/component/resource/spfx/spoClient";
import * as tools from "../../../../../src/common/tools";
import { SpfxResource } from "../../../../../src/component/resource/spfx";
import { createContextV3 } from "../../../../../src/component/utils";
import { newEnvInfoV3 } from "../../../../../src/core/environment";
import { MockTools } from "../../../../core/utils";
import { setTools } from "../../../../../src/core/globalVars";
import * as path from "path";
import { mockM365TokenProvider, MockUserInteraction } from "../helper";

describe("SPFxDeploy", function () {
  let component: SpfxResource;
  let context: ResourceContextV3;
  const sandbox = sinon.createSandbox();
  const inputs: InputsWithProjectPath = {
    platform: Platform.VSCode,
    projectPath: path.resolve("./tests/plugins/resource/spfx/resources/"),
  };
  beforeEach(async () => {
    component = new SpfxResource();
    const gtools = new MockTools();
    gtools.tokenProvider.m365TokenProvider = mockM365TokenProvider();
    setTools(gtools);
    context = createContextV3() as ResourceContextV3;
    context.envInfo = newEnvInfoV3();
    context.tokenProvider = gtools.tokenProvider;
    sandbox.stub(SpfxResource.prototype, "buildSPPackage" as any).returns(ok(undefined));
    sandbox.stub(SpfxResource.prototype, "getTenant" as any).returns(ok("TENANT_URL"));
    sandbox.stub(tools, "getSPFxTenant").returns(Promise.resolve("tenant"));
    sandbox.stub(tools, "getSPFxToken").returns(Promise.resolve("fakeToken"));
  });

  afterEach(() => {
    sandbox.restore();
  });
  it("deploy successfully", async function () {
    sandbox.stub(SPOClient, "getAppCatalogSite").resolves("APP_CATALOG");
    sandbox.stub(SPOClient, "uploadAppPackage").resolves();
    sandbox.stub(SPOClient, "deployAppPackage").resolves();
    const result = await component.deploy(context, inputs);
    chai.assert.isTrue(result.isOk());
  });

  it("deploy failed with insufficient permission", async function () {
    sandbox.stub(SPOClient, "getAppCatalogSite").resolves("APP_CATALOG");
    const error = {
      response: {
        status: 403,
      },
    };
    sandbox.stub(SPOClient, "uploadAppPackage").throws(error);
    const result = await component.deploy(context, inputs);
    chai.assert.isTrue(result.isErr());
  });

  it("create app catalog failed", async function () {
    sandbox.stub(SPOClient, "getAppCatalogSite").resolves(undefined);
    sandbox.stub(SPOClient, "createAppCatalog").resolves();
    sandbox.stub(Utils, "sleep" as any).resolves();
    context.userInteraction = new MockUserInteraction();
    const result = await component.deploy(context, inputs);
    chai.assert.isTrue(result.isErr());
  });
});
