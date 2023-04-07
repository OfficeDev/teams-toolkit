/**
 * @author Yuqi Zhou <yuqzho@microsoft.com>
 */
import { err, Inputs, ok, Platform, TeamsAppManifest, UserError } from "@microsoft/teamsfx-api";
import "mocha";
import chai from "chai";
import * as sinon from "sinon";
import { createContextV3 } from "../../src/component/utils";
import { MockedAzureAccountProvider, MockedM365Provider } from "../plugins/solution/util";
import * as appStudio from "../../src/component/resource/appManifest/appStudio";
import {
  developerPortalScaffoldUtils,
  getTemplateId,
} from "../../src/component/developerPortalScaffoldUtils";
import { AppDefinition } from "../../src/component/resource/appManifest/interfaces/appDefinition";
import { ObjectIsUndefinedError } from "../../src/core/error";
import fs from "fs-extra";
import path from "path";
import { CoreQuestionNames } from "../../src/core/question";
import {
  BOTS_TPL_V3,
  COMPOSE_EXTENSIONS_TPL_V3,
  DEFAULT_DEVELOPER,
} from "../../src/component/resource/appManifest/constants";
import { manifestUtils } from "../../src/component/resource/appManifest/utils/ManifestUtils";
import { Bot } from "../../src/component/resource/appManifest/interfaces/bot";
import { ConfigurableTab } from "../../src/component/resource/appManifest/interfaces/configurableTab";
import {
  CommandScope,
  MeetingsContext,
} from "../../src/component/resource/appManifest/utils/utils";
import { StaticTab } from "../../src/component/resource/appManifest/interfaces/staticTab";
import { MessagingExtension } from "../../src/component/resource/appManifest/interfaces/messagingExtension";
import {
  BotOptionItem,
  DefaultBotAndMessageExtensionItem,
  MessageExtensionNewUIItem,
  TabNonSsoAndDefaultBotItem,
  TabNonSsoItem,
} from "../../src/component/constants";

