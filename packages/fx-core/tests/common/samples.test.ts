import * as mocha from "mocha";
import * as chai from "chai";
import mockedEnv from "mocked-env";
import { sampleProvider } from "../../src/common/samples";
import sampleConfig from "../../src/common/samples-config.json";
import sampleConfigV3 from "../../src/common/samples-config-v3.json";

describe("Samples", () => {
  it("Get v2 samples", () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "false",
    });

    const samples = sampleProvider.SampleCollection.samples;
    for (const sample of samples) {
      chai.expect(sampleConfig.samples.find((sampleInConfig) => sampleInConfig.id === sample.id))
        .exist;
    }
    restore();
    sampleProvider.SampleCollection.samples = [];
  });

  it("Get v3 samples", () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "true",
    });

    const samples = sampleProvider.SampleCollection.samples;
    for (const sample of samples) {
      chai.expect(sampleConfigV3.samples.find((sampleInConfig) => sampleInConfig.id === sample.id))
        .exist;
    }
    restore();
    sampleProvider.SampleCollection.samples = [];
  });
});
