import { expect } from "chai";
import { SampleProvider } from "../../../../src/officeChat/common/samples/sampleProvider";

describe("SampleProvider", () => {
  let provider: SampleProvider;

  beforeEach(() => {
    provider = SampleProvider.getInstance();
  });

  it("top K most relevant scenario sample codes BM25", async () => {
    const k = 2;
    const scenario = "insert annotation into document";
    const host = "Word";
    let topKSamples = await provider.getTopKMostRelevantScenarioSampleCodesBM25(
      null as any,
      host,
      scenario,
      k
    );
    if (topKSamples.size === 0) {
      topKSamples = await provider.getTopKMostRelevantScenarioSampleCodesBM25(
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
    const topKSamples = await provider.getTopKMostRelevantScenarioSampleCodesBM25(
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
