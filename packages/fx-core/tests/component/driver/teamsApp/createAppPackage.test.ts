// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import chai from "chai";
import fs from "fs-extra";
import mockedEnv, { RestoreFn } from "mocked-env";
import { CreateAppPackageDriver } from "../../../../src/component/driver/teamsApp/createAppPackage";
import { CreateAppPackageArgs } from "../../../../src/component/driver/teamsApp/interfaces/CreateAppPackageArgs";
import {
  MockedM365Provider,
  MockedLogProvider,
  MockedUserInteraction,
} from "../../../plugins/solution/util";
import { FileNotFoundError, JSONSyntaxError } from "../../../../src/error/common";
import { FeatureFlagName } from "../../../../src/common/constants";
import { manifestUtils } from "../../../../src/component/driver/teamsApp/utils/ManifestUtils";
import { ok, Platform, PluginManifestSchema, TeamsAppManifest } from "@microsoft/teamsfx-api";
import AdmZip from "adm-zip";
import { InvalidFileOutsideOfTheDirectotryError } from "../../../../src/error/teamsApp";

describe("teamsApp/createAppPackage", async () => {
  const teamsAppDriver = new CreateAppPackageDriver();
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
    projectPath: "./",
    platform: Platform.VSCode,
    logProvider: new MockedLogProvider(),
    ui: new MockedUserInteraction(),
  };
  let mockedEnvRestore: RestoreFn;
  const fakeUrl = "https://fake.com";
  const openapiServerPlaceholder = "TEAMSFX_TEST_API_URL";
  beforeEach(() => {
    mockedEnvRestore = mockedEnv({
      [FeatureFlagName.CopilotPlugin]: "true",
      ["CONFIG_TEAMS_APP_NAME"]: "fakeName",
      [openapiServerPlaceholder]: fakeUrl,
      ["APP_NAME_SUFFIX"]: "test",
    });
  });

  afterEach(() => {
    sinon.restore();
    if (mockedEnvRestore) {
      mockedEnvRestore();
    }
  });

  it("should throw error if file not exists case 1", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath: "fakepath",
      outputZipPath: "fakePath",
      outputJsonPath: "fakePath",
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(new TeamsAppManifest()));
    sinon.stub(fs, "pathExists").onFirstCall().resolves(false);
    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.isTrue(result.error instanceof FileNotFoundError);
    }
  });
  it("should throw error if file not exists case 2", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath: "fakepath",
      outputZipPath: "fakePath",
      outputJsonPath: "fakePath",
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(new TeamsAppManifest()));
    sinon.stub(fs, "pathExists").onFirstCall().resolves(true).onSecondCall().resolves(false);
    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.isTrue(result.error instanceof FileNotFoundError);
    }
  });
  it("should throw error if file not exists case 3", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath: "fakepath",
      outputZipPath: "fakePath",
      outputJsonPath: "fakePath",
    };
    const manifest = new TeamsAppManifest();
    manifest.localizationInfo = {
      additionalLanguages: [{ file: "aaa", languageTag: "zh" }],
      defaultLanguageTag: "en",
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));
    sinon
      .stub(fs, "pathExists")
      .onFirstCall()
      .resolves(true)
      .onSecondCall()
      .resolves(true)
      .onThirdCall()
      .resolves(false);
    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.isTrue(result.error instanceof FileNotFoundError);
    }
  });

  it("should throw error if file not exists case 4", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
      outputZipPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
      outputJsonPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
    };

    const manifest = new TeamsAppManifest();
    manifest.composeExtensions = [
      {
        composeExtensionType: "apiBased",
        apiSpecificationFile: "resources/openai.yml",
        commands: [
          {
            id: "GET /repairs",
            apiResponseRenderingTemplateFile: "resources/repairs.json",
            title: "fake",
          },
        ],
        botId: "",
      },
    ];
    manifest.icons = {
      color: "resources/color.png",
      outline: "resources/outline.png",
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));

    sinon.stub(fs, "pathExists").callsFake((filePath) => {
      if (filePath.includes("openai.yml")) {
        return false;
      } else {
        return true;
      }
    });
    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.isTrue(result.error instanceof FileNotFoundError);
    }
  });

  it("should throw error if file not exists case 5", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
      outputZipPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
      outputJsonPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
    };
    sinon.stub(fs, "pathExists").callsFake((filePath) => {
      if (filePath.includes("repairs.json")) {
        return false;
      } else {
        return true;
      }
    });

    const manifest = new TeamsAppManifest();
    manifest.composeExtensions = [
      {
        composeExtensionType: "apiBased",
        apiSpecificationFile: "resources/openai.yml",
        commands: [
          {
            id: "GET /repairs",
            apiResponseRenderingTemplateFile: "resources/repairs.json",
            title: "fake",
          },
        ],
        botId: "",
      },
    ];
    manifest.icons = {
      color: "resources/color.png",
      outline: "resources/outline.png",
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));

    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.isTrue(result.error instanceof FileNotFoundError);
    }
  });

  describe("api plugin error case", async () => {
    it("should throw error if pluginFile not exists for API plugin", async () => {
      const args: CreateAppPackageArgs = {
        manifestPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
        outputZipPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
        outputJsonPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
      };
      sinon.stub(fs, "pathExists").callsFake((filePath) => {
        if (filePath.includes("plugin.json")) {
          return false;
        } else {
          return true;
        }
      });

      const manifest = new TeamsAppManifest();
      manifest.plugins = [
        {
          file: "plugin.json",
          id: "plugin1",
        },
      ];
      manifest.icons = {
        color: "resources/color.png",
        outline: "resources/outline.png",
      };
      sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));

      const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert.isTrue(result.error instanceof FileNotFoundError);
      }
    });

    it("should return error when placeholder is not resolved in ai-plugin.json - case 1", async () => {
      const args: CreateAppPackageArgs = {
        manifestPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
        outputZipPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
        outputJsonPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
      };
      sinon.stub(fs, "pathExists").callsFake((filePath) => {
        return true;
      });

      const manifest = new TeamsAppManifest();
      manifest.icons = {
        color: "resources/color.png",
        outline: "resources/outline.png",
      };
      manifest.plugins = [
        {
          file: "resources/ai-plugin.json",
          id: "plugin1",
        },
      ];
      sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));
      sinon.stub(fs, "chmod").callsFake(async () => {});
      sinon.stub(fs, "writeFile").callsFake(async () => {});

      delete process.env["APP_NAME_SUFFIX"];
      const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;

      chai.assert(
        result.isErr() &&
          result.error.name === "MissingEnvironmentVariablesError" &&
          result.error.message.includes("APP_NAME_SUFFIX")
      );
    });

    it("should return error when placeholder is not resolved in ai-plugin.json- case 2", async () => {
      const args: CreateAppPackageArgs = {
        manifestPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
        outputZipPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
        outputJsonPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
      };
      sinon.stub(fs, "pathExists").callsFake((filePath) => {
        return true;
      });

      const pluginJson: PluginManifestSchema = {
        name_for_human: "test",
        schema_version: "v2",
        description_for_human: "test",
        runtimes: [
          {
            type: "OpenApi",
            auth: { type: "None" },
            spec: { url: "test\\openai.yml" },
          },
        ],
      };
      sinon.stub(fs, "readJSON").resolves(pluginJson);

      const manifest = new TeamsAppManifest();
      manifest.icons = {
        color: "resources/color.png",
        outline: "resources/outline.png",
      };
      manifest.plugins = [
        {
          file: "resources/ai-plugin.json",
          id: "plugin1",
        },
      ];
      sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));
      sinon.stub(fs, "chmod").callsFake(async () => {});
      sinon.stub(fs, "writeFile").callsFake(async () => {});

      delete process.env["APP_NAME_SUFFIX"];
      const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;

      chai.assert(
        result.isErr() &&
          result.error.name === "MissingEnvironmentVariablesError" &&
          result.error.message.includes("APP_NAME_SUFFIX")
      );
    });

    it("should throw error if api spec not exists for API plugin", async () => {
      const args: CreateAppPackageArgs = {
        manifestPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
        outputZipPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
        outputJsonPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
      };
      sinon.stub(fs, "pathExists").callsFake((filePath) => {
        if (filePath.includes("openai.yml")) {
          return false;
        } else {
          return true;
        }
      });

      const manifest = new TeamsAppManifest();
      manifest.plugins = [
        {
          file: "resources/ai-plugin.json",
          id: "plugin1",
        },
      ];
      manifest.icons = {
        color: "resources/color.png",
        outline: "resources/outline.png",
      };
      sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));

      const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
      chai.assert(result.isErr());
      if (result.isErr()) {
        chai.assert.isTrue(result.error instanceof FileNotFoundError);
      }
    });

    it("should throw error if parse json error", async () => {
      const args: CreateAppPackageArgs = {
        manifestPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
        outputZipPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
        outputJsonPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
      };
      sinon.stub(fs, "pathExists").resolves(true);
      sinon.stub(fs, "readJSON").throws(new Error("fake error"));

      const manifest = new TeamsAppManifest();
      manifest.plugins = [
        {
          file: "resources/ai-plugin.json",
          id: "plugin1",
        },
      ];
      manifest.icons = {
        color: "resources/color.png",
        outline: "resources/outline.png",
      };
      sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));

      const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
      chai.assert.isTrue(result.isErr());
      if (result.isErr()) {
        chai.assert.isTrue(result.error instanceof JSONSyntaxError);
      }
    });
  });

  it("invalid param error", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath: "",
      outputZipPath: "",
      outputJsonPath: "",
    };
    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.equal("InvalidActionInputError", result.error.name);
    }
  });

  it("happy path", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
      outputZipPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
      outputJsonPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
    };

    const manifest = new TeamsAppManifest();
    manifest.composeExtensions = [
      {
        composeExtensionType: "apiBased",
        apiSpecificationFile: "resources/openai.yml",
        commands: [
          {
            id: "GET /repairs",
            apiResponseRenderingTemplateFile: "resources/repairs.json",
            title: "fake",
          },
        ],
        botId: "",
      },
    ];
    manifest.icons = {
      color: "resources/color.png",
      outline: "resources/outline.png",
    };
    manifest.localizationInfo = {
      defaultLanguageTag: "en",
      additionalLanguages: [
        {
          languageTag: "de",
          file: "resources/de.json",
        },
      ],
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));

    sinon.stub(fs, "chmod").callsFake(async () => {});
    sinon.stub(fs, "writeFile").callsFake(async () => {});

    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert(result.isOk());
    if (await fs.pathExists(args.outputZipPath)) {
      const zip = new AdmZip(args.outputZipPath);

      let openapiContent = "";

      const entries = zip.getEntries();
      for (const e of entries) {
        const name = e.entryName;

        if (name.endsWith("openai.yml")) {
          const data = e.getData();
          openapiContent = data.toString("utf8");
          break;
        }
      }

      chai.assert(
        openapiContent != undefined &&
          openapiContent.length > 0 &&
          openapiContent.search(fakeUrl) >= 0 &&
          openapiContent.search(openapiServerPlaceholder) < 0
      );
      await fs.remove(args.outputZipPath);
    }
  });

  it("should return error when placeholder is not resolved in openapi.yml", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
      outputZipPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
      outputJsonPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
    };

    const manifest = new TeamsAppManifest();
    manifest.composeExtensions = [
      {
        composeExtensionType: "apiBased",
        apiSpecificationFile: "resources/openai.yml",
        commands: [
          {
            id: "GET /repairs",
            apiResponseRenderingTemplateFile: "resources/repairs.json",
            title: "fake",
          },
        ],
        botId: "",
      },
    ];
    manifest.icons = {
      color: "resources/color.png",
      outline: "resources/outline.png",
    };
    manifest.localizationInfo = {
      defaultLanguageTag: "en",
      additionalLanguages: [
        {
          languageTag: "de",
          file: "resources/de.json",
        },
      ],
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));

    sinon.stub(fs, "chmod").callsFake(async () => {});
    sinon.stub(fs, "writeFile").callsFake(async () => {});

    delete process.env[openapiServerPlaceholder];
    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert(
      result.isErr() &&
        result.error.name === "MissingEnvironmentVariablesError" &&
        result.error.message.includes(openapiServerPlaceholder)
    );
  });

  it("happy path - CLI", async () => {
    const mockedCliDriverContext = {
      ...mockedDriverContext,
      platform: Platform.CLI,
    };
    const args: CreateAppPackageArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
      outputZipPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
      outputJsonPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
    };

    const manifest = new TeamsAppManifest();
    manifest.composeExtensions = [
      {
        composeExtensionType: "apiBased",
        apiSpecificationFile: "resources/openai.yml",
        commands: [
          {
            id: "GET /repairs",
            apiResponseRenderingTemplateFile: "resources/repairs.json",
            title: "fake",
          },
        ],
        botId: "",
      },
    ];
    manifest.icons = {
      color: "resources/color.png",
      outline: "resources/outline.png",
    };
    manifest.localizationInfo = {
      defaultLanguageTag: "en",
      additionalLanguages: [
        {
          languageTag: "de",
          file: "resources/de.json",
        },
      ],
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));

    sinon.stub(fs, "chmod").callsFake(async () => {});
    sinon.stub(fs, "writeFile").callsFake(async () => {});

    const result = (await teamsAppDriver.execute(args, mockedCliDriverContext)).result;
    chai.assert(result.isOk());
    if (await fs.pathExists(args.outputZipPath)) {
      await fs.remove(args.outputZipPath);
    }
  });

  it("happy path - relative path", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
      outputZipPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
      outputJsonPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
    };

    const manifest = new TeamsAppManifest();
    manifest.composeExtensions = [
      {
        composeExtensionType: "apiBased",
        apiSpecificationFile: "manifest.template.json",
        commands: [
          {
            id: "GET /repairs",
            apiResponseRenderingTemplateFile: "manifest.template.json",
            title: "fake",
          },
        ],
        botId: "",
      },
    ];
    manifest.icons = {
      color: "resources/color.png",
      outline: "resources/outline.png",
    };
    manifest.localizationInfo = {
      defaultLanguageTag: "en",
      additionalLanguages: [
        {
          languageTag: "de",
          file: "resources/de.json",
        },
      ],
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));

    sinon.stub(fs, "chmod").callsFake(async () => {});
    sinon.stub(fs, "writeFile").callsFake(async () => {});

    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert(result.isOk());
    if (await fs.pathExists(args.outputZipPath)) {
      await fs.remove(args.outputZipPath);
    }

    const executeResult = await teamsAppDriver.execute(args, mockedDriverContext);
    chai.assert.isTrue(executeResult.result.isOk());
  });

  it("happy path - no AC template", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
      outputZipPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
      outputJsonPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
    };

    const manifest = new TeamsAppManifest();
    manifest.composeExtensions = [
      {
        composeExtensionType: "apiBased",
        apiSpecificationFile: "manifest.template.json",
        commands: [
          {
            id: "GET /repairs",
            title: "fake",
          },
        ],
        botId: "",
      },
    ];
    manifest.icons = {
      color: "resources/color.png",
      outline: "resources/outline.png",
    };
    manifest.localizationInfo = {
      defaultLanguageTag: "en",
      additionalLanguages: [
        {
          languageTag: "de",
          file: "resources/de.json",
        },
      ],
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));

    sinon.stub(fs, "chmod").callsFake(async () => {});
    sinon.stub(fs, "writeFile").callsFake(async () => {});

    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert(result.isOk());
    if (await fs.pathExists(args.outputZipPath)) {
      await fs.remove(args.outputZipPath);
    }

    const executeResult = await teamsAppDriver.execute(args, mockedDriverContext);
    chai.assert.isTrue(executeResult.result.isOk());
  });

  it("happy path - API plugin", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
      outputZipPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
      outputJsonPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
    };

    const manifest = new TeamsAppManifest();
    manifest.plugins = [
      {
        file: "resources/ai-plugin.json",
        id: "plugin1",
      },
    ];
    manifest.icons = {
      color: "resources/color.png",
      outline: "resources/outline.png",
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));
    sinon.stub(fs, "chmod").callsFake(async () => {});
    sinon.stub(fs, "writeFile").callsFake(async () => {});

    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    if (result.isErr()) {
      console.log(result.error);
    }
    chai.assert.isTrue(result.isOk());
    const outputExist = await fs.pathExists(args.outputZipPath);
    chai.assert.isTrue(outputExist);
    if (outputExist) {
      const zip = new AdmZip(args.outputZipPath);
      let aiPluginContent = "";
      let openapiContent = "";

      const entries = zip.getEntries();
      entries.forEach((e) => {
        const name = e.entryName;
        if (name.endsWith("ai-plugin.json")) {
          const data = e.getData();
          aiPluginContent = data.toString("utf8");
        }

        if (name.endsWith("openai.yml")) {
          const data = e.getData();
          openapiContent = data.toString("utf8");
        }
      });

      chai.assert(
        openapiContent &&
          aiPluginContent &&
          openapiContent.search("APP_NAME_SUFFIX") < 0 &&
          aiPluginContent.search(openapiServerPlaceholder) < 0
      );
      await fs.remove(args.outputZipPath);
    }
  });

  it("invalid color file", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
      outputZipPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
      outputJsonPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
    };

    const manifest = new TeamsAppManifest();
    manifest.icons = {
      color: "../color.png",
      outline: "resources/outline.png",
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));
    sinon.stub(fs, "pathExists").callsFake(() => {
      return true;
    });
    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.isTrue(result.error instanceof InvalidFileOutsideOfTheDirectotryError);
    }
  });

  it("invalid outline file", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
      outputZipPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
      outputJsonPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
    };

    const manifest = new TeamsAppManifest();
    manifest.icons = {
      color: "resources/color.png",
      outline: "../outline.png",
    };
    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));
    sinon.stub(fs, "pathExists").callsFake((filePath) => {
      return true;
    });
    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.isTrue(result.error instanceof InvalidFileOutsideOfTheDirectotryError);
    }
  });

  it("invalid api spec file", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
      outputZipPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
      outputJsonPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
    };

    const manifest = new TeamsAppManifest();
    manifest.composeExtensions = [
      {
        composeExtensionType: "apiBased",
        apiSpecificationFile: "../openai.yml",
        commands: [
          {
            id: "GET /repairs",
            apiResponseRenderingTemplateFile: "resources/repairs.json",
            title: "fake",
          },
        ],
        botId: "",
      },
    ];
    manifest.icons = {
      color: "resources/color.png",
      outline: "resources/outline.png",
    };

    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));
    sinon.stub(fs, "pathExists").callsFake((filePath) => {
      return true;
    });
    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.isTrue(result.error instanceof InvalidFileOutsideOfTheDirectotryError);
    }
  });

  it("invalid response template file", async () => {
    const args: CreateAppPackageArgs = {
      manifestPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
      outputZipPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
      outputJsonPath:
        "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
    };

    const manifest = new TeamsAppManifest();
    manifest.composeExtensions = [
      {
        composeExtensionType: "apiBased",
        apiSpecificationFile: "resources/openai.yml",
        commands: [
          {
            id: "GET /repairs",
            apiResponseRenderingTemplateFile: "../repairs.json",
            title: "fake",
          },
        ],
        botId: "",
      },
    ];
    manifest.icons = {
      color: "resources/color.png",
      outline: "resources/outline.png",
    };

    sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));
    sinon.stub(fs, "pathExists").callsFake((filePath) => {
      return true;
    });
    const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.isTrue(result.error instanceof InvalidFileOutsideOfTheDirectotryError);
    }
  });

  describe("copilotGpt", async () => {
    it("happy path ", async () => {
      const args: CreateAppPackageArgs = {
        manifestPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
        outputZipPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
        outputJsonPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
      };

      const manifest = new TeamsAppManifest();
      manifest.copilotGpts = [
        {
          file: "resources/gpt.json",
          id: "plugin1",
        },
      ];
      manifest.icons = {
        color: "resources/color.png",
        outline: "resources/outline.png",
      };
      sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));
      sinon.stub(fs, "chmod").callsFake(async () => {});
      sinon.stub(fs, "writeFile").callsFake(async () => {});

      const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;
      if (result.isErr()) {
        console.log(result.error);
      }
      chai.assert.isTrue(result.isOk());
      const outputExist = await fs.pathExists(args.outputZipPath);
      chai.assert.isTrue(outputExist);
      if (outputExist) {
        const zip = new AdmZip(args.outputZipPath);
        let gptManifestContent = "";
        let plugin = "";
        let apiSpec = "";

        const entries = zip.getEntries();
        entries.forEach((e) => {
          const name = e.entryName;
          if (name.endsWith("gpt.json")) {
            const data = e.getData();
            gptManifestContent = data.toString("utf8");
          } else if (name.endsWith("ai-plugin.json")) {
            const data = e.getData();
            plugin = data.toString("utf8");
          } else if (name.endsWith("openai.yml")) {
            const data = e.getData();
            apiSpec = data.toString("utf8");
          }
        });

        chai.assert(
          plugin &&
            apiSpec &&
            gptManifestContent &&
            gptManifestContent.search("APP_NAME_SUFFIX") < 0 &&
            gptManifestContent.search("test") > 0
        );
        await fs.remove(args.outputZipPath);
      }
    });

    it("error if gpt manifest does not exist ", async () => {
      const args: CreateAppPackageArgs = {
        manifestPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
        outputZipPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
        outputJsonPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
      };

      const manifest = new TeamsAppManifest();
      manifest.copilotGpts = [
        {
          file: "resources/gpt.json",
          id: "plugin1",
        },
      ];
      manifest.icons = {
        color: "resources/color.png",
        outline: "resources/outline.png",
      };
      sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));
      sinon.stub(fs, "chmod").callsFake(async () => {});
      sinon.stub(fs, "writeFile").callsFake(async () => {});
      sinon.stub(fs, "pathExists").callsFake(async (path: string) => {
        if (path.endsWith("gpt.json")) {
          return false;
        } else {
          return true;
        }
      });

      const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;

      chai.assert.isTrue(result.isErr());

      if (result.isErr()) {
        chai.assert.isTrue(result.error instanceof FileNotFoundError);
      }
    });

    it("error if parse gpt manifest error ", async () => {
      const args: CreateAppPackageArgs = {
        manifestPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
        outputZipPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
        outputJsonPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
      };

      const manifest = new TeamsAppManifest();
      manifest.copilotGpts = [
        {
          file: "resources/gpt.json",
          id: "plugin1",
        },
      ];
      manifest.icons = {
        color: "resources/color.png",
        outline: "resources/outline.png",
      };
      sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));
      sinon.stub(fs, "chmod").callsFake(async () => {});
      sinon.stub(fs, "writeFile").callsFake(async () => {});
      sinon.stub(fs, "readFile").callsFake(async (file: fs.PathLike | number) => {
        if (file.toString().includes("gpt.json")) {
          return "" as any;
        } else {
          return JSON.stringify({});
        }
      });

      const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;

      chai.assert.isTrue(result.isErr());
      if (result.isErr()) {
        chai.assert.isTrue(result.error instanceof JSONSyntaxError);
      }
    });

    it("error when placeholder is not resolved in gpt manifest", async () => {
      const args: CreateAppPackageArgs = {
        manifestPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
        outputZipPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
        outputJsonPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
      };
      sinon.stub(fs, "pathExists").callsFake((filePath) => {
        return true;
      });

      const manifest = new TeamsAppManifest();
      manifest.icons = {
        color: "resources/color.png",
        outline: "resources/outline.png",
      };
      manifest.copilotGpts = [
        {
          file: "resources/gpt.json",
          id: "plugin1",
        },
      ];
      sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));
      sinon.stub(fs, "chmod").callsFake(async () => {});
      sinon.stub(fs, "writeFile").callsFake(async () => {});

      delete process.env["APP_NAME_SUFFIX"];
      const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;

      chai.assert(
        result.isErr() &&
          result.error.name === "MissingEnvironmentVariablesError" &&
          result.error.message.includes("APP_NAME_SUFFIX")
      );
    });

    it("error when add files for plugin failed", async () => {
      const args: CreateAppPackageArgs = {
        manifestPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
        outputZipPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/appPackage.dev.zip",
        outputJsonPath:
          "./tests/plugins/resource/appstudio/resources-multi-env/build/appPackage/manifest.dev.json",
      };

      const manifest = new TeamsAppManifest();
      manifest.copilotGpts = [
        {
          file: "resources/gpt.json",
          id: "plugin1",
        },
      ];
      manifest.icons = {
        color: "resources/color.png",
        outline: "resources/outline.png",
      };
      sinon.stub(manifestUtils, "getManifestV3").resolves(ok(manifest));
      sinon.stub(fs, "chmod").callsFake(async () => {});
      sinon.stub(fs, "writeFile").callsFake(async () => {});
      delete process.env[openapiServerPlaceholder];

      const result = (await teamsAppDriver.execute(args, mockedDriverContext)).result;

      chai.assert.isTrue(result.isErr());
      if (result.isErr()) {
        chai.assert(
          result.isErr() &&
            result.error.name === "MissingEnvironmentVariablesError" &&
            result.error.message.includes(openapiServerPlaceholder)
        );
      }
    });
  });
});
