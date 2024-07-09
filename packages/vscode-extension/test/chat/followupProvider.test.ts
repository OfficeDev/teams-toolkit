import * as chai from "chai";
import * as sinon from "sinon";
import { TeamsFollowupProvider } from "../../src/chat/followupProvider";
import { ChatFollowup } from "vscode";
import { CancellationToken } from "../mocks/vsc";
import { DefaultNextStep } from "../../src/chat/consts";

describe("chat followup provider", () => {
  const sandbox = sinon.createSandbox();

  describe("getInstance()", () => {
    afterEach(async () => {
      sandbox.restore();
    });

    it("create instance if not existed", async () => {
      const instance = TeamsFollowupProvider.getInstance();
      chai.expect(instance).to.be.an.instanceof(TeamsFollowupProvider);
    });
  });

  describe("clearFollowups()", () => {
    afterEach(async () => {
      sandbox.restore();
    });

    it("clear followups", async () => {
      const instance = TeamsFollowupProvider.getInstance();
      instance["followups"] = [{ prompt: "fakePrompt" }];
      instance.clearFollowups();
      chai.expect(instance["followups"]).to.be.empty;
    });
  });

  describe("addFollowups()", () => {
    afterEach(async () => {
      sandbox.restore();
    });

    it("add followups", async () => {
      const instance = TeamsFollowupProvider.getInstance();
      const testFollowupCommands: ChatFollowup[] = [
        { prompt: "fakePrompt" },
        { prompt: "fakePrompt2" },
      ];
      instance.addFollowups(testFollowupCommands);
      chai.expect(instance["followups"]).to.deep.equal(testFollowupCommands);
    });
  });

  describe("provideFollowups()", () => {
    afterEach(async () => {
      sandbox.restore();
    });

    it("provide default followup if empty", async () => {
      const instance = TeamsFollowupProvider.getInstance();
      instance["followups"] = [];
      const result = instance.provideFollowups({}, { history: [] }, new CancellationToken());
      chai.expect(result).to.deep.equal([DefaultNextStep]);
    });

    it("provide followups", async () => {
      const instance = TeamsFollowupProvider.getInstance();
      const testFollowupCommands: ChatFollowup[] = [
        { prompt: "fakePrompt" },
        { prompt: "fakePrompt2" },
      ];
      instance["followups"] = testFollowupCommands;
      const result = instance.provideFollowups({}, { history: [] }, new CancellationToken());
      chai.expect(result).to.deep.equal(testFollowupCommands);
    });
  });
});
