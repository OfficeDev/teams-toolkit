import * as mocha from "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import mockedEnv from "mocked-env";
import { sampleProvider } from "../../src/common/samples";
import sampleConfigV3 from "../../src/common/samples-config-v3.json";
import axios from "axios";
import { err } from "@microsoft/teamsfx-api";
const packageJson = require("../../package.json");

describe("Samples", () => {
  afterEach(() => {
    sinon.restore();
    sampleProvider["sampleConfigs"] = undefined;
  });

  it("Get v3 samples - default sample config", () => {
    const samples = sampleProvider.SampleCollection.samples;
    for (const sample of samples) {
      chai.expect(sampleConfigV3.samples.find((sampleInConfig) => sampleInConfig.id === sample.id))
        .exist;
    }
    (sampleProvider as any).sampleCollection = undefined;
  });

  it("Get v3 samples - online sample config", () => {
    sampleProvider["sampleConfigs"] = sampleConfigV3;

    const samples = sampleProvider.SampleCollection.samples;
    for (const sample of samples) {
      chai.expect(sampleConfigV3.samples.find((sampleInConfig) => sampleInConfig.id === sample.id))
        .exist;
    }
    (sampleProvider as any).sampleCollection = undefined;
  });

  it("External sample url can be retrieved correctly in v3", () => {
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
    };
    sampleConfigV3.samples.push(fakedExternalSample as any);

    const samples = sampleProvider.SampleCollection.samples;
    const faked = samples.find((sample) => sample.id === fakedExternalSample.id);
    chai.expect(faked).exist;
    chai.expect(faked?.url).equals(fakedExternalSample.url);

    (sampleProvider as any).sampleCollection = undefined;
    sampleConfigV3.samples.splice(sampleConfigV3.samples.length - 1, 1);
  });

  it("External sample url fallback to base url in v3", () => {
    const fakedExternalSample = {
      id: "external-sample",
      title: "Test external sample",
      shortDescription: "short description for external sample",
      fullDescription: "full description for external sample",
      tags: ["External"],
      time: "5min to run",
      configuration: "Ready for debug",
      suggested: false,
    };
    sampleConfigV3.samples.push(fakedExternalSample as any);

    const samples = sampleProvider.SampleCollection.samples;
    const faked = samples.find((sample) => sample.id === fakedExternalSample.id);
    chai.expect(faked).exist;
    chai.expect(faked?.url).equals(sampleConfigV3.baseUrl + fakedExternalSample.id);

    (sampleProvider as any).sampleCollection = undefined;
    sampleConfigV3.samples.splice(sampleConfigV3.samples.length - 1, 1);
  });

  it("fetchSampleConfig - online sample config returns undefined when failed to fetch", async () => {
    sinon.stub(axios, "get").callsFake(async (url: string, config) => {
      if (
        url ===
        "https://raw.githubusercontent.com/OfficeDev/TeamsFx-Samples/v2.2.0/.config/samples-config-v3.json"
      ) {
        throw err(undefined);
      }
    });

    await sampleProvider.fetchSampleConfig();

    chai.expect(sampleProvider["sampleConfigs"]).equals(undefined);
  });

  it("fetchSampleConfig - online sample config succeeds to obtain", async () => {
    const fakedSampleConfig = {
      baseUrl: "https://github.com/OfficeDev/TeamsFx-Samples/tree/v1.1.0/",
      samples: [
        {
          id: "hello-world-tab-with-backend",
          title: "Tab App with Azure Backend",
          shortDescription:
            "A Hello World app of Microsoft Teams Tab app which has a backend service",
          fullDescription:
            "This is a Hello World app of Microsoft Teams Tab app which accomplishes very simple function like single-sign on. You can run this app locally or deploy it to Microsoft Azure. This app has a Tab frontend and a backend service using Azure Function.",
          tags: ["Tab", "TS", "Azure function"],
          time: "5min to run",
          configuration: "Ready for debug",
          suggested: true,
        },
      ],
    };
    sinon.stub(axios, "get").callsFake(async (url: string, config) => {
      if (
        url ===
        `https://raw.githubusercontent.com/OfficeDev/TeamsFx-Samples/v2.2.0/.config/samples-config-v3.json`
      ) {
        return { data: fakedSampleConfig, status: 200 };
      }
    });

    await sampleProvider.fetchSampleConfig();

    chai.expect(sampleProvider["sampleConfigs"]).equals(fakedSampleConfig);
  });

  it("Download sample from dev branch for alpha build", () => {
    const fakedSampleConfig = {
      baseUrl: "https://github.com/OfficeDev/TeamsFx-Samples/tree/v1.1.0/",
      samples: [
        {
          id: "hello-world-tab-with-backend",
          title: "Tab App with Azure Backend",
          shortDescription:
            "A Hello World app of Microsoft Teams Tab app which has a backend service",
          fullDescription:
            "This is a Hello World app of Microsoft Teams Tab app which accomplishes very simple function like single-sign on. You can run this app locally or deploy it to Microsoft Azure. This app has a Tab frontend and a backend service using Azure Function.",
          tags: ["Tab", "TS", "Azure function"],
          time: "5min to run",
          configuration: "Ready for debug",
          suggested: true,
        },
      ],
    };
    sampleProvider["sampleConfigs"] = fakedSampleConfig;
    packageJson.version = "2.0.4-alpha.888a35067.0";

    const samples = sampleProvider.SampleCollection.samples;
    chai
      .expect(samples[0].url)
      .equal(`https://github.com/OfficeDev/TeamsFx-Samples/tree/dev/hello-world-tab-with-backend`);
    (sampleProvider as any).sampleCollection = undefined;
  });

  it("Download sample from v3 branch for rc build", () => {
    const fakedSampleConfig = {
      baseUrl: "https://github.com/OfficeDev/TeamsFx-Samples/tree/v1.1.0/",
      samples: [
        {
          id: "hello-world-tab-with-backend",
          title: "Tab App with Azure Backend",
          shortDescription:
            "A Hello World app of Microsoft Teams Tab app which has a backend service",
          fullDescription:
            "This is a Hello World app of Microsoft Teams Tab app which accomplishes very simple function like single-sign on. You can run this app locally or deploy it to Microsoft Azure. This app has a Tab frontend and a backend service using Azure Function.",
          tags: ["Tab", "TS", "Azure function"],
          time: "5min to run",
          configuration: "Ready for debug",
          suggested: true,
        },
      ],
    };
    sampleProvider["sampleConfigs"] = fakedSampleConfig;
    packageJson.version = "2.0.3-rc.1";

    const samples = sampleProvider.SampleCollection.samples;
    chai
      .expect(samples[0].url)
      .equal(`https://github.com/OfficeDev/TeamsFx-Samples/tree/v3/hello-world-tab-with-backend`);
    (sampleProvider as any).sampleCollection = undefined;
  });
});
