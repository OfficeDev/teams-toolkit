import { expect } from "chai";
import { SampleProvider } from "../../../../src/officeChat/common/samples/sampleProvider";
import * as utils from "../../../../src/chat/utils";
import sinon from "ts-sinon";

describe("SampleProvider", () => {
  const sandbox = sinon.createSandbox();

  beforeEach(() => {});

  afterEach(() => {
    sandbox.restore();
  });

  it("top K most relevant scenario sample codes LLM", async () => {
    sandbox
      .stub(utils, "getCopilotResponseAsString")
      .resolves('{"selectedSampleCodes":["description1", "description2"]}');
    const k = 2;
    const scenario = "insert annotation into document";
    const host = "Word";
    const topKSamples =
      await SampleProvider.getInstance().getTopKMostRelevantScenarioSampleCodesLLM(
        null as any,
        host,
        scenario,
        k
      );

    expect(topKSamples).to.exist;
    expect(topKSamples).to.be.an("map");
    // Add more assertions based on what you expect the topKSamples to be
  });

  it("top K most relevant scenario sample codes BM25", async () => {
    const k = 2;
    const scenario = "insert annotation into document";
    const host = "Word";
    let topKSamples = await SampleProvider.getInstance().getTopKMostRelevantScenarioSampleCodesBM25(
      null as any,
      host,
      scenario,
      k
    );
    if (topKSamples.size === 0) {
      topKSamples = await SampleProvider.getInstance().getTopKMostRelevantScenarioSampleCodesBM25(
        null as any,
        host,
        scenario,
        k
      );
    }
    expect(topKSamples).to.exist;
    expect(topKSamples).to.be.an("map");
    expect(topKSamples).to.have.lengthOf(k);
    // Add more assertions based on what you expect the topKSamples to be
  });

  it("not valid host BM25", async () => {
    const k = 2;
    const scenario = "insert annotation into document";
    const host = "FakeHost";
    const topKSamples =
      await SampleProvider.getInstance().getTopKMostRelevantScenarioSampleCodesBM25(
        null as any,
        host,
        scenario,
        k
      );
    expect(topKSamples).to.exist;
    expect(topKSamples).to.be.an("map");
    expect(topKSamples).to.have.lengthOf(0);
    // Add more assertions based on what you expect the topKSamples to be
  });
});
