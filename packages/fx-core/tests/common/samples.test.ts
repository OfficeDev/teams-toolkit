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
    (sampleProvider as any).sampleCollection = undefined;
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
    (sampleProvider as any).sampleCollection = undefined;
  });

  it("External sample url can be retrieved correctly in v3", () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "true",
    });

    const fakedExternalSample = {
      id: "external-sample",
      title: "Test external sample",
      shortDescription: "short description for external sample",
      fullDescription: "full description for external sample",
      tags: ["External"],
      time: "5min to run",
      configuration: "Ready for debug",
      suggested: false,
      url: "https://faked-external-sample",
      packageLink: "https://faked-external-sample/archive/refs/heads/main.zip",
      relativePath: "faked-external-sample",
    };
    sampleConfigV3.samples.push(fakedExternalSample as any);

    const samples = sampleProvider.SampleCollection.samples;
    const faked = samples.find((sample) => sample.id === fakedExternalSample.id);
    chai.expect(faked).exist;
    chai.expect(faked?.url).equals(fakedExternalSample.url);
    chai.expect(faked?.link).equals(fakedExternalSample.packageLink);
    chai.expect(faked?.relativePath).equals(fakedExternalSample.relativePath);

    restore();
    (sampleProvider as any).sampleCollection = undefined;
    sampleConfigV3.samples.splice(sampleConfigV3.samples.length - 1, 1);
  });

  it("External sample url fallback to base url in v3", () => {
    const restore = mockedEnv({
      TEAMSFX_V3: "true",
    });

    const fakedExternalSample = {
      id: "external-sample",
      title: "Test external sample",
      shortDescription: "short description for external sample",
      fullDescription: "full description for external sample",
      tags: ["External"],
      time: "5min to run",
      configuration: "Ready for debug",
      suggested: false,
      packageLink: "https://faked-external-sample/archive/refs/heads/main.zip",
    };
    sampleConfigV3.samples.push(fakedExternalSample as any);

    const samples = sampleProvider.SampleCollection.samples;
    const faked = samples.find((sample) => sample.id === fakedExternalSample.id);
    chai.expect(faked).exist;
    chai.expect(faked?.url).equals(sampleConfigV3.baseUrl);
    chai.expect(faked?.link).equals(fakedExternalSample.packageLink);

    restore();
    (sampleProvider as any).sampleCollection = undefined;
    sampleConfigV3.samples.splice(sampleConfigV3.samples.length - 1, 1);
  });
});
