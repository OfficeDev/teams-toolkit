import axios from "axios";
import * as chai from "chai";
import * as sinon from "sinon";

import { err } from "@microsoft/teamsfx-api";

import {
  SampleConfigBranchForPrerelease,
  SampleConfigTag,
  SampleConfigTagForRc,
  sampleProvider,
} from "../../src/common/samples";
import sampleConfigV3 from "./samples-config-v3.json";
import { AccessGithubError } from "../../src/error/common";

const packageJson = require("../../package.json");

describe("Samples", () => {
  const sandbox = sinon.createSandbox();
  const fakedSampleConfig = {
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
        thumbnailUrl: "",
        suggested: true,
      },
    ],
  };

  afterEach(() => {
    sandbox.restore();
    sampleProvider["samplesConfig"] = undefined;
    process.env["TEAMSFX_SAMPLE_CONFIG_BRANCH"] = undefined;
  });

  describe("fetchSampleConfig", () => {
    afterEach(() => {
      sandbox.restore();
      sampleProvider["samplesConfig"] = undefined;
      process.env["TEAMSFX_SAMPLE_CONFIG_BRANCH"] = undefined;
      (sampleProvider as any).sampleCollection = undefined;
    });

    it("download sample config on 'dev' branch in alpha version", async () => {
      packageJson.version = "2.0.4-alpha.888a35067.0";
      sandbox.stub(axios, "get").callsFake(async (url: string, config) => {
        if (
          url ===
          "https://raw.githubusercontent.com/OfficeDev/TeamsFx-Samples/dev/.config/samples-config-v3.json"
        ) {
          return { data: fakedSampleConfig, status: 200 };
        } else {
          throw err(undefined);
        }
      });

      await sampleProvider.fetchSampleConfig();
      chai.expect(sampleProvider["samplesConfig"]).equal(fakedSampleConfig);
      const samples = sampleProvider.SampleCollection.samples;
      chai
        .expect(samples[0].downloadUrl)
        .equal(
          `https://github.com/OfficeDev/TeamsFx-Samples/tree/dev/hello-world-tab-with-backend`
        );
      chai.expect(samples[0].gifUrl).equal(undefined);
    });

    it("download sample config of prerelease branch in prerelease(beta) version", async () => {
      packageJson.version = "2.0.4-beta.0";
      sandbox.stub(axios, "get").callsFake(async (url: string, config) => {
        if (
          url ===
          `https://raw.githubusercontent.com/OfficeDev/TeamsFx-Samples/${SampleConfigBranchForPrerelease}/.config/samples-config-v3.json`
        ) {
          return { data: fakedSampleConfig, status: 200 };
        } else {
          throw err(undefined);
        }
      });

      await sampleProvider.fetchSampleConfig();
      chai.expect(sampleProvider["samplesConfig"]).equal(fakedSampleConfig);
      const samples = sampleProvider.SampleCollection.samples;
      chai
        .expect(samples[0].downloadUrl)
        .equal(
          `https://github.com/OfficeDev/TeamsFx-Samples/tree/${SampleConfigBranchForPrerelease}/hello-world-tab-with-backend`
        );
      chai.expect(samples[0].gifUrl).equal(undefined);
    });

    it("download sample config of rc tag in rc version", async () => {
      packageJson.version = "2.0.3-rc.1";
      sandbox.stub(axios, "get").callsFake(async (url: string, config) => {
        if (
          url ===
          `https://raw.githubusercontent.com/OfficeDev/TeamsFx-Samples/${SampleConfigTagForRc}/.config/samples-config-v3.json`
        ) {
          return { data: fakedSampleConfig, status: 200 };
        } else {
          throw err(undefined);
        }
      });

      await sampleProvider.fetchSampleConfig();
      chai.expect(sampleProvider["samplesConfig"]).equal(fakedSampleConfig);
      const samples = sampleProvider.SampleCollection.samples;
      chai
        .expect(samples[0].downloadUrl)
        .equal(
          `https://github.com/OfficeDev/TeamsFx-Samples/tree/${SampleConfigTagForRc}/hello-world-tab-with-backend`
        );
      chai.expect(samples[0].gifUrl).equal(undefined);
    });

    it("download sample config of release tag in stable version", async () => {
      packageJson.version = "2.0.3";
      sandbox.stub(axios, "get").callsFake(async (url: string, config) => {
        if (
          url ===
          `https://raw.githubusercontent.com/OfficeDev/TeamsFx-Samples/${SampleConfigTag}/.config/samples-config-v3.json`
        ) {
          return { data: fakedSampleConfig, status: 200 };
        } else {
          throw err(undefined);
        }
      });

      await sampleProvider.fetchSampleConfig();
      chai.expect(sampleProvider["samplesConfig"]).equal(fakedSampleConfig);
      const samples = sampleProvider.SampleCollection.samples;
      chai
        .expect(samples[0].downloadUrl)
        .equal(
          `https://github.com/OfficeDev/TeamsFx-Samples/tree/${SampleConfigTag}/hello-world-tab-with-backend`
        );
      chai.expect(samples[0].gifUrl).equal(undefined);
    });

    it("download sample config using feature flag if available in stable version", async () => {
      packageJson.version = "2.0.3";
      process.env["TEAMSFX_SAMPLE_CONFIG_BRANCH"] = "v2.0.0";
      sandbox.stub(axios, "get").callsFake(async (url: string, config) => {
        if (
          url ===
          `https://raw.githubusercontent.com/OfficeDev/TeamsFx-Samples/v2.0.0/.config/samples-config-v3.json`
        ) {
          return { data: fakedSampleConfig, status: 200 };
        } else {
          throw err(undefined);
        }
      });

      await sampleProvider.fetchSampleConfig();
      chai.expect(sampleProvider["samplesConfig"]).equal(fakedSampleConfig);
      const samples = sampleProvider.SampleCollection.samples;
      chai
        .expect(samples[0].downloadUrl)
        .equal(
          `https://github.com/OfficeDev/TeamsFx-Samples/tree/v2.0.0/hello-world-tab-with-backend`
        );
      chai.expect(samples[0].gifUrl).equal(undefined);
    });

    it("download bundled sample config if feature flag branch is unavailable in stable version", async () => {
      packageJson.version = "2.0.3";
      process.env["TEAMSFX_SAMPLE_CONFIG_BRANCH"] = "v2.0.0";
      sandbox.stub(axios, "get").callsFake(async (url: string, config) => {
        if (
          url ===
          `https://raw.githubusercontent.com/OfficeDev/TeamsFx-Samples/${SampleConfigTag}/.config/samples-config-v3.json`
        ) {
          return { data: fakedSampleConfig, status: 200 };
        } else {
          throw err(undefined);
        }
      });

      try {
        await sampleProvider.fetchSampleConfig();
        chai.expect(sampleProvider["samplesConfig"]).equal(fakedSampleConfig);
        const samples = sampleProvider.SampleCollection.samples;
        chai
          .expect(samples[0].downloadUrl)
          .equal(
            `https://github.com/OfficeDev/TeamsFx-Samples/tree/${SampleConfigTag}/hello-world-tab-with-backend`
          );
        chai.expect(samples[0].gifUrl).equal(undefined);
      } catch (e) {
        chai.assert.fail("should not reach here");
      }
    });

    it("has empty sample collection if network in disconnected", async () => {
      packageJson.version = "2.0.3";
      sandbox.stub(axios, "get").callsFake(async (url: string, config) => {
        throw err(undefined);
      });

      try {
        await sampleProvider.fetchSampleConfig();
        chai.assert.fail("should not reach here");
      } catch (e) {
        chai.assert.isTrue(e instanceof AccessGithubError);
      }
    });
  });

  it("Get v3 samples - online sample config", () => {
    sampleProvider["samplesConfig"] = sampleConfigV3;

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
      downloadUrl: "https://github.com/Test/Test-Samples/tree/main/faked-external-sample",
    };
    sampleConfigV3.samples.push(fakedExternalSample as any);

    sampleProvider["samplesConfig"] = sampleConfigV3;
    const samples = sampleProvider.SampleCollection.samples;
    const faked = samples.find((sample) => sample.id === fakedExternalSample.id);
    chai.expect(faked).exist;
    chai.expect(faked?.downloadUrl).equals(fakedExternalSample.downloadUrl);
    chai.expect(faked?.gifUrl).equals(undefined);

    (sampleProvider as any).sampleCollection = undefined;
    sampleConfigV3.samples.splice(sampleConfigV3.samples.length - 1, 1);
  });

  it("fetchSampleConfig - online sample config returns undefined when failed to fetch", async () => {
    sandbox.stub(axios, "get").callsFake(async (url: string, config) => {
      if (
        url ===
        "https://raw.githubusercontent.com/OfficeDev/TeamsFx-Samples/v2.2.0/.config/samples-config-v3.json"
      ) {
        throw new Error("test error");
      }
    });

    try {
      await sampleProvider.fetchSampleConfig();
      chai.assert.fail("should not reach here");
    } catch (e) {
      chai.assert.isTrue(e instanceof AccessGithubError);
    }
  });

  it("fetchSampleConfig - online sample config succeeds to obtain", async () => {
    const fakedSampleConfig = {
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
    sandbox.stub(axios, "get").resolves({ data: fakedSampleConfig, status: 200 });

    await sampleProvider.fetchSampleConfig();

    chai.expect(sampleProvider["samplesConfig"]).equals(fakedSampleConfig);
  });
});
