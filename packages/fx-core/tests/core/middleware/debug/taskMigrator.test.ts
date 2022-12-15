// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import {
  migrateTransparentLocalTunnel,
  migratePrepareManifest,
  migrateSetUpBot,
  migrateSetUpSSO,
  migrateSetUpTab,
  migrateTransparentNpmInstall,
  migrateTransparentPrerequisite,
} from "../../../../src/core/middleware/utils/debug/taskMigrator";
import { CommentArray, CommentJSONValue, parse, stringify } from "comment-json";
import { DebugMigrationContext } from "../../../../src/core/middleware/utils/debug/debugMigrationContext";
import * as debugV3MigrationUtils from "../../../../src/core/middleware/utils/debug/debugV3MigrationUtils";
import { ok, ProjectSettings } from "@microsoft/teamsfx-api";
import { LocalCrypto } from "../../../../src/core/crypto";
import { mockMigrationContext } from "./utils";

describe("debugMigration", () => {
  const projectPath = ".";

  describe("migrateTransparentPrerequisite", () => {
    it("happy path", async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      const testTaskContent = `[
      {
        // Check if all required prerequisites are installed and will install them if not.
        // See https://aka.ms/teamsfx-check-prerequisites-task to know the details and how to customize the args.
        "label": "Validate & install prerequisites",
        "type": "teamsfx",
        "command": "debug-check-prerequisites",
        "args": {
            "prerequisites": [
                "nodejs", // Validate if Node.js is installed.
                "m365Account", // Sign-in prompt for Microsoft 365 account, then validate if the account enables the sideloading permission.
                "devCert", // Install localhost SSL certificate. It's used to serve the development sites over HTTPS to debug the Tab app in Teams.
                "func", // Install Azure Functions Core Tools. It's used to serve Azure Functions hosted project locally.
                "dotnet", // Ensure .NET Core SDK is installed. TeamsFx Azure Functions project depends on extra .NET binding extensions for HTTP trigger authorization.
                "ngrok", // Install Ngrok. Bot project requires a public message endpoint, and ngrok can help create public tunnel for your local service.
                "portOccupancy" // Validate available ports to ensure those debug ones are not occupied.
            ],
            "portOccupancy": [
                53000, // tab service port
                7071, // backend service port
                9229, // backend inspector port for Node.js debugger
                3978, // bot service port
                9239 // bot inspector port for Node.js debugger
            ]
        }
      }]`;
      const expectedTaskContent = `[
        {
          // Check if all required prerequisites are installed and will install them if not.
          // See https://aka.ms/teamsfx-check-prerequisites-task to know the details and how to customize the args.
          "label": "Validate & install prerequisites",
          "type": "teamsfx",
          "command": "debug-check-prerequisites",
          "args": {
              "prerequisites": [
                  "nodejs", // Validate if Node.js is installed.
                  "m365Account", // Sign-in prompt for Microsoft 365 account, then validate if the account enables the sideloading permission.
                  "portOccupancy" // Validate available ports to ensure those debug ones are not occupied.
              ],
              "portOccupancy": [
                  53000, // tab service port
                  7071, // backend service port
                  9229, // backend inspector port for Node.js debugger
                  3978, // bot service port
                  9239 // bot inspector port for Node.js debugger
              ]
          }
        }]`;
      const testTasks = parse(testTaskContent) as CommentArray<CommentJSONValue>;
      const oldProjectSettings = {} as ProjectSettings;
      const debugContext = new DebugMigrationContext(
        migrationContext,
        testTasks,
        oldProjectSettings,
        {}
      );
      await migrateTransparentPrerequisite(debugContext);
      chai.assert.equal(
        stringify(testTasks, null, 4),
        stringify(parse(expectedTaskContent), null, 4)
      );
      chai.assert.isTrue(debugContext.appYmlConfig.deploy?.tools?.devCert?.trust);
      chai.assert.isTrue(debugContext.appYmlConfig.deploy?.tools?.dotnet);
      chai.assert.isTrue(debugContext.appYmlConfig.deploy?.tools?.func);
    });

    it("customized prerequisite", async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      const testTaskContent = `[
      {
        // Check if all required prerequisites are installed and will install them if not.
        // See https://aka.ms/teamsfx-check-prerequisites-task to know the details and how to customize the args.
        "label": "Validate & install prerequisites",
        "type": "teamsfx",
        "command": "debug-check-prerequisites",
        "args": {
            "prerequisites": [
                "nodejs", // Validate if Node.js is installed.
                "dotnet", // Ensure .NET Core SDK is installed. TeamsFx Azure Functions project depends on extra .NET binding extensions for HTTP trigger authorization.
                "ngrok", // Install Ngrok. Bot project requires a public message endpoint, and ngrok can help create public tunnel for your local service.
                "portOccupancy" // Validate available ports to ensure those debug ones are not occupied.
            ],
            "portOccupancy": [
                53000, // tab service port
                7071, // backend service port
                9229, // backend inspector port for Node.js debugger
                3978, // bot service port
                9239 // bot inspector port for Node.js debugger
            ]
        }
      }]`;
      const expectedTaskContent = `[
        {
          // Check if all required prerequisites are installed and will install them if not.
          // See https://aka.ms/teamsfx-check-prerequisites-task to know the details and how to customize the args.
          "label": "Validate & install prerequisites",
          "type": "teamsfx",
          "command": "debug-check-prerequisites",
          "args": {
              "prerequisites": [
                  "nodejs", // Validate if Node.js is installed.
                  "portOccupancy" // Validate available ports to ensure those debug ones are not occupied.
              ],
              "portOccupancy": [
                  53000, // tab service port
                  7071, // backend service port
                  9229, // backend inspector port for Node.js debugger
                  3978, // bot service port
                  9239 // bot inspector port for Node.js debugger
              ]
          }
        }]`;
      const testTasks = parse(testTaskContent) as CommentArray<CommentJSONValue>;
      const oldProjectSettings = {} as ProjectSettings;
      const debugContext = new DebugMigrationContext(
        migrationContext,
        testTasks,
        oldProjectSettings,
        {}
      );
      await migrateTransparentPrerequisite(debugContext);
      chai.assert.equal(
        stringify(testTasks, null, 4),
        stringify(parse(expectedTaskContent), null, 4)
      );
      chai.assert.isUndefined(debugContext.appYmlConfig.deploy?.tools?.devCert?.trust);
      chai.assert.isTrue(debugContext.appYmlConfig.deploy?.tools?.dotnet);
      chai.assert.isUndefined(debugContext.appYmlConfig.deploy?.tools?.func);
    });

    it("no prerequisite task", async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      const testTaskContent = `[
        {
          // Start the local tunnel service to forward public ngrok URL to local port and inspect traffic.
          // See https://aka.ms/teamsfx-local-tunnel-task to know the details and how to customize the args.
          "label": "Start local tunnel",
          "type": "teamsfx",
          "command": "debug-start-local-tunnel",
          "args": {
              "ngrokArgs": "http 3978 --log=stdout --log-format=logfmt"
          },
          "isBackground": true,
          "problemMatcher": "$teamsfx-local-tunnel-watch"
        },
        {
            // Prepare local launch information for Tab.
            // See https://aka.ms/teamsfx-debug-set-up-tab-task to know the details and how to customize the args.
            "label": "Set up tab",
            "type": "teamsfx",
            "command": "debug-set-up-tab",
            "args": {
                "baseUrl": "https://localhost:53000"
            }
        }
      ]`;
      const expectedTaskContent = testTaskContent;
      const testTasks = parse(testTaskContent) as CommentArray<CommentJSONValue>;
      const oldProjectSettings = {} as ProjectSettings;
      const debugContext = new DebugMigrationContext(
        migrationContext,
        testTasks,
        oldProjectSettings,
        {}
      );
      await migrateTransparentPrerequisite(debugContext);
      chai.assert.equal(
        stringify(testTasks, null, 4),
        stringify(parse(expectedTaskContent), null, 4)
      );
      chai.assert.isUndefined(debugContext.appYmlConfig.deploy?.tools?.devCert?.trust);
      chai.assert.isUndefined(debugContext.appYmlConfig.deploy?.tools?.dotnet);
      chai.assert.isUndefined(debugContext.appYmlConfig.deploy?.tools?.func);
    });

    it("empty prerequisite", async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      const testTaskContent = `[
      {
        // Check if all required prerequisites are installed and will install them if not.
        // See https://aka.ms/teamsfx-check-prerequisites-task to know the details and how to customize the args.
        "label": "Validate & install prerequisites",
        "type": "teamsfx",
        "command": "debug-check-prerequisites",
        "args": {
            "prerequisites": [],
            "portOccupancy": [
                53000, // tab service port
                7071, // backend service port
                9229, // backend inspector port for Node.js debugger
                3978, // bot service port
                9239 // bot inspector port for Node.js debugger
            ]
        }
      }]`;
      const expectedTaskContent = testTaskContent;
      const testTasks = parse(testTaskContent) as CommentArray<CommentJSONValue>;
      const oldProjectSettings = {} as ProjectSettings;
      const debugContext = new DebugMigrationContext(
        migrationContext,
        testTasks,
        oldProjectSettings,
        {}
      );
      await migrateTransparentPrerequisite(debugContext);
      chai.assert.equal(
        stringify(testTasks, null, 4),
        stringify(parse(expectedTaskContent), null, 4)
      );
      chai.assert.isUndefined(debugContext.appYmlConfig.deploy?.tools?.devCert?.trust);
      chai.assert.isUndefined(debugContext.appYmlConfig.deploy?.tools?.dotnet);
      chai.assert.isUndefined(debugContext.appYmlConfig.deploy?.tools?.func);
    });
  });

  describe("migrateTransparentNpmInstall", () => {
    it("happy path", async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      const testTaskContent = `[
        {
					"label": "Start Teams App Locally",
					"dependsOn": [
							"Validate & install prerequisites",
							"Install npm packages",
							"Start local tunnel",
							"Set up tab",
							"Set up bot",
							"Set up SSO",
							"Build & upload Teams manifest",
							"Start services"
					],
					"dependsOrder": "sequence"
			  },
        {
					"label": "Before npm install",
					"dependsOn": "Install npm packages"
			  },
        {
					// Check if all the npm packages are installed and will install them if not.
					// See https://aka.ms/teamsfx-npm-package-task to know the details and how to customize the args.
					"label": "Install npm packages",
					"type": "teamsfx",
					"command": "debug-npm-install",
					"args": {
							"projects": [
									{
											"cwd": "\${workspaceFolder}/tabs", // comment
											"npmInstallArgs": [ // comment
													"--no-audit" // comment
											]
									},
									{
											"cwd": "\${workspaceFolder}/api", // comment
											"npmInstallArgs": [] // comment
									},
									{
											"cwd": "\${workspaceFolder}/bot" // comment
									}
							]
					}
      }]`;
      const expectedTaskContent = `[
        {
					"label": "Start Teams App Locally",
					"dependsOn": [
							"Validate & install prerequisites",
							"Start local tunnel",
							"Set up tab",
							"Set up bot",
							"Set up SSO",
							"Build & upload Teams manifest",
							"Start services"
					],
					"dependsOrder": "sequence"
			  },
        {
					"label": "Before npm install"
			  }
      ]`;
      const testTasks = parse(testTaskContent) as CommentArray<CommentJSONValue>;
      const oldProjectSettings = {} as ProjectSettings;
      const debugContext = new DebugMigrationContext(
        migrationContext,
        testTasks,
        oldProjectSettings,
        {}
      );
      await migrateTransparentNpmInstall(debugContext);
      chai.assert.equal(
        stringify(testTasks, null, 4),
        stringify(parse(expectedTaskContent), null, 4)
      );
      chai.assert.equal(debugContext.appYmlConfig.deploy?.npmCommands?.length, 3);
      chai.assert.deepEqual(debugContext.appYmlConfig.deploy?.npmCommands?.[0], {
        args: "install --no-audit",
        workingDirectory: "./tabs",
      });
      chai.assert.deepEqual(debugContext.appYmlConfig.deploy?.npmCommands?.[1], {
        args: "install",
        workingDirectory: "./api",
      });
      chai.assert.deepEqual(debugContext.appYmlConfig.deploy?.npmCommands?.[2], {
        args: "install",
        workingDirectory: "./bot",
      });
    });

    it("one project", async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      const testTaskContent = `[
        {
					"label": "Start Teams App Locally",
					"dependsOn": [
							"Validate & install prerequisites",
							"Start local tunnel",
							"Set up tab",
							"Set up bot",
							"Set up SSO",
							"Build & upload Teams manifest",
							"Start services"
					],
					"dependsOrder": "sequence"
			  },
        {
					// Check if all the npm packages are installed and will install them if not.
					// See https://aka.ms/teamsfx-npm-package-task to know the details and how to customize the args.
					"label": "Install npm packages",
					"type": "teamsfx",
					"command": "debug-npm-install",
					"args": {
							"projects": [
									{
											"cwd": "\${workspaceFolder}/tabs",
											"npmInstallArgs": "--no-audit" // comment
									}
							]
					}
        },
        {
					"label": "Before npm install",
					"dependsOn": "Install npm packages"
			  }
      ]`;
      const expectedTaskContent = `[
        {
					"label": "Start Teams App Locally",
					"dependsOn": [
							"Validate & install prerequisites",
							"Start local tunnel",
							"Set up tab",
							"Set up bot",
							"Set up SSO",
							"Build & upload Teams manifest",
							"Start services"
					],
					"dependsOrder": "sequence"
			  },
        {
					"label": "Before npm install"
			  }
      ]`;
      const testTasks = parse(testTaskContent) as CommentArray<CommentJSONValue>;
      const oldProjectSettings = {} as ProjectSettings;
      const debugContext = new DebugMigrationContext(
        migrationContext,
        testTasks,
        oldProjectSettings,
        {}
      );
      await migrateTransparentNpmInstall(debugContext);
      chai.assert.equal(
        stringify(testTasks, null, 4),
        stringify(parse(expectedTaskContent), null, 4)
      );
      chai.assert.equal(debugContext.appYmlConfig.deploy?.npmCommands?.length, 1);
      chai.assert.deepEqual(debugContext.appYmlConfig.deploy?.npmCommands?.[0], {
        args: "install --no-audit",
        workingDirectory: "./tabs",
      });
    });

    it("empty projects", async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      const testTaskContent = `[
        {
					// Check if all the npm packages are installed and will install them if not.
					// See https://aka.ms/teamsfx-npm-package-task to know the details and how to customize the args.
					"label": "Install npm packages",
					"type": "teamsfx",
					"command": "debug-npm-install",
					"args": {
							"projects": []
					}
        },
        {
					"label": "Start Teams App Locally",
					"dependsOn": [
							"Validate & install prerequisites",
							"Install npm packages",
							"Start local tunnel",
							"Set up tab",
							"Set up bot",
							"Set up SSO",
							"Build & upload Teams manifest",
							"Start services"
					],
					"dependsOrder": "sequence"
			  },
        {
					"label": "Before npm install",
					"dependsOn": "Install npm packages"
			  }
      ]`;
      const expectedTaskContent = `[
        {
					"label": "Start Teams App Locally",
					"dependsOn": [
							"Validate & install prerequisites",
							"Start local tunnel",
							"Set up tab",
							"Set up bot",
							"Set up SSO",
							"Build & upload Teams manifest",
							"Start services"
					],
					"dependsOrder": "sequence"
			  },
        {
					"label": "Before npm install"
			  }
      ]`;
      const testTasks = parse(testTaskContent) as CommentArray<CommentJSONValue>;
      const oldProjectSettings = {} as ProjectSettings;
      const debugContext = new DebugMigrationContext(
        migrationContext,
        testTasks,
        oldProjectSettings,
        {}
      );
      await migrateTransparentNpmInstall(debugContext);
      chai.assert.equal(
        stringify(testTasks, null, 4),
        stringify(parse(expectedTaskContent), null, 4)
      );
      chai.assert.isUndefined(debugContext.appYmlConfig.deploy?.npmCommands);
    });

    it("no npm tasks", async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      const testTaskContent = `[]`;
      const expectedTaskContent = `[]`;
      const testTasks = parse(testTaskContent) as CommentArray<CommentJSONValue>;
      const oldProjectSettings = {} as ProjectSettings;
      const debugContext = new DebugMigrationContext(
        migrationContext,
        testTasks,
        oldProjectSettings,
        {}
      );
      await migrateTransparentNpmInstall(debugContext);
      chai.assert.equal(
        stringify(testTasks, null, 4),
        stringify(parse(expectedTaskContent), null, 4)
      );
      chai.assert.isUndefined(debugContext.appYmlConfig.deploy?.npmCommands);
    });
  });

  describe("migrateTransparentLocalTunnel", () => {
    it("happy path", async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      const testTaskContent = `[
        {
          // Start the local tunnel service to forward public ngrok URL to local port and inspect traffic.
          // See https://aka.ms/teamsfx-local-tunnel-task to know the details and how to customize the args.
          "label": "Start local tunnel",
          "type": "teamsfx",
          "command": "debug-start-local-tunnel",
          "args": {
              "ngrokArgs": "http 3978 --log=stdout --log-format=logfmt"
          },
          "isBackground": true,
          "problemMatcher": "$teamsfx-local-tunnel-watch"
        }
      ]`;
      const expectedTaskContent = `[
        {
          // Start the local tunnel service to forward public ngrok URL to local port and inspect traffic.
          // See https://aka.ms/teamsfx-local-tunnel-task to know the details and how to customize the args.
          "label": "Start local tunnel",
          "type": "teamsfx",
          "command": "debug-start-local-tunnel",
          "args": {
              "ngrokArgs": "http 3978 --log=stdout --log-format=logfmt",
              "env": "local",
              "output": {
                // Keep consistency with migrated configuration.
                "endpoint": "PROVISIONOUTPUT__AZUREWEBAPPBOTOUTPUT__SITEENDPOINT",
                "domain": "PROVISIONOUTPUT__AZUREWEBAPPBOTOUTPUT__DOMAIN"
              }
          },
          "isBackground": true,
          "problemMatcher": "$teamsfx-local-tunnel-watch"
        }
      ]`;
      const testTasks = parse(testTaskContent) as CommentArray<CommentJSONValue>;
      const oldProjectSettings = {} as ProjectSettings;
      const debugContext = new DebugMigrationContext(
        migrationContext,
        testTasks,
        oldProjectSettings,
        {
          botDomain: "PROVISIONOUTPUT__AZUREWEBAPPBOTOUTPUT__DOMAIN",
          botEndpoint: "PROVISIONOUTPUT__AZUREWEBAPPBOTOUTPUT__SITEENDPOINT",
        }
      );
      await migrateTransparentLocalTunnel(debugContext);
      chai.assert.equal(
        stringify(testTasks, null, 4),
        stringify(parse(expectedTaskContent), null, 4)
      );
    });

    it("customized ngrok", async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      const testTaskContent = `[
        {
          // Start the local tunnel service to forward public ngrok URL to local port and inspect traffic.
          // See https://aka.ms/teamsfx-local-tunnel-task to know the details and how to customize the args.
          "label": "Start local tunnel",
          "type": "teamsfx",
          "command": "debug-start-local-tunnel",
          "args": {
              "ngrokArgs": "http 3978 --log=stdout --log-format=logfmt",
              "ngrokPath": "ngrok"
          },
          "isBackground": true,
          "problemMatcher": "$teamsfx-local-tunnel-watch"
        }
      ]`;
      const expectedTaskContent = `[
        {
          // Start the local tunnel service to forward public ngrok URL to local port and inspect traffic.
          // See https://aka.ms/teamsfx-local-tunnel-task to know the details and how to customize the args.
          "label": "Start local tunnel",
          "type": "teamsfx",
          "command": "debug-start-local-tunnel",
          "args": {
              "ngrokArgs": "http 3978 --log=stdout --log-format=logfmt",
              "ngrokPath": "ngrok",
              "env": "local",
              "output": {
                // Keep consistency with migrated configuration.
                "endpoint": "PROVISIONOUTPUT__AZUREWEBAPPBOTOUTPUT__SITEENDPOINT",
                "domain": "PROVISIONOUTPUT__AZUREWEBAPPBOTOUTPUT__DOMAIN"
              }
          },
          "isBackground": true,
          "problemMatcher": "$teamsfx-local-tunnel-watch"
        }
      ]`;
      const testTasks = parse(testTaskContent) as CommentArray<CommentJSONValue>;
      const oldProjectSettings = {} as ProjectSettings;
      const debugContext = new DebugMigrationContext(
        migrationContext,
        testTasks,
        oldProjectSettings,
        {
          botDomain: "PROVISIONOUTPUT__AZUREWEBAPPBOTOUTPUT__DOMAIN",
          botEndpoint: "PROVISIONOUTPUT__AZUREWEBAPPBOTOUTPUT__SITEENDPOINT",
        }
      );
      await migrateTransparentLocalTunnel(debugContext);
      chai.assert.equal(
        stringify(testTasks, null, 4),
        stringify(parse(expectedTaskContent), null, 4)
      );
    });
  });

  describe("migrateSetUpTab", () => {
    it("happy path", async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      const testTaskContent = `[
        {
          "label": "Start Teams App Locally",
          "dependsOn": [
              "Validate & install prerequisites",
              "Install npm packages",
              "Start local tunnel",
              "Set up tab",
              "Set up bot",
              "Set up SSO",
              "Build & upload Teams manifest",
              "Start services"
          ],
          "dependsOrder": "sequence"
        },
        {
          // Prepare local launch information for Tab.
          // See https://aka.ms/teamsfx-debug-set-up-tab-task to know the details and how to customize the args.
          "label": "Set up tab",
          "type": "teamsfx",
          "command": "debug-set-up-tab",
          "args": {
              "baseUrl": "https://localhost:53000"
          }
        }
      ]`;
      const content = `[
        {
          "label": "Start Teams App Locally",
          "dependsOn": [
              "Validate & install prerequisites",
              "Install npm packages",
              "Start local tunnel",
              "Create resources",
              "Set up local projects",
              "Set up bot",
              "Set up SSO",
              "Build & upload Teams manifest",
              "Start services"
          ],
          "dependsOrder": "sequence"
        },
      ]`;
      const expectedTasks = parse(content) as CommentArray<CommentJSONValue>;
      expectedTasks.push(
        debugV3MigrationUtils.createResourcesTask("Create resources"),
        debugV3MigrationUtils.setUpLocalProjectsTask("Set up local projects")
      );
      const testTasks = parse(testTaskContent) as CommentArray<CommentJSONValue>;
      const oldProjectSettings = {} as ProjectSettings;
      const debugContext = new DebugMigrationContext(
        migrationContext,
        testTasks,
        oldProjectSettings,
        {}
      );
      await migrateSetUpTab(debugContext);
      chai.assert.equal(stringify(debugContext.tasks, null, 4), stringify(expectedTasks, null, 4));
      chai.assert.equal(debugContext.appYmlConfig.configureApp?.tab?.domain, "localhost:53000");
      chai.assert.equal(
        debugContext.appYmlConfig.configureApp?.tab?.endpoint,
        "https://localhost:53000"
      );
      chai.assert.equal(debugContext.appYmlConfig.deploy?.tab?.port, 53000);
    });
  });

  describe("migrateSetUpBot", () => {
    const botEndpointPlaceholder = "PROVISIONOUTPUT__WEBAPPOUTPUT__SITEENDPOINT";
    const placeholderMapping: debugV3MigrationUtils.DebugPlaceholderMapping = {
      botEndpoint: botEndpointPlaceholder,
    };

    let localEnvs: { [key: string]: string } = {};

    beforeEach(() => {
      sinon.stub(debugV3MigrationUtils, "updateLocalEnv").callsFake(async (context, envs) => {
        localEnvs = envs;
      });
      sinon.stub(LocalCrypto.prototype, "encrypt").callsFake((plaintext) => {
        return ok("crypto_" + plaintext);
      });
    });

    afterEach(() => {
      sinon.restore();
      localEnvs = {};
    });

    it("happy path", async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      const testTaskContent = `[
        {
          "label": "Start Teams App Locally",
          "dependsOn": [
              "Validate & install prerequisites",
              "Install npm packages",
              "Start local tunnel",
              "Set up tab",
              "Set up bot",
              "Set up SSO",
              "Build & upload Teams manifest",
              "Start services"
          ],
          "dependsOrder": "sequence"
        },
        {
          // Register resources and prepare local launch information for Bot.
          // See https://aka.ms/teamsfx-debug-set-up-bot-task to know the details and how to customize the args.
          "label": "Set up bot",
          "type": "teamsfx",
          "command": "debug-set-up-bot",
          "args": {
              //// Enter your own bot information if using the existing bot. ////
              // "botId": "",
              // "botPassword": "", // use plain text or environment variable reference like $\{env:BOT_PASSWORD}
              "botMessagingEndpoint": "/api/messages" // use your own routing "/any/path", or full URL "https://contoso.com/any/path"
          }
        }
      ]`;
      const content = `[
        {
          "label": "Start Teams App Locally",
          "dependsOn": [
              "Validate & install prerequisites",
              "Install npm packages",
              "Start local tunnel",
              "Set up tab",
              "Create resources",
              "Set up local projects",
              "Set up SSO",
              "Build & upload Teams manifest",
              "Start services"
          ],
          "dependsOrder": "sequence"
        },
      ]`;
      const expectedTasks = parse(content) as CommentArray<CommentJSONValue>;
      expectedTasks.push(
        debugV3MigrationUtils.createResourcesTask("Create resources"),
        debugV3MigrationUtils.setUpLocalProjectsTask("Set up local projects")
      );
      const testTasks = parse(testTaskContent) as CommentArray<CommentJSONValue>;
      const oldProjectSettings = {} as ProjectSettings;
      const debugContext = new DebugMigrationContext(
        migrationContext,
        testTasks,
        oldProjectSettings,
        placeholderMapping
      );
      await migrateSetUpBot(debugContext);
      chai.assert.equal(stringify(debugContext.tasks, null, 4), stringify(expectedTasks, null, 4));
      chai.assert.deepEqual(localEnvs, {});
      chai.assert.equal(
        debugContext.appYmlConfig.provision?.bot?.messagingEndpoint,
        `$\{{${botEndpointPlaceholder}}}/api/messages`
      );
      chai.assert.equal(debugContext.appYmlConfig.deploy?.bot, true);
    });

    it("botMessagingEndpoint starts with http", async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      const botMessagingEndpoint = "https://test.ngrok.io/api/messages";
      const testTaskContent = `[
        {
          "label": "Set up bot",
          "type": "teamsfx",
          "command": "debug-set-up-bot",
          "args": {
              "botMessagingEndpoint": "${botMessagingEndpoint}"
          }
        }
      ]`;
      const testTasks = parse(testTaskContent) as CommentArray<CommentJSONValue>;
      const oldProjectSettings = {} as ProjectSettings;
      const debugContext = new DebugMigrationContext(
        migrationContext,
        testTasks,
        oldProjectSettings,
        placeholderMapping
      );
      await migrateSetUpBot(debugContext);
      chai.assert.deepEqual(localEnvs, {});
      chai.assert.equal(
        debugContext.appYmlConfig.provision?.bot?.messagingEndpoint,
        botMessagingEndpoint
      );
      chai.assert.equal(debugContext.appYmlConfig.deploy?.bot, true);
    });

    it("customized botId and literal botPassword", async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      const botId = "botId";
      const botPassword = "botPassword";
      const testTaskContent = `[
        {
          "label": "Set up bot",
          "type": "teamsfx",
          "command": "debug-set-up-bot",
          "args": {
              "botId": "${botId}",
              "botPassword": "${botPassword}",
          }
        }
      ]`;
      const testTasks = parse(testTaskContent) as CommentArray<CommentJSONValue>;
      const oldProjectSettings = {} as ProjectSettings;
      const debugContext = new DebugMigrationContext(
        migrationContext,
        testTasks,
        oldProjectSettings,
        placeholderMapping
      );
      await migrateSetUpBot(debugContext);
      chai.assert.deepEqual(localEnvs, {
        BOT_ID: botId,
        SECRET_BOT_PASSWORD: "crypto_" + botPassword,
      });
      chai.assert.equal(
        debugContext.appYmlConfig.provision?.bot?.messagingEndpoint,
        `$\{{${botEndpointPlaceholder}}}/api/messages`
      );
      chai.assert.equal(debugContext.appYmlConfig.deploy?.bot, true);
    });

    it("customized botId and env-referenced botPassword", async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      const botId = "botId";
      const botPassword = "botPassword";
      process.env.BOT_PASSWORD = botPassword;
      const testTaskContent = `[
        {
          "label": "Set up bot",
          "type": "teamsfx",
          "command": "debug-set-up-bot",
          "args": {
              "botId": "${botId}",
              "botPassword": "\${env:BOT_PASSWORD}",
          }
        }
      ]`;
      const testTasks = parse(testTaskContent) as CommentArray<CommentJSONValue>;
      const oldProjectSettings = {} as ProjectSettings;
      const debugContext = new DebugMigrationContext(
        migrationContext,
        testTasks,
        oldProjectSettings,
        placeholderMapping
      );
      await migrateSetUpBot(debugContext);
      chai.assert.deepEqual(localEnvs, {
        BOT_ID: botId,
        SECRET_BOT_PASSWORD: "crypto_" + botPassword,
      });
      chai.assert.equal(
        debugContext.appYmlConfig.provision?.bot?.messagingEndpoint,
        `$\{{${botEndpointPlaceholder}}}/api/messages`
      );
      chai.assert.equal(debugContext.appYmlConfig.deploy?.bot, true);
      delete process.env.BOT_PASSWORD;
    });
  });

  describe("migrateSetUpSSO", () => {
    it("happy path", async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      const testTaskContent = `[
        {
          "label": "Start Teams App Locally",
          "dependsOn": [
              "Validate & install prerequisites",
              "Install npm packages",
              "Start local tunnel",
              "Set up tab",
              "Set up bot",
              "Set up SSO",
              "Build & upload Teams manifest",
              "Start services"
          ],
          "dependsOrder": "sequence"
        },
        {
          // Register resources and prepare local launch information for SSO functionality.
          // See https://aka.ms/teamsfx-debug-set-up-sso-task to know the details and how to customize the args.
          "label": "Set up SSO",
          "type": "teamsfx",
          "command": "debug-set-up-sso",
          "args": {
              //// Enter your own AAD app information if using the existing AAD app. ////
              // "objectId": "",
              // "clientId": "",
              // "clientSecret": "", // use plain text or environment variable reference like $\{env:CLIENT_SECRET}
              // "accessAsUserScopeId": "
          }
        }
      ]`;
      const content = `[
        {
          "label": "Start Teams App Locally",
          "dependsOn": [
              "Validate & install prerequisites",
              "Install npm packages",
              "Start local tunnel",
              "Set up tab",
              "Set up bot",
              "Create resources",
              "Set up local projects",
              "Build & upload Teams manifest",
              "Start services"
          ],
          "dependsOrder": "sequence"
        },
      ]`;
      const expectedTasks = parse(content) as CommentArray<CommentJSONValue>;
      expectedTasks.push(
        debugV3MigrationUtils.createResourcesTask("Create resources"),
        debugV3MigrationUtils.setUpLocalProjectsTask("Set up local projects")
      );
      const testTasks = parse(testTaskContent) as CommentArray<CommentJSONValue>;
      const oldProjectSettings = {} as ProjectSettings;
      const debugContext = new DebugMigrationContext(
        migrationContext,
        testTasks,
        oldProjectSettings,
        {}
      );
      await migrateSetUpSSO(debugContext);
      chai.assert.equal(stringify(debugContext.tasks, null, 4), stringify(expectedTasks, null, 4));
      chai.assert.equal(debugContext.appYmlConfig.registerApp?.aad, true);
      chai.assert.equal(debugContext.appYmlConfig.configureApp?.aad, true);
      chai.assert.equal(debugContext.appYmlConfig.deploy?.sso, true);
    });
  });

  describe("migratePrepareManifest", () => {
    it("without appPackagePath arg", async () => {
      const migrationContext = await mockMigrationContext(projectPath);
      const testTaskContent = `[
        {
          "label": "Start Teams App Locally",
          "dependsOn": [
              "Validate & install prerequisites",
              "Install npm packages",
              "Start local tunnel",
              "Set up tab",
              "Set up bot",
              "Set up SSO",
              "Build & upload Teams manifest",
              "Start services"
          ],
          "dependsOrder": "sequence"
        },
        {
          // Build and upload Teams manifest.
          // See https://aka.ms/teamsfx-debug-prepare-manifest-task to know the details and how to customize the args.
          "label": "Build & upload Teams manifest",
          "type": "teamsfx",
          "command": "debug-prepare-manifest",
          "args": {
              //// Enter your own Teams app package path if using the existing Teams manifest. ////
              // "appPackagePath": ""
          }
        }
      ]`;
      const content = `[
        {
          "label": "Start Teams App Locally",
          "dependsOn": [
              "Validate & install prerequisites",
              "Install npm packages",
              "Start local tunnel",
              "Set up tab",
              "Set up bot",
              "Set up SSO",
              "Create resources",
              "Set up local projects",
              "Start services"
          ],
          "dependsOrder": "sequence"
        },
      ]`;
      const expectedTasks = parse(content) as CommentArray<CommentJSONValue>;
      expectedTasks.push(
        debugV3MigrationUtils.createResourcesTask("Create resources"),
        debugV3MigrationUtils.setUpLocalProjectsTask("Set up local projects")
      );
      const testTasks = parse(testTaskContent) as CommentArray<CommentJSONValue>;
      const oldProjectSettings = {} as ProjectSettings;
      const debugContext = new DebugMigrationContext(
        migrationContext,
        testTasks,
        oldProjectSettings,
        {}
      );
      await migratePrepareManifest(debugContext);
      chai.assert.equal(stringify(debugContext.tasks, null, 4), stringify(expectedTasks, null, 4));
      chai.assert.equal(debugContext.appYmlConfig.registerApp?.teamsApp, true);
      chai.assert.equal(
        debugContext.appYmlConfig.configureApp?.teamsApp?.appPackagePath,
        undefined
      );
    });
  });
});
