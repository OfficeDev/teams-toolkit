/* eslint-disable @typescript-eslint/no-non-null-assertion */
import "mocha";
import { assert } from "chai";
import * as sinon from "sinon";
import { ManifestUtils } from "../../../../src/component/driver/teamsApp/utils/ManifestUtils";
import fs from "fs-extra";
import {
  TeamsAppManifest,
  FxError,
  InputsWithProjectPath,
  Result,
  ok,
  err,
  Platform,
  ManifestCapability,
} from "@microsoft/teamsfx-api";
import {
  getBotsTplBasedOnVersion,
  getConfigurableTabsTplBasedOnVersion,
  getConfigurableTabsTplExistingAppBasedOnVersion,
} from "../../../../src/component/driver/teamsApp/constants";

const defaultManifestVersion = "1.17";
const oldManifestVersion = "1.16";

describe("ManifestUtils", () => {
  let manifestUtils: ManifestUtils;

  beforeEach(() => {
    manifestUtils = new ManifestUtils();
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should add a staticTab capability", async () => {
    mockInputManifestFile(manifestUtils, defaultManifestVersion);
    sinon.stub(fs, "writeFile").callsFake((path: any, data: string) => {
      const writtenManifest = JSON.parse(data) as TeamsAppManifest;
      assert.isArray(writtenManifest.staticTabs);
      assert.isNotEmpty(writtenManifest.staticTabs);
      return Promise.resolve();
    });
    const inputs: InputsWithProjectPath = {
      projectPath: "path/to/project",
      addManifestPath: "path/to/manifest.json",
      platform: Platform.CLI,
    };
    const capabilities: ManifestCapability[] = [{ name: "staticTab" }];
    const result = await manifestUtils.addCapabilities(inputs, capabilities);
    assert.isTrue(result.isOk());
  });
  it("should add a configurable tabs capability", async () => {
    mockInputManifestFile(manifestUtils, defaultManifestVersion);
    sinon.stub(fs, "writeFile").callsFake((path: any, data: string) => {
      const writtenManifest = JSON.parse(data) as TeamsAppManifest;
      assert.isArray(writtenManifest.configurableTabs);
      assert.isNotEmpty(writtenManifest.configurableTabs);
      assert.deepEqual(
        writtenManifest.configurableTabs![0].scopes,
        getConfigurableTabsTplBasedOnVersion(writtenManifest.manifestVersion)[0].scopes
      );
      return Promise.resolve();
    });
    const inputs: InputsWithProjectPath = {
      projectPath: "path/to/project",
      addManifestPath: "path/to/manifest.json",
      platform: Platform.CLI,
    };
    const capabilities: ManifestCapability[] = [{ name: "configurableTab" }];
    const result = await manifestUtils.addCapabilities(inputs, capabilities);
    assert.isTrue(result.isOk());
  });
  it("should add a configurable tabs capability - existing app", async () => {
    mockInputManifestFile(manifestUtils, defaultManifestVersion);
    sinon.stub(fs, "writeFile").callsFake((path: any, data: string) => {
      const writtenManifest = JSON.parse(data) as TeamsAppManifest;
      assert.isArray(writtenManifest.configurableTabs);
      assert.isNotEmpty(writtenManifest.configurableTabs);
      assert.deepEqual(
        writtenManifest.configurableTabs![0].scopes,
        getConfigurableTabsTplExistingAppBasedOnVersion(writtenManifest.manifestVersion)[0].scopes
      );
      return Promise.resolve();
    });
    const inputs: InputsWithProjectPath = {
      projectPath: "path/to/project",
      addManifestPath: "path/to/manifest.json",
      platform: Platform.CLI,
    };
    const capabilities: ManifestCapability[] = [{ name: "configurableTab", existingApp: true }];
    const result = await manifestUtils.addCapabilities(inputs, capabilities);
    assert.isTrue(result.isOk());
  });
  it("should add a configurable tabs capability - old version", async () => {
    mockInputManifestFile(manifestUtils, oldManifestVersion);
    sinon.stub(fs, "writeFile").callsFake((path: any, data: string) => {
      const writtenManifest = JSON.parse(data) as TeamsAppManifest;
      assert.isArray(writtenManifest.configurableTabs);
      assert.isNotEmpty(writtenManifest.configurableTabs);
      assert.deepEqual(
        writtenManifest.configurableTabs![0].scopes,
        getConfigurableTabsTplBasedOnVersion(writtenManifest.manifestVersion)[0].scopes
      );
      return Promise.resolve();
    });
    const inputs: InputsWithProjectPath = {
      projectPath: "path/to/project",
      addManifestPath: "path/to/manifest.json",
      platform: Platform.CLI,
    };
    const capabilities: ManifestCapability[] = [{ name: "configurableTab" }];
    const result = await manifestUtils.addCapabilities(inputs, capabilities);
    assert.isTrue(result.isOk());
  });
  it("should add a bot capability", async () => {
    mockInputManifestFile(manifestUtils, defaultManifestVersion);
    sinon.stub(fs, "writeFile").callsFake((path: any, data: string) => {
      const writtenManifest = JSON.parse(data) as TeamsAppManifest;
      assert.isArray(writtenManifest.bots);
      assert.isNotEmpty(writtenManifest.bots);
      assert.deepEqual(
        writtenManifest.bots![0].scopes,
        getBotsTplBasedOnVersion(writtenManifest.manifestVersion)[0].scopes
      );
      return Promise.resolve();
    });
    const inputs: InputsWithProjectPath = {
      projectPath: "path/to/project",
      addManifestPath: "path/to/manifest.json",
      platform: Platform.CLI,
    };
    const capabilities: ManifestCapability[] = [{ name: "Bot" }];
    const result = await manifestUtils.addCapabilities(inputs, capabilities);
    assert.isTrue(result.isOk());
  });
});

function mockInputManifestFile(manifestUtils: ManifestUtils, manifestVersion: string) {
  const mockManifest = {
    $schema:
      "https://developer.microsoft.com/en-us/json-schemas/teams/v1.17/MicrosoftTeams.schema.json",
    manifestVersion: manifestVersion,
    version: "1.0.0",
    id: "test-id",
    developer: {
      name: "Test Name",
      websiteUrl: "https://your-website.com",
      privacyUrl: "https://your-privacy-url.com",
      termsOfUseUrl: "https://your-terms-of-use-url.com",
    },
    name: { short: "Test App Name" },
    description: { short: "Test app description" },
    icons: {
      color: "https://your-app-color-icon.png",
      outline: "https://your-app-outline-icon.png",
    },
    accentColor: "#FFFFFF",
  };
  sinon.stub(manifestUtils, "_readAppManifest").resolves(ok(mockManifest));
}
