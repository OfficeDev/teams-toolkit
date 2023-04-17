import { ResourceGroup, ResourceManagementClient } from "@azure/arm-resources";
import { ok } from "@microsoft/teamsfx-api";
import { assert } from "chai";
import "mocha";
import * as sinon from "sinon";
import { resourceGroupHelper } from "../../src/component/utils/ResourceGroupHelper";
import { setTools, TOOLS } from "../../src/core/globalVars";
import { MockTools } from "../core/utils";
import { MyTokenCredential } from "../plugins/solution/util";
import * as armResources from "@azure/arm-resources";
import {
  CheckResourceGroupExistenceError,
  CreateResourceGroupError,
  GetResourceGroupError,
  ListResourceGroupsError,
} from "../../src/error/azure";

describe("resouce group helper test", () => {
  const sandbox = sinon.createSandbox();
  const tools = new MockTools();
  setTools(tools);
  afterEach(() => {
    sandbox.restore();
  });
  it("askResourceGroupInfoV3", async () => {
    sandbox.stub(resourceGroupHelper, "listResourceGroups").resolves(ok([["rg1", "loc1"]]));
    sandbox.stub(resourceGroupHelper, "getLocations").resolves(ok(["loc1"]));
    sandbox.stub(TOOLS.ui, "selectOption").resolves(ok({ type: "success", result: "rg1" }));
    const mockResourceManagementClient = new ResourceManagementClient(
      new MyTokenCredential(),
      "id"
    );
    const res = await resourceGroupHelper.askResourceGroupInfoV3(
      tools.tokenProvider.azureAccountProvider,
      mockResourceManagementClient,
      "rg1"
    );
    if (res.isErr()) {
      console.error(res.error);
    }
    assert.isTrue(res.isOk());
  });

  it("createResourceGroup return undefined", async () => {
    const mockResourceManagementClient = new ResourceManagementClient(
      new MyTokenCredential(),
      "id"
    );
    sandbox.stub(armResources, "ResourceManagementClient").returns(mockResourceManagementClient);
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());
    sandbox.stub(resourceGroupHelper, "checkResourceGroupExistence").resolves(ok(false));
    sandbox
      .stub(mockResourceManagementClient.resourceGroups, "createOrUpdate")
      .resolves({ name: undefined, location: "east us" });
    const res = await resourceGroupHelper.createNewResourceGroup(
      "mockRG",
      tools.tokenProvider.azureAccountProvider,
      "mockSubId",
      "east us"
    );
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.isTrue(res.error instanceof CreateResourceGroupError);
    }
  });

  it("createResourceGroup throw error", async () => {
    const mockResourceManagementClient = new ResourceManagementClient(
      new MyTokenCredential(),
      "id"
    );
    sandbox.stub(armResources, "ResourceManagementClient").returns(mockResourceManagementClient);
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());
    sandbox.stub(resourceGroupHelper, "checkResourceGroupExistence").resolves(ok(false));
    sandbox
      .stub(mockResourceManagementClient.resourceGroups, "createOrUpdate")
      .rejects(new Error("test"));
    const res = await resourceGroupHelper.createNewResourceGroup(
      "mockRG",
      tools.tokenProvider.azureAccountProvider,
      "mockSubId",
      "east us"
    );
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.isTrue(res.error instanceof CreateResourceGroupError);
    }
  });

  it("createResourceGroup success", async () => {
    const mockResourceManagementClient = new ResourceManagementClient(
      new MyTokenCredential(),
      "id"
    );
    sandbox.stub(armResources, "ResourceManagementClient").returns(mockResourceManagementClient);
    sandbox
      .stub(tools.tokenProvider.azureAccountProvider, "getIdentityCredentialAsync")
      .resolves(new MyTokenCredential());
    sandbox.stub(resourceGroupHelper, "checkResourceGroupExistence").resolves(ok(false));
    sandbox
      .stub(mockResourceManagementClient.resourceGroups, "createOrUpdate")
      .resolves({ name: "mockRg", location: "east us" });
    const res = await resourceGroupHelper.createNewResourceGroup(
      "mockRG",
      tools.tokenProvider.azureAccountProvider,
      "mockSubId",
      "east us"
    );
    assert.isTrue(res.isOk());
  });

  it("checkResourceGroupExistence success", async () => {
    const mockResourceManagementClient = new ResourceManagementClient(
      new MyTokenCredential(),
      "id"
    );
    sandbox
      .stub(mockResourceManagementClient.resourceGroups, "checkExistence")
      .resolves({ body: true });
    const res = await resourceGroupHelper.checkResourceGroupExistence(
      "mockRG",
      mockResourceManagementClient
    );
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      assert.isTrue(res.value);
    }
  });

  it("checkResourceGroupExistence throw Error", async () => {
    const mockResourceManagementClient = new ResourceManagementClient(
      new MyTokenCredential(),
      "id"
    );
    sandbox
      .stub(mockResourceManagementClient.resourceGroups, "checkExistence")
      .rejects(new Error("test"));
    const res = await resourceGroupHelper.checkResourceGroupExistence(
      "mockRG",
      mockResourceManagementClient
    );
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.isTrue(res.error instanceof CheckResourceGroupExistenceError);
    }
  });

  it("getResourceGroupInfo success", async () => {
    const mockResourceManagementClient = new ResourceManagementClient(
      new MyTokenCredential(),
      "id"
    );
    sandbox
      .stub(mockResourceManagementClient.resourceGroups, "get")
      .resolves({ name: "mockRG", location: "XXX" });
    const res = await resourceGroupHelper.getResourceGroupInfo(
      "mockRG",
      mockResourceManagementClient
    );
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      assert.isTrue(res.value?.name === "mockRG");
    }
  });

  it("getResourceGroupInfo success return undefined", async () => {
    const mockResourceManagementClient = new ResourceManagementClient(
      new MyTokenCredential(),
      "id"
    );
    sandbox.stub(mockResourceManagementClient.resourceGroups, "get").resolves({ location: "XXX" });
    const res = await resourceGroupHelper.getResourceGroupInfo(
      "mockRG",
      mockResourceManagementClient
    );
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      assert.isUndefined(res.value);
    }
  });

  it("getResourceGroupInfo throw Error", async () => {
    const mockResourceManagementClient = new ResourceManagementClient(
      new MyTokenCredential(),
      "id"
    );
    sandbox.stub(mockResourceManagementClient.resourceGroups, "get").rejects(new Error(""));
    const res = await resourceGroupHelper.getResourceGroupInfo(
      "mockRG",
      mockResourceManagementClient
    );
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.isTrue(res.error instanceof GetResourceGroupError);
    }
  });

  it("listResourceGroups success", async () => {
    const client = new ResourceManagementClient(new MyTokenCredential(), "id");
    const iterator = {
      next: sandbox
        .stub()
        .onFirstCall()
        .resolves({
          value: { name: "rg1", location: "east us" },
          done: false,
        })
        .onSecondCall()
        .resolves({
          value: { name: "rg2", location: "east us" },
          done: true,
        }),
      byPage: sandbox.stub().resolves([[{ name: "rg", location: "east us" }]]),
      [Symbol.asyncIterator]() {
        return this;
      },
    };
    sandbox.stub(client.resourceGroups, "list").returns(iterator);
    const res = await resourceGroupHelper.listResourceGroups(client);
    assert.isTrue(res.isOk());
    if (res.isOk()) {
      assert.isTrue(res.value.length === 2);
    }
  });

  it("listResourceGroups throw Error", async () => {
    const client = new ResourceManagementClient(new MyTokenCredential(), "id");
    const iterator = {
      next: sandbox.stub().rejects(new Error("test")),
      byPage: sandbox.stub().resolves([[{ name: "rg", location: "east us" }]]),
      [Symbol.asyncIterator]() {
        return this;
      },
    };
    sandbox.stub(client.resourceGroups, "list").returns(iterator);
    const res = await resourceGroupHelper.listResourceGroups(client);
    assert.isTrue(res.isErr());
    if (res.isErr()) {
      assert.isTrue(res.error instanceof ListResourceGroupsError);
    }
  });
});
