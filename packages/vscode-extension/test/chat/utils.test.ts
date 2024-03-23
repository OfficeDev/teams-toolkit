import { sampleProvider } from "@microsoft/teamsfx-core";
import * as chai from "chai";
import * as chaiPromised from "chai-as-promised";
import * as sinon from "sinon";
import * as vscode from "vscode";
import * as utils from "../../src/chat/utils";
import { CancellationToken } from "../mocks/vsc";

chai.use(chaiPromised);

describe("chat utils", () => {
  const sanbox = sinon.createSandbox();

  describe("verbatimCopilotInteraction()", () => {
    afterEach(async () => {
      sanbox.restore();
    });

    it("outputs result from LLM", async () => {
      const asyncIterator = (async function* () {
        yield "result";
      })();
      const token = new CancellationToken();
      sanbox.stub(vscode.lm, "sendChatRequest").resolves({
        stream: asyncIterator,
      });
      const response = {
        markdown: sanbox.stub(),
      };

      await utils.verbatimCopilotInteraction(
        "copilot-gpt-3.5-turbo",
        [],
        response as unknown as vscode.ChatResponseStream,
        token
      );
      chai.assert.isTrue(response.markdown.calledOnceWith("result"));
    });
  });

  describe("getCopilotResponseAsString()", () => {
    afterEach(async () => {
      sanbox.restore();
    });

    it("returns result as string from LLM", async () => {
      const asyncIterator = (async function* () {
        yield "result";
      })();
      const token = new CancellationToken();
      sanbox.stub(vscode.lm, "sendChatRequest").resolves({
        stream: asyncIterator,
      });
      const response = {
        markdown: sanbox.stub(),
      };

      const result = await utils.getCopilotResponseAsString("copilot-gpt-3.5-turbo", [], token);
      chai.assert.equal(result, "result");
    });
  });

  describe("getSampleDownloadUrlInfo()", () => {
    afterEach(async () => {
      sanbox.restore();
    });

    it("returns download Url", async () => {
      const testDownloadUrlInfo = {
        owner: "test",
        repository: "test",
        ref: "test",
        dir: "test",
      };
      sinon.stub(sampleProvider, "SampleCollection").get(() => {
        return Promise.resolve({
          samples: [
            {
              id: "sampleId",
              downloadUrlInfo: testDownloadUrlInfo,
            },
          ],
        });
      });
      const result = await utils.getSampleDownloadUrlInfo("sampleId");
      chai.assert.equal(result, testDownloadUrlInfo);
    });

    it("throws error if not found", async () => {
      sinon.stub(sampleProvider, "SampleCollection").get(() => {
        return Promise.resolve({
          samples: [
            {
              id: "sampleId2",
              downloadUrlInfo: undefined,
            },
          ],
        });
      });
      chai
        .expect(utils.getSampleDownloadUrlInfo("sampleId"))
        .to.be.rejectedWith("Sample not found");
    });
  });
});
