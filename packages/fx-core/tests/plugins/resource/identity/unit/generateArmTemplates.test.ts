import * as msRestNodeAuth from "@azure/ms-rest-nodeauth";
import { InputsWithProjectPath, Platform } from "@microsoft/teamsfx-api";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as dotenv from "dotenv";
import * as faker from "faker";
import "mocha";
import * as sinon from "sinon";
import { IdentityResource } from "../../../../../src/component/resource/identity";
import { createContextV3 } from "../../../../../src/component/utils";
chai.use(chaiAsPromised);

dotenv.config();

describe("identityPlugin", () => {
  let identityPlugin: IdentityResource;
  let credentials: msRestNodeAuth.TokenCredentialsBase;

  before(async () => {
    credentials = new msRestNodeAuth.ApplicationTokenCredentials(
      faker.datatype.uuid(),
      faker.internet.url(),
      faker.internet.password()
    );
  });

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
