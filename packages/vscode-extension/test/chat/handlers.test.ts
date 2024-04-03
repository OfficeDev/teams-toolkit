import * as chai from "chai";
import * as sinon from "sinon";
import { TeamsFollowupProvider } from "../../src/chat/followupProvider";
import { ChatFollowup } from "vscode";
import { CancellationToken } from "../mocks/vsc";
import { DefaultNextStep } from "../../src/chat/consts";

describe("chat handlers", () => {
  const sandbox = sinon.createSandbox();

  describe("chatRequestHandler()", () => {
    afterEach(async () => {
      sandbox.restore();
    });

    it("chat request - creat command", async () => {
      const request = { command: "create" };
      const context = { history: [] };
      const response = {};
      const token = new CancellationToken();
      const result = TeamsFollowupProvider.getInstance().provideFollowups({}, context, token);
      chai.expect(result).to.deep.equal([DefaultNextStep]);
    });
  });
});