describe("developPortalScaffoldUtils", () => {
  describe("updateFilesForTdp", () => {
    const sandbox = sinon.createSandbox();
    class MockedWriteStream {
      write(): boolean {
        return true;
      }
      end(): boolean {
        return true;
      }
    }

    afterEach(() => {
      sandbox.restore();
    });
    it("missing project path", async () => {
      const ctx = createContextV3();
      ctx.tokenProvider = {
        m365TokenProvider: new MockedM365Provider(),
        azureAccountProvider: new MockedAzureAccountProvider(),
      };
      const appDefinition: AppDefinition = {
        appId: "mock-app-id",
        teamsAppId: "mock-app-id",
      };
      const inputs: Inputs = { platform: Platform.VSCode };

      const res = await developerPortalScaffoldUtils.updateFilesForTdp(ctx, appDefinition, inputs);
      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.isTrue(res.error instanceof ObjectIsUndefinedError);
      }
    });

    it("missing token provider", async () => {
      const ctx = createContextV3();
      const appDefinition: AppDefinition = {
        appId: "mock-app-id",
        teamsAppId: "mock-app-id",
      };
      const inputs: Inputs = { platform: Platform.VSCode };
      ctx.tokenProvider = undefined;
      ctx.projectPath = "project-path";

      const res = await developerPortalScaffoldUtils.updateFilesForTdp(ctx, appDefinition, inputs);
      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.isTrue(res.error instanceof ObjectIsUndefinedError);
      }
    });

    it("get App package error", async () => {
      const ctx = createContextV3();
      ctx.tokenProvider = {
        m365TokenProvider: new MockedM365Provider(),
        azureAccountProvider: new MockedAzureAccountProvider(),
      };
      ctx.projectPath = "project-path";
      const appDefinition: AppDefinition = {
        appId: "mock-app-id",
        teamsAppId: "mock-app-id",
      };
      const inputs: Inputs = { platform: Platform.VSCode };

      sandbox
        .stub(appStudio, "getAppPackage")
        .resolves(err(new UserError("source", "getAppPackage", "msg", "msg")));
      const res = await developerPortalScaffoldUtils.updateFilesForTdp(ctx, appDefinition, inputs);

      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.equal(res.error.name, "getAppPackage");
      }
    });

    it("missing manifest error", async () => {
      const ctx = createContextV3();
      ctx.tokenProvider = {
        m365TokenProvider: new MockedM365Provider(),
        azureAccountProvider: new MockedAzureAccountProvider(),
      };
      ctx.projectPath = "project-path";
      const appDefinition: AppDefinition = {
        appId: "mock-app-id",
        teamsAppId: "mock-app-id",
      };
      const inputs: Inputs = { platform: Platform.VSCode };

      sandbox.stub(appStudio, "getAppPackage").resolves(ok({}));
      const res = await developerPortalScaffoldUtils.updateFilesForTdp(ctx, appDefinition, inputs);

      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.equal(res.error.name, "CouldNotFoundManifest");
      }
    });

    it("missing manifest.json from template", async () => {
      const ctx = createContextV3();
      ctx.tokenProvider = {
        m365TokenProvider: new MockedM365Provider(),
        azureAccountProvider: new MockedAzureAccountProvider(),
      };
      ctx.projectPath = "project-path";
      const appDefinition: AppDefinition = {
        appId: "mock-app-id",
        teamsAppId: "mock-app-id",
      };
      const inputs: Inputs = { platform: Platform.VSCode };

      const manifest: TeamsAppManifest = {
        manifestVersion: "version",
        id: "mock-app-id",
        name: { short: "short-name" },
        description: { short: "", full: "" },
        version: "version",
        icons: { outline: "outline.png", color: "color.png" },
        accentColor: "#ffffff",
        developer: {
          privacyUrl: "",
          websiteUrl: "",
          termsOfUseUrl: "",
          name: "developer-name",
        },
        staticTabs: [
          {
            name: "name0",
            entityId: "index0",
            scopes: ["personal"],
            contentUrl: "contentUrl0",
            websiteUrl: "websiteUrl0",
          },
          {
            name: "name1",
            entityId: "index1",
            scopes: ["personal"],
            contentUrl: "contentUrl1",
            websiteUrl: "websiteUrl1",
          },
        ],
      };
      sandbox.stub(appStudio, "getAppPackage").resolves(
        ok({
          manifest: Buffer.from(JSON.stringify(manifest)),
          icons: { color: Buffer.from(""), outline: Buffer.from("") },
          languages: { zh: Buffer.from(JSON.stringify({})) },
        })
      );
      sandbox
        .stub(manifestUtils, "_readAppManifest")
        .resolves(ok(undefined as unknown as TeamsAppManifest));
      const res = await developerPortalScaffoldUtils.updateFilesForTdp(ctx, appDefinition, inputs);

      chai.assert.isTrue(res.isErr());
      if (res.isErr()) {
        chai.assert.isTrue(res.error instanceof ObjectIsUndefinedError);
      }
    });

    it("update files successfully", async () => {
      const ctx = createContextV3();
      ctx.tokenProvider = {
        m365TokenProvider: new MockedM365Provider(),
        azureAccountProvider: new MockedAzureAccountProvider(),
      };
      ctx.projectPath = "project-path";
      const appDefinition: AppDefinition = {
        appId: "mock-app-id",
        teamsAppId: "mock-app-id",
        staticTabs: [
          {
            objectId: "objId",
            entityId: "entityId",
            name: "tab",
            contentUrl: "https://url",
            websiteUrl: "https:/url",
            scopes: [],
            context: [],
          },
        ],
      };
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.ReplaceWebsiteUrl]: ["name0"],
        [CoreQuestionNames.ReplaceContentUrl]: ["name1"],
      };
      const manifest: TeamsAppManifest = {
        manifestVersion: "version",
        id: "mock-app-id",
        name: { short: "short-name" },
        description: { short: "", full: "" },
        version: "version",
        icons: { outline: "outline.png", color: "color.png" },
        accentColor: "#ffffff",
        developer: {
          privacyUrl: "",
          websiteUrl: "",
          termsOfUseUrl: "",
          name: "developer-name",
        },
        staticTabs: [
          {
            name: "name0",
            entityId: "index0",
            scopes: ["personal"],
            contentUrl: "contentUrl0",
            websiteUrl: "websiteUrl0",
          },
          {
            name: "name1",
            entityId: "index1",
            scopes: ["personal"],
            contentUrl: "contentUrl1",
            websiteUrl: "websiteUrl1",
          },
        ],
      };

      const manifestTemplate: TeamsAppManifest = {
        manifestVersion: "version",
        id: "mock-app-id",
        name: { short: "short-name" },
        description: { short: "", full: "" },
        version: "version",
        icons: { outline: "outline.png", color: "color.png" },
        accentColor: "#ffffff",
        developer: {
          privacyUrl: "",
          websiteUrl: "",
          termsOfUseUrl: "",
          name: "developer-name",
        },
        staticTabs: [
          {
            name: "name0",
            entityId: "index0",
            scopes: ["personal"],
            contentUrl: "localhost/content",
            websiteUrl: "localhost/website",
          },
        ],
      };

      let updateManifest = false;
      let updateLanguage = false;
      let updateColor = false;
      let updateOutline = false;
      let updatedManifestData = "";

      sandbox.stub(appStudio, "getAppPackage").resolves(
        ok({
          manifest: Buffer.from(JSON.stringify(manifest)),
          icons: { color: Buffer.from(""), outline: Buffer.from("") },
          languages: { zh: Buffer.from(JSON.stringify({})) },
        })
      );
      sandbox.stub(fs, "writeFile").callsFake((file: number | fs.PathLike, data: any) => {
        if (file === path.join(ctx.projectPath!, "appPackage", "color.png")) {
          updateColor = true;
        } else if (file === path.join(ctx.projectPath!, "appPackage", "outline.png")) {
          updateOutline = true;
        } else if (file === path.join(ctx.projectPath!, "appPackage", "zh.json")) {
          updateLanguage = true;
        } else if (file === path.join(ctx.projectPath!, "appPackage", "manifest.json")) {
          updateManifest = true;
          updatedManifestData = data;
        } else {
          throw new Error("not support " + file);
        }
      });

      const mockWriteStream = new MockedWriteStream();
      sandbox.stub(fs, "createWriteStream").returns(mockWriteStream as any);
      const writeSpy = sandbox.stub(mockWriteStream, "write").resolves();
      sandbox.stub(mockWriteStream, "end").resolves();
      sandbox.stub(fs, "readFile").callsFake((file: number | fs.PathLike) => {
        if (file === path.join(ctx.projectPath!, "env", ".env.local")) {
          return Promise.resolve(Buffer.from("TEAMS_APP_ID=\nENV=\n"));
        } else {
          throw new Error("not support " + file);
        }
      });
      sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(manifestTemplate));
      const res = await developerPortalScaffoldUtils.updateFilesForTdp(ctx, appDefinition, inputs);

      chai.assert.isTrue(res.isOk());
      chai.assert.isTrue(updateManifest);
      chai.assert.isTrue(updateColor);
      chai.assert.isTrue(updateOutline);
      chai.assert.isTrue(updateLanguage);
      const updatedManifest = JSON.parse(updatedManifestData) as TeamsAppManifest;
      chai.assert.equal(updatedManifest.id, "${{TEAMS_APP_ID}}");
      chai.assert.equal(updatedManifest.staticTabs![0].contentUrl, "contentUrl0");
      chai.assert.equal(updatedManifest.staticTabs![0].websiteUrl, "localhost/website");
      chai.assert.equal(updatedManifest.staticTabs![1].websiteUrl, "websiteUrl1");
      chai.assert.equal(updatedManifest.staticTabs![1].contentUrl, "localhost/content");
      chai.assert.equal(updatedManifest.developer.privacyUrl, DEFAULT_DEVELOPER.privacyUrl);
      chai.assert.equal(updatedManifest.developer.termsOfUseUrl, DEFAULT_DEVELOPER.termsOfUseUrl);
      chai.assert.equal(updatedManifest.developer.websiteUrl, DEFAULT_DEVELOPER.websiteUrl);
      chai.assert.isTrue(updatedManifest.validDomains?.includes("${{TAB_DOMAIN}}"));
      chai.assert.isTrue(writeSpy.calledThrice);
      chai.assert.isTrue(writeSpy.firstCall.firstArg.includes("TEAMS_APP_ID=mock-app-id"));
    });

    it("update files successfully but keep url", async () => {
      const ctx = createContextV3();
      ctx.tokenProvider = {
        m365TokenProvider: new MockedM365Provider(),
        azureAccountProvider: new MockedAzureAccountProvider(),
      };
      ctx.projectPath = "project-path";
      const appDefinition: AppDefinition = {
        appId: "mock-app-id",
        teamsAppId: "mock-app-id",
        staticTabs: [
          {
            objectId: "objId",
            entityId: "entityId",
            name: "tab",
            contentUrl: "https://url",
            websiteUrl: "https:/url",
            scopes: [],
            context: [],
          },
        ],
      };
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.ReplaceWebsiteUrl]: [],
        [CoreQuestionNames.ReplaceContentUrl]: [],
      };
      const manifest: TeamsAppManifest = {
        manifestVersion: "version",
        id: "mock-app-id",
        name: { short: "short-name" },
        description: { short: "", full: "" },
        version: "version",
        icons: { outline: "outline.png", color: "color.png" },
        accentColor: "#ffffff",
        developer: {
          privacyUrl: "",
          websiteUrl: "",
          termsOfUseUrl: "",
          name: "developer-name",
        },
        staticTabs: [
          {
            name: "name0",
            entityId: "index0",
            scopes: ["personal"],
            contentUrl: "contentUrl0",
            websiteUrl: "websiteUrl0",
          },
          {
            name: "name1",
            entityId: "index1",
            scopes: ["personal"],
            contentUrl: "contentUrl1",
            websiteUrl: "websiteUrl1",
          },
        ],
      };

      let updateManifest = false;
      let updateLanguage = false;
      let updateColor = false;
      let updateOutline = false;
      let updatedManifestData = "";
      sandbox.stub(appStudio, "getAppPackage").resolves(
        ok({
          manifest: Buffer.from(JSON.stringify(manifest)),
          icons: { color: Buffer.from(""), outline: Buffer.from("") },
          languages: { zh: Buffer.from(JSON.stringify({})) },
        })
      );
      sandbox.stub(fs, "writeFile").callsFake((file: number | fs.PathLike, data: any) => {
        if (file === path.join(ctx.projectPath!, "appPackage", "color.png")) {
          updateColor = true;
        } else if (file === path.join(ctx.projectPath!, "appPackage", "outline.png")) {
          updateOutline = true;
        } else if (file === path.join(ctx.projectPath!, "appPackage", "zh.json")) {
          updateLanguage = true;
        } else if (file === path.join(ctx.projectPath!, "appPackage", "manifest.json")) {
          updateManifest = true;
          updatedManifestData = data;
        } else {
          throw new Error("not support " + file);
        }
      });

      const mockWriteStream = new MockedWriteStream();
      sandbox.stub(fs, "createWriteStream").returns(mockWriteStream as any);
      const writeSpy = sandbox.stub(mockWriteStream, "write").resolves();
      sandbox.stub(mockWriteStream, "end").resolves();
      sandbox.stub(fs, "readFile").callsFake((file: number | fs.PathLike) => {
        if (file === path.join(ctx.projectPath!, "env", ".env.local")) {
          return Promise.resolve(Buffer.from("TEAMS_APP_ID=\nENV=\n"));
        } else {
          throw new Error("not support " + file);
        }
      });
      sandbox.stub(manifestUtils, "_readAppManifest").resolves(
        ok({
          manifestVersion: "version",
          id: "mock-app-id",
          name: { short: "short-name" },
          description: { short: "", full: "" },
          version: "version",
          icons: { outline: "outline.png", color: "color.png" },
          accentColor: "#ffffff",
          developer: {
            privacyUrl: "",
            websiteUrl: "",
            termsOfUseUrl: "",
            name: "developer-name",
          },
          staticTabs: [
            {
              name: "name0",
              entityId: "index0",
              scopes: ["personal"],
              contentUrl: "contentUrlnew0",
              websiteUrl: "websiteUrlnew0",
            },
          ],
        })
      );

      const res = await developerPortalScaffoldUtils.updateFilesForTdp(ctx, appDefinition, inputs);

      chai.assert.isTrue(res.isOk());
      chai.assert.isTrue(updateManifest);
      chai.assert.isTrue(updateColor);
      chai.assert.isTrue(updateOutline);
      chai.assert.isTrue(updateLanguage);
      const updatedManifest = JSON.parse(updatedManifestData) as TeamsAppManifest;
      chai.assert.equal(updatedManifest.id, "${{TEAMS_APP_ID}}");
      chai.assert.equal(updatedManifest.staticTabs![0].contentUrl, "contentUrl0");
      chai.assert.equal(updatedManifest.staticTabs![0].websiteUrl, "websiteUrl0");
      chai.assert.equal(updatedManifest.staticTabs![1].websiteUrl, "websiteUrl1");
      chai.assert.equal(updatedManifest.staticTabs![1].contentUrl, "contentUrl1");
      chai.assert.equal(updatedManifest.developer.privacyUrl, DEFAULT_DEVELOPER.privacyUrl);
      chai.assert.equal(updatedManifest.developer.termsOfUseUrl, DEFAULT_DEVELOPER.termsOfUseUrl);
      chai.assert.equal(updatedManifest.developer.websiteUrl, DEFAULT_DEVELOPER.websiteUrl);
      chai.assert.equal(updatedManifest.validDomains, undefined);
      chai.assert.isTrue(writeSpy.calledThrice);
      chai.assert.isTrue(writeSpy.firstCall.firstArg.includes("TEAMS_APP_ID=mock-app-id"));
    });

    it("update bot id only", async () => {
      const ctx = createContextV3();
      ctx.tokenProvider = {
        m365TokenProvider: new MockedM365Provider(),
        azureAccountProvider: new MockedAzureAccountProvider(),
      };
      ctx.projectPath = "project-path";
      const appDefinition: AppDefinition = {
        appId: "mock-app-id",
        teamsAppId: "mock-app-id",
        staticTabs: [
          {
            objectId: "objId",
            entityId: "entityId",
            name: "tab",
            contentUrl: "https://url",
            websiteUrl: "https:/url",
            scopes: [],
            context: [],
          },
        ],
      };
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.ReplaceBotIds]: ["bot"],
      };
      const manifest: TeamsAppManifest = {
        manifestVersion: "version",
        id: "mock-app-id",
        name: { short: "short-name" },
        description: { short: "", full: "" },
        version: "version",
        icons: { outline: "outline.png", color: "color.png" },
        accentColor: "#ffffff",
        developer: {
          privacyUrl: "",
          websiteUrl: "",
          termsOfUseUrl: "",
          name: "developer-name",
        },
        bots: [
          {
            botId: "botId0",
            scopes: ["personal"],
            commandLists: [],
          },
        ],
        composeExtensions: [
          {
            botId: "botId1",
            commands: [],
          },
        ],
      };

      const existingManifest: TeamsAppManifest = {
        manifestVersion: "version",
        id: "mock-app-id",
        name: { short: "short-name" },
        description: { short: "", full: "" },
        version: "version",
        icons: { outline: "outline.png", color: "color.png" },
        accentColor: "#ffffff",
        developer: {
          privacyUrl: "",
          websiteUrl: "",
          termsOfUseUrl: "",
          name: "developer-name",
        },
        bots: [],
        validDomains: ["valid-domain"],
      };

      let updateManifest = false;
      let updateLanguage = false;
      let updateColor = false;
      let updateOutline = false;
      let updatedManifestData = "";
      sandbox.stub(appStudio, "getAppPackage").resolves(
        ok({
          manifest: Buffer.from(JSON.stringify(manifest)),
          icons: { color: Buffer.from(""), outline: Buffer.from("") },
          languages: { zh: Buffer.from(JSON.stringify({})) },
        })
      );
      sandbox.stub(fs, "writeFile").callsFake((file: number | fs.PathLike, data: any) => {
        if (file === path.join(ctx.projectPath!, "appPackage", "color.png")) {
          updateColor = true;
        } else if (file === path.join(ctx.projectPath!, "appPackage", "outline.png")) {
          updateOutline = true;
        } else if (file === path.join(ctx.projectPath!, "appPackage", "zh.json")) {
          updateLanguage = true;
        } else if (file === path.join(ctx.projectPath!, "appPackage", "manifest.json")) {
          updateManifest = true;
          updatedManifestData = data;
        } else {
          throw new Error("not support " + file);
        }
      });

      const mockWriteStream = new MockedWriteStream();
      sandbox.stub(fs, "createWriteStream").returns(mockWriteStream as any);
      const writeSpy = sandbox.stub(mockWriteStream, "write").resolves();
      sandbox.stub(mockWriteStream, "end").resolves();
      sandbox.stub(fs, "readFile").callsFake((file: number | fs.PathLike) => {
        if (file === path.join(ctx.projectPath!, "env", ".env.local")) {
          return Promise.resolve(Buffer.from("TEAMS_APP_ID=\nENV=\n"));
        } else {
          throw new Error("not support " + file);
        }
      });
      sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(existingManifest));
      const res = await developerPortalScaffoldUtils.updateFilesForTdp(ctx, appDefinition, inputs);

      chai.assert.isTrue(res.isOk());
      chai.assert.isTrue(updateManifest);
      chai.assert.isTrue(updateColor);
      chai.assert.isTrue(updateOutline);
      chai.assert.isTrue(updateLanguage);
      const updatedManifest = JSON.parse(updatedManifestData) as TeamsAppManifest;
      chai.assert.equal(updatedManifest.id, "${{TEAMS_APP_ID}}");
      const expectedBots = BOTS_TPL_V3;
      expectedBots[0].botId = "${{BOT_ID}}";
      chai.assert.deepEqual(updatedManifest.bots![0], expectedBots[0]);
      chai.assert.deepEqual(updatedManifest.composeExtensions![0], manifest.composeExtensions![0]);
      chai.assert.equal(updatedManifest.developer.privacyUrl, DEFAULT_DEVELOPER.privacyUrl);
      chai.assert.equal(updatedManifest.developer.termsOfUseUrl, DEFAULT_DEVELOPER.termsOfUseUrl);
      chai.assert.equal(updatedManifest.developer.websiteUrl, DEFAULT_DEVELOPER.websiteUrl);
      chai.assert.isUndefined(updatedManifest.validDomains);
      chai.assert.isTrue(writeSpy.calledThrice);
      chai.assert.isTrue(writeSpy.firstCall.firstArg.includes("TEAMS_APP_ID=mock-app-id"));
    });

    it("update bot id of message extension only", async () => {
      const ctx = createContextV3();
      ctx.tokenProvider = {
        m365TokenProvider: new MockedM365Provider(),
        azureAccountProvider: new MockedAzureAccountProvider(),
      };
      ctx.projectPath = "project-path";
      const appDefinition: AppDefinition = {
        appId: "mock-app-id",
        teamsAppId: "mock-app-id",
        staticTabs: [
          {
            objectId: "objId",
            entityId: "entityId",
            name: "tab",
            contentUrl: "https://url",
            websiteUrl: "https:/url",
            scopes: [],
            context: [],
          },
        ],
      };
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.ReplaceBotIds]: ["messageExtension"],
      };
      const manifest: TeamsAppManifest = {
        manifestVersion: "version",
        id: "mock-app-id",
        name: { short: "short-name" },
        description: { short: "", full: "" },
        version: "version",
        icons: { outline: "outline.png", color: "color.png" },
        accentColor: "#ffffff",
        developer: {
          privacyUrl: "",
          websiteUrl: "",
          termsOfUseUrl: "",
          name: "developer-name",
        },
        bots: [
          {
            botId: "botId0",
            scopes: ["personal"],
            commandLists: [],
          },
        ],
        composeExtensions: [
          {
            botId: "botId1",
            commands: [],
          },
        ],
        validDomains: [],
      };

      const existingManifest: TeamsAppManifest = {
        manifestVersion: "version",
        id: "mock-app-id",
        name: { short: "short-name" },
        description: { short: "", full: "" },
        version: "version",
        icons: { outline: "outline.png", color: "color.png" },
        accentColor: "#ffffff",
        developer: {
          privacyUrl: "",
          websiteUrl: "",
          termsOfUseUrl: "",
          name: "developer-name",
        },
        bots: [],
        composeExtensions: [
          {
            botId: "botId1",
            commands: [
              {
                id: "commandId",
                title: "commandTitle",
              },
            ],
          },
        ],
        validDomains: ["valid-domain"],
      };

      let updateManifest = false;
      let updateLanguage = false;
      let updateColor = false;
      let updateOutline = false;
      let updatedManifestData = "";
      sandbox.stub(appStudio, "getAppPackage").resolves(
        ok({
          manifest: Buffer.from(JSON.stringify(manifest)),
          icons: { color: Buffer.from(""), outline: Buffer.from("") },
          languages: { zh: Buffer.from(JSON.stringify({})) },
        })
      );
      sandbox.stub(fs, "writeFile").callsFake((file: number | fs.PathLike, data: any) => {
        if (file === path.join(ctx.projectPath!, "appPackage", "color.png")) {
          updateColor = true;
        } else if (file === path.join(ctx.projectPath!, "appPackage", "outline.png")) {
          updateOutline = true;
        } else if (file === path.join(ctx.projectPath!, "appPackage", "zh.json")) {
          updateLanguage = true;
        } else if (file === path.join(ctx.projectPath!, "appPackage", "manifest.json")) {
          updateManifest = true;
          updatedManifestData = data;
        } else {
          throw new Error("not support " + file);
        }
      });

      const mockWriteStream = new MockedWriteStream();
      sandbox.stub(fs, "createWriteStream").returns(mockWriteStream as any);
      const writeSpy = sandbox.stub(mockWriteStream, "write").resolves();
      sandbox.stub(mockWriteStream, "end").resolves();
      sandbox.stub(fs, "readFile").callsFake((file: number | fs.PathLike) => {
        if (file === path.join(ctx.projectPath!, "env", ".env.local")) {
          return Promise.resolve(Buffer.from("TEAMS_APP_ID=\nENV=\n"));
        } else {
          throw new Error("not support " + file);
        }
      });
      sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(existingManifest));
      const res = await developerPortalScaffoldUtils.updateFilesForTdp(ctx, appDefinition, inputs);

      chai.assert.isTrue(res.isOk());
      chai.assert.isTrue(updateManifest);
      chai.assert.isTrue(updateColor);
      chai.assert.isTrue(updateOutline);
      chai.assert.isTrue(updateLanguage);
      const updatedManifest = JSON.parse(updatedManifestData) as TeamsAppManifest;
      chai.assert.equal(updatedManifest.id, "${{TEAMS_APP_ID}}");
      chai.assert.deepEqual(updatedManifest.bots![0], manifest.bots![0]);
      chai.assert.deepEqual(
        updatedManifest.composeExtensions![0],
        existingManifest.composeExtensions![0]
      );
      chai.assert.equal(updatedManifest.developer.privacyUrl, DEFAULT_DEVELOPER.privacyUrl);
      chai.assert.equal(updatedManifest.developer.termsOfUseUrl, DEFAULT_DEVELOPER.termsOfUseUrl);
      chai.assert.equal(updatedManifest.developer.websiteUrl, DEFAULT_DEVELOPER.websiteUrl);
      chai.assert.equal(updatedManifest.validDomains?.length, 0);
      chai.assert.isTrue(writeSpy.calledThrice);
      chai.assert.isTrue(writeSpy.firstCall.firstArg.includes("TEAMS_APP_ID=mock-app-id"));
    });

    it("update bot id and message extension id", async () => {
      const ctx = createContextV3();
      ctx.tokenProvider = {
        m365TokenProvider: new MockedM365Provider(),
        azureAccountProvider: new MockedAzureAccountProvider(),
      };
      ctx.projectPath = "project-path";
      const appDefinition: AppDefinition = {
        appId: "mock-app-id",
        teamsAppId: "mock-app-id",
        staticTabs: [
          {
            objectId: "objId",
            entityId: "entityId",
            name: "tab",
            contentUrl: "https://url",
            websiteUrl: "https:/url",
            scopes: [],
            context: [],
          },
        ],
      };
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.ReplaceBotIds]: ["bot", "messageExtension"],
      };
      const manifest: TeamsAppManifest = {
        manifestVersion: "version",
        id: "mock-app-id",
        name: { short: "short-name" },
        description: { short: "", full: "" },
        version: "version",
        icons: { outline: "outline.png", color: "color.png" },
        accentColor: "#ffffff",
        developer: {
          privacyUrl: "",
          websiteUrl: "",
          termsOfUseUrl: "",
          name: "developer-name",
        },
        bots: [
          {
            botId: "botId0",
            scopes: ["personal"],
            commandLists: [],
          },
        ],
        composeExtensions: [
          {
            botId: "botId1",
            commands: [],
          },
        ],
        validDomains: [],
      };

      const existingManifest: TeamsAppManifest = {
        manifestVersion: "version",
        id: "mock-app-id",
        name: { short: "short-name" },
        description: { short: "", full: "" },
        version: "version",
        icons: { outline: "outline.png", color: "color.png" },
        accentColor: "#ffffff",
        developer: {
          privacyUrl: "",
          websiteUrl: "",
          termsOfUseUrl: "",
          name: "developer-name",
        },
        bots: [
          {
            botId: "{{BOT_ID}}",
            scopes: ["personal", "team"],
            supportsFiles: false,
            isNotificationOnly: false,
            commandLists: [
              {
                scopes: ["personal", "team", "groupchat"],
                commands: [],
              },
            ],
          },
        ],
        validDomains: ["valid-domain"],
      };

      let updateManifest = false;
      let updateLanguage = false;
      let updateColor = false;
      let updateOutline = false;
      let updatedManifestData = "";
      sandbox.stub(appStudio, "getAppPackage").resolves(
        ok({
          manifest: Buffer.from(JSON.stringify(manifest)),
          icons: { color: Buffer.from(""), outline: Buffer.from("") },
          languages: { zh: Buffer.from(JSON.stringify({})) },
        })
      );
      sandbox.stub(fs, "writeFile").callsFake((file: number | fs.PathLike, data: any) => {
        if (file === path.join(ctx.projectPath!, "appPackage", "color.png")) {
          updateColor = true;
        } else if (file === path.join(ctx.projectPath!, "appPackage", "outline.png")) {
          updateOutline = true;
        } else if (file === path.join(ctx.projectPath!, "appPackage", "zh.json")) {
          updateLanguage = true;
        } else if (file === path.join(ctx.projectPath!, "appPackage", "manifest.json")) {
          updateManifest = true;
          updatedManifestData = data;
        } else {
          throw new Error("not support " + file);
        }
      });

      const mockWriteStream = new MockedWriteStream();
      sandbox.stub(fs, "createWriteStream").returns(mockWriteStream as any);
      const writeSpy = sandbox.stub(mockWriteStream, "write").resolves();
      sandbox.stub(mockWriteStream, "end").resolves();
      sandbox.stub(fs, "readFile").callsFake((file: number | fs.PathLike) => {
        if (file === path.join(ctx.projectPath!, "env", ".env.local")) {
          return Promise.resolve(Buffer.from("TEAMS_APP_ID=\nENV=\n"));
        } else {
          throw new Error("not support " + file);
        }
      });
      sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(existingManifest));
      const res = await developerPortalScaffoldUtils.updateFilesForTdp(ctx, appDefinition, inputs);

      chai.assert.isTrue(res.isOk());
      chai.assert.isTrue(updateManifest);
      chai.assert.isTrue(updateColor);
      chai.assert.isTrue(updateOutline);
      chai.assert.isTrue(updateLanguage);
      const updatedManifest = JSON.parse(updatedManifestData) as TeamsAppManifest;
      chai.assert.equal(updatedManifest.id, "${{TEAMS_APP_ID}}");
      chai.assert.deepEqual(updatedManifest.bots![0], existingManifest.bots![0]);
      chai.assert.deepEqual(updatedManifest.composeExtensions![0].botId, "${{BOT_ID}}");
      chai.assert.deepEqual(
        updatedManifest.composeExtensions![0].commands,
        COMPOSE_EXTENSIONS_TPL_V3[0]!.commands
      );
      chai.assert.equal(updatedManifest.developer.privacyUrl, DEFAULT_DEVELOPER.privacyUrl);
      chai.assert.equal(updatedManifest.developer.termsOfUseUrl, DEFAULT_DEVELOPER.termsOfUseUrl);
      chai.assert.equal(updatedManifest.developer.websiteUrl, DEFAULT_DEVELOPER.websiteUrl);
      chai.assert.equal(updatedManifest.validDomains?.length, 0);
      chai.assert.isTrue(writeSpy.calledThrice);
      chai.assert.isTrue(writeSpy.firstCall.firstArg.includes("TEAMS_APP_ID=mock-app-id"));
    });

    it("update manifest if selecting capability from ttk UI", async () => {
      const ctx = createContextV3();
      ctx.tokenProvider = {
        m365TokenProvider: new MockedM365Provider(),
        azureAccountProvider: new MockedAzureAccountProvider(),
      };
      ctx.projectPath = "project-path";
      const appDefinition: AppDefinition = {
        appId: "mock-app-id",
        teamsAppId: "mock-app-id",
      };
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.ReplaceBotIds]: ["bot", "messageExtension"],
      };
      const manifest: TeamsAppManifest = {
        manifestVersion: "version",
        id: "mock-app-id",
        name: { short: "short-name" },
        description: { short: "", full: "" },
        version: "version",
        icons: { outline: "outline.png", color: "color.png" },
        accentColor: "#ffffff",
        developer: {
          privacyUrl: "",
          websiteUrl: "",
          termsOfUseUrl: "",
          name: "developer-name",
        },
      };

      const existingManifest: TeamsAppManifest = {
        manifestVersion: "version",
        id: "mock-app-id",
        name: { short: "short-name" },
        description: { short: "", full: "" },
        version: "version",
        icons: { outline: "outline.png", color: "color.png" },
        accentColor: "#ffffff",
        developer: {
          privacyUrl: "",
          websiteUrl: "",
          termsOfUseUrl: "",
          name: "developer-name",
        },
        webApplicationInfo: {
          id: "1",
        },
        bots: [
          {
            botId: "{{BOT_ID}}",
            scopes: ["personal", "team"],
            supportsFiles: false,
            isNotificationOnly: false,
            commandLists: [
              {
                scopes: ["personal", "team", "groupchat"],
                commands: [],
              },
            ],
          },
        ],
        validDomains: ["valid-domain"],
      };

      let updateManifest = false;
      let updateLanguage = false;
      let updateColor = false;
      let updateOutline = false;
      let updatedManifestData = "";
      sandbox.stub(appStudio, "getAppPackage").resolves(
        ok({
          manifest: Buffer.from(
            JSON.stringify({
              manifestVersion: "version",
              id: "mock-app-id",
              name: { short: "short-name" },
              description: { short: "", full: "" },
              version: "version",
              icons: { outline: "outline.png", color: "color.png" },
              accentColor: "#ffffff",
              developer: {
                privacyUrl: "",
                websiteUrl: "",
                termsOfUseUrl: "",
                name: "developer-name",
              },
            })
          ),
          icons: { color: Buffer.from(""), outline: Buffer.from("") },
          languages: { zh: Buffer.from(JSON.stringify({})) },
        })
      );
      sandbox.stub(fs, "writeFile").callsFake((file: number | fs.PathLike, data: any) => {
        if (file === path.join(ctx.projectPath!, "appPackage", "color.png")) {
          updateColor = true;
        } else if (file === path.join(ctx.projectPath!, "appPackage", "outline.png")) {
          updateOutline = true;
        } else if (file === path.join(ctx.projectPath!, "appPackage", "zh.json")) {
          updateLanguage = true;
        } else if (file === path.join(ctx.projectPath!, "appPackage", "manifest.json")) {
          updateManifest = true;
          updatedManifestData = data;
        } else {
          throw new Error("not support " + file);
        }
      });

      const mockWriteStream = new MockedWriteStream();
      sandbox.stub(fs, "createWriteStream").returns(mockWriteStream as any);
      const writeSpy = sandbox.stub(mockWriteStream, "write").resolves();
      sandbox.stub(mockWriteStream, "end").resolves();
      sandbox.stub(fs, "readFile").callsFake((file: number | fs.PathLike) => {
        if (file === path.join(ctx.projectPath!, "env", ".env.local")) {
          return Promise.resolve(Buffer.from("TEAMS_APP_ID=\nENV=\n"));
        } else {
          throw new Error("not support " + file);
        }
      });
      sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(existingManifest));
      const res = await developerPortalScaffoldUtils.updateFilesForTdp(ctx, appDefinition, inputs);

      chai.assert.isTrue(res.isOk());
      chai.assert.isTrue(updateManifest);
      chai.assert.isTrue(updateColor);
      chai.assert.isTrue(updateOutline);
      chai.assert.isTrue(updateLanguage);
      const updatedManifest = JSON.parse(updatedManifestData) as TeamsAppManifest;
      chai.assert.equal(updatedManifest.id, "${{TEAMS_APP_ID}}");
      chai.assert.deepEqual(updatedManifest.bots![0], existingManifest.bots![0]);
      chai.assert.equal(updatedManifest.developer.privacyUrl, DEFAULT_DEVELOPER.privacyUrl);
      chai.assert.equal(updatedManifest.developer.termsOfUseUrl, DEFAULT_DEVELOPER.termsOfUseUrl);
      chai.assert.equal(updatedManifest.developer.websiteUrl, DEFAULT_DEVELOPER.websiteUrl);
      chai.assert.deepEqual(
        updatedManifest.webApplicationInfo,
        existingManifest.webApplicationInfo
      );
      chai.assert.isTrue(updatedManifest.validDomains?.includes("valid-domain"));
      chai.assert.isTrue(writeSpy.calledThrice);
      chai.assert.isTrue(writeSpy.firstCall.firstArg.includes("TEAMS_APP_ID=mock-app-id"));
    });

    it("update group chat", async () => {
      const ctx = createContextV3();
      ctx.tokenProvider = {
        m365TokenProvider: new MockedM365Provider(),
        azureAccountProvider: new MockedAzureAccountProvider(),
      };
      ctx.projectPath = "project-path";
      const appDefinition: AppDefinition = {
        appId: "mock-app-id",
        teamsAppId: "mock-app-id",
        staticTabs: [
          {
            objectId: "objId",
            entityId: "entityId",
            name: "tab",
            contentUrl: "https://url",
            websiteUrl: "https:/url",
            scopes: [],
            context: [],
          },
        ],
      };
      const inputs: Inputs = {
        platform: Platform.VSCode,
      };
      const manifest: TeamsAppManifest = {
        manifestVersion: "version",
        id: "mock-app-id",
        name: { short: "short-name" },
        description: { short: "", full: "" },
        version: "version",
        icons: { outline: "outline.png", color: "color.png" },
        accentColor: "#ffffff",
        developer: {
          privacyUrl: "",
          websiteUrl: "",
          termsOfUseUrl: "",
          name: "developer-name",
        },
        staticTabs: [
          {
            name: "name0",
            entityId: "index0",
            scopes: ["personal"],
            contentUrl: "contentUrl0",
            websiteUrl: "websiteUrl0",
          },
          {
            name: "name1",
            entityId: "index1",
            scopes: ["personal"],
            contentUrl: "contentUrl1",
            websiteUrl: "websiteUrl1",
          },
        ],
        configurableTabs: [
          {
            configurationUrl: "url",
            scopes: ["groupChat", "team"] as any,
          },
        ],
        bots: [
          {
            botId: "botId",
            scopes: ["groupChat"] as any,
          },
        ],
      };

      let updateManifest = false;
      let updateLanguage = false;
      let updateColor = false;
      let updateOutline = false;
      let updatedManifestData = "";
      sandbox.stub(appStudio, "getAppPackage").resolves(
        ok({
          manifest: Buffer.from(JSON.stringify(manifest)),
          icons: { color: Buffer.from(""), outline: Buffer.from("") },
          languages: { zh: Buffer.from(JSON.stringify({})) },
        })
      );
      sandbox.stub(fs, "writeFile").callsFake((file: number | fs.PathLike, data: any) => {
        if (file === path.join(ctx.projectPath!, "appPackage", "color.png")) {
          updateColor = true;
        } else if (file === path.join(ctx.projectPath!, "appPackage", "outline.png")) {
          updateOutline = true;
        } else if (file === path.join(ctx.projectPath!, "appPackage", "zh.json")) {
          updateLanguage = true;
        } else if (file === path.join(ctx.projectPath!, "appPackage", "manifest.json")) {
          updateManifest = true;
          updatedManifestData = data;
        } else {
          throw new Error("not support " + file);
        }
      });

      const mockWriteStream = new MockedWriteStream();
      sandbox.stub(fs, "createWriteStream").returns(mockWriteStream as any);
      const writeSpy = sandbox.stub(mockWriteStream, "write").resolves();
      sandbox.stub(mockWriteStream, "end").resolves();
      sandbox.stub(fs, "readFile").callsFake((file: number | fs.PathLike) => {
        if (file === path.join(ctx.projectPath!, "env", ".env.local")) {
          return Promise.resolve(Buffer.from("TEAMS_APP_ID=\nENV=\n"));
        } else {
          throw new Error("not support " + file);
        }
      });
      sandbox.stub(manifestUtils, "_readAppManifest").resolves(ok(manifest));

      const res = await developerPortalScaffoldUtils.updateFilesForTdp(ctx, appDefinition, inputs);

      chai.assert.isTrue(res.isOk());
      chai.assert.isTrue(updateManifest);
      chai.assert.isTrue(updateColor);
      chai.assert.isTrue(updateOutline);
      chai.assert.isTrue(updateLanguage);
      const updatedManifest = JSON.parse(updatedManifestData) as TeamsAppManifest;
      chai.assert.equal(updatedManifest.id, "${{TEAMS_APP_ID}}");
      chai.assert.equal(updatedManifest.staticTabs![0].contentUrl, "contentUrl0");
      chai.assert.equal(updatedManifest.staticTabs![0].websiteUrl, "websiteUrl0");
      chai.assert.equal(updatedManifest.staticTabs![1].websiteUrl, "websiteUrl1");
      chai.assert.equal(updatedManifest.staticTabs![1].contentUrl, "contentUrl1");
      chai.assert.isTrue(updatedManifest.configurableTabs![0].scopes.includes("groupchat"));
      chai.assert.isTrue(updatedManifest.bots![0].scopes.includes("groupchat"));
      chai.assert.equal(updatedManifest.developer.privacyUrl, DEFAULT_DEVELOPER.privacyUrl);
      chai.assert.equal(updatedManifest.developer.termsOfUseUrl, DEFAULT_DEVELOPER.termsOfUseUrl);
      chai.assert.equal(updatedManifest.developer.websiteUrl, DEFAULT_DEVELOPER.websiteUrl);
      chai.assert.equal(updatedManifest.validDomains, undefined);
      chai.assert.isTrue(writeSpy.calledThrice);
      chai.assert.isTrue(writeSpy.firstCall.firstArg.includes("TEAMS_APP_ID=mock-app-id"));
    });

    it("read manifest error", async () => {
      const ctx = createContextV3();
      ctx.tokenProvider = {
        m365TokenProvider: new MockedM365Provider(),
        azureAccountProvider: new MockedAzureAccountProvider(),
      };
      ctx.projectPath = "project-path";
      const appDefinition: AppDefinition = {
        appId: "mock-app-id",
        teamsAppId: "mock-app-id",
        staticTabs: [
          {
            objectId: "objId",
            entityId: "entityId",
            name: "tab",
            contentUrl: "https://url",
            websiteUrl: "https:/url",
            scopes: [],
            context: [],
          },
        ],
      };
      const inputs: Inputs = {
        platform: Platform.VSCode,
        [CoreQuestionNames.ReplaceWebsiteUrl]: ["name0"],
        [CoreQuestionNames.ReplaceContentUrl]: ["name1"],
      };
      const manifest: TeamsAppManifest = {
        manifestVersion: "version",
        id: "mock-app-id",
        name: { short: "short-name" },
        description: { short: "", full: "" },
        version: "version",
        icons: { outline: "outline.png", color: "color.png" },
        accentColor: "#ffffff",
        developer: {
          privacyUrl: "",
          websiteUrl: "",
          termsOfUseUrl: "",
          name: "developer-name",
        },
        staticTabs: [
          {
            name: "name0",
            entityId: "index0",
            scopes: ["personal"],
            contentUrl: "contentUrl0",
            websiteUrl: "websiteUrl0",
          },
          {
            name: "name1",
            entityId: "index1",
            scopes: ["personal"],
            contentUrl: "contentUrl1",
            websiteUrl: "websiteUrl1",
          },
        ],
      };

      sandbox.stub(appStudio, "getAppPackage").resolves(
        ok({
          manifest: Buffer.from(JSON.stringify(manifest)),
          icons: { color: Buffer.from(""), outline: Buffer.from("") },
          languages: { zh: Buffer.from(JSON.stringify({})) },
        })
      );

      const mockWriteStream = new MockedWriteStream();
      sandbox.stub(fs, "createWriteStream").returns(mockWriteStream as any);
      sandbox.stub(mockWriteStream, "end").resolves();

      sandbox.stub(manifestUtils, "_readAppManifest").resolves(err(new UserError("", "", "", "")));
      const res = await developerPortalScaffoldUtils.updateFilesForTdp(ctx, appDefinition, inputs);

      chai.assert.isTrue(res.isErr());
    });
  });

  describe("getTemplateId", () => {
    const validBot: Bot = {
      botId: "botId",
      isNotificationOnly: false,
      needsChannelSelector: false,
      personalCommands: [{ title: "title", description: "description" }],
      supportsFiles: false,
      supportsCalling: false,
      supportsVideo: false,
      teamCommands: [{ title: "title", description: "description" }],
      groupChatCommands: [{ title: "title", description: "description" }],
      scopes: ["scope"],
    };

    const validConfigurableTabForTabCode: ConfigurableTab = {
      objectId: "objId",
      configurationUrl: "https://url",
      canUpdateConfiguration: false,
      scopes: [CommandScope.GroupChat],
      context: [MeetingsContext.ChannelTab],
      sharePointPreviewImage: "img",
      supportedSharePointHosts: [],
    };

    const validStaticTab: StaticTab = {
      objectId: "objId",
      entityId: "entityId",
      name: "tab",
      contentUrl: "https://url",
      websiteUrl: "https:/url",
      scopes: [],
      context: [],
    };

    const validMessagingExtension: MessagingExtension = {
      objectId: "objId",
      botId: "botId",
      canUpdateConfiguration: true,
      commands: [],
      messageHandlers: [],
    };

    it("return TabNonSsoAndDefaultBot", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "id",
        staticTabs: [validStaticTab],
        messagingExtensions: [validMessagingExtension],
      };

      const res = getTemplateId(appDefinition);
      chai.assert.equal(res, TabNonSsoAndDefaultBotItem().id);
    });

    it("return TabNonSso", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "id",
        staticTabs: [validStaticTab],
      };

      const res = getTemplateId(appDefinition);
      chai.assert.equal(res, TabNonSsoItem().id);
    });

    it("return DefaultBotAndMessageExtension", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "id",
        bots: [validBot],
        messagingExtensions: [validMessagingExtension],
      };

      const res = getTemplateId(appDefinition);
      chai.assert.equal(res, DefaultBotAndMessageExtensionItem().id);
    });

    it("return MessageExtension", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "id",
        messagingExtensions: [validMessagingExtension],
      };

      const res = getTemplateId(appDefinition);
      chai.assert.equal(res, MessageExtensionNewUIItem().id);
    });

    it("return bot", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "id",
        bots: [validBot],
      };

      const res = getTemplateId(appDefinition);
      chai.assert.equal(res, BotOptionItem().id);
    });

    it("return undefined", () => {
      const appDefinition: AppDefinition = {
        teamsAppId: "id",
      };

      const res = getTemplateId(appDefinition);
      chai.assert.isUndefined(res);
    });
  });
});
