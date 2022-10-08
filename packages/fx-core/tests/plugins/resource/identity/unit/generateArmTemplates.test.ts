import { InputsWithProjectPath, Platform } from "@microsoft/teamsfx-api";
import * as chai from "chai";
import * as dotenv from "dotenv";
import "mocha";
import chaiAsPromised from "chai-as-promised";
import * as sinon from "sinon";
import { IdentityResource } from "../../../../../src/component/resource/identity";
import { createContextV3 } from "../../../../../src/component/utils";
chai.use(chaiAsPromised);

dotenv.config();

describe("identityPlugin", () => {
  let identityPlugin: IdentityResource;

  before(async () => {});

  beforeEach(async () => {
    identityPlugin = new IdentityResource();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("generate arm templates", async function () {
    const context = createContextV3();
    const inputs: InputsWithProjectPath = {
      platform: Platform.VSCode,
      projectPath: ".",
    };
    const result = await identityPlugin.generateBicep(context, inputs);
    chai.assert.isTrue(result.isOk());
  });
});
