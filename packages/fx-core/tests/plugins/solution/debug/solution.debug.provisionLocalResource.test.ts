import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { Platform } from "@microsoft/teamsfx-api";
import * as uuid from "uuid";
import { MockedV2Context } from "../util";
import { setupLocalDebugSettings } from "../../../../src/plugins/solution/fx-solution/debug/provisionLocalResource";
import * as path from "path";
chai.use(chaiAsPromised);

describe("solution.debug.provisionLocalResource", () => {
  describe("provisionLocalResource", () => {
    it("happy path", async () => {
      const projectSetting = {
        appName: "",
        projectId: uuid.v4(),
        solutionSettings: {
          name: "",
          version: "",
          activeResourcePlugins: [
            "fx-resource-aad-app-for-teams",
            "fx-resource-simple-auth",
            "fx-resource-frontend-hosting",
            "fx-resource-function",
          ],
        },
        programmingLanguage: "typescript",
      };
      const inputs = {
        platform: Platform.VSCode,
        projectPath: path.resolve(__dirname, `./data/${projectSetting.projectId}`),
      };
      const v2Context = new MockedV2Context(projectSetting);
      const result = await setupLocalDebugSettings(v2Context, inputs, {
        auth: {},
        frontend: {},
        backend: {},
      });
      chai.assert.isTrue(result.isOk());
    });
  });
});
