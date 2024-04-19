import { expect } from "chai";
import { SampleProvider } from "../../../src/officeChat/common/samples/sampleProvider";

describe("SampleProvider", () => {
  let provider: SampleProvider;

  beforeEach(() => {
    provider = SampleProvider.getInstance();
  });

  it("should return top K most relevant scenario sample codes", async () => {
    const k = 2;
    const scenario = "insert annotation into document";
    const host = "Word";
    const topKSamples = await provider.getTopKMostRelevantScenarioSampleCodesBM25(
      null as any,
      host,
      scenario,
      k
    );
    expect(topKSamples).to.exist;
    expect(topKSamples).to.be.an("array");
    expect(topKSamples).to.have.lengthOf(k);
    // Add more assertions based on what you expect the topKSamples to be
  });

  it("not valid host", async () => {
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
    expect(topKSamples).to.be.an("array");
    expect(topKSamples).to.have.lengthOf(0);
    // Add more assertions based on what you expect the topKSamples to be
  });
});
