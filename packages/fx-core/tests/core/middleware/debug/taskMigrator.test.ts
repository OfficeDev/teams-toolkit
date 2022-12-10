// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import {
  migrateTransparentNpmInstall,
  migrateTransparentPrerequisite,
} from "../../../../src/core/middleware/utils/debug/taskMigrator";
import { CommentArray, CommentJSONValue, parse, stringify } from "comment-json";
import { DebugMigrationContext } from "../../../../src/core/middleware/utils/debug/debugMigrationContext";

describe("debugMigration", () => {
  describe("migrateTransparentPrerequisite", () => {
    it("happy path", () => {
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
      const debugContext = new DebugMigrationContext(testTasks);
      migrateTransparentPrerequisite(debugContext);
      chai.assert.equal(
        stringify(testTasks, null, 4),
        stringify(parse(expectedTaskContent), null, 4)
      );
      chai.assert.isTrue(debugContext.appYmlConfig.deploy?.tools?.devCert?.trust);
      chai.assert.isTrue(debugContext.appYmlConfig.deploy?.tools?.dotnet);
      chai.assert.isTrue(debugContext.appYmlConfig.deploy?.tools?.func);
    });

    it("customized prerequisite", () => {
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
      const debugContext = new DebugMigrationContext(testTasks);
      migrateTransparentPrerequisite(debugContext);
      chai.assert.equal(
        stringify(testTasks, null, 4),
        stringify(parse(expectedTaskContent), null, 4)
      );
      chai.assert.isUndefined(debugContext.appYmlConfig.deploy?.tools?.devCert?.trust);
      chai.assert.isTrue(debugContext.appYmlConfig.deploy?.tools?.dotnet);
      chai.assert.isUndefined(debugContext.appYmlConfig.deploy?.tools?.func);
    });

    it("no prerequisite task", () => {
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
      const debugContext = new DebugMigrationContext(testTasks);
      migrateTransparentPrerequisite(debugContext);
      chai.assert.equal(
        stringify(testTasks, null, 4),
        stringify(parse(expectedTaskContent), null, 4)
      );
      chai.assert.isUndefined(debugContext.appYmlConfig.deploy?.tools?.devCert?.trust);
      chai.assert.isUndefined(debugContext.appYmlConfig.deploy?.tools?.dotnet);
      chai.assert.isUndefined(debugContext.appYmlConfig.deploy?.tools?.func);
    });

    it("empty prerequisite", () => {
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
      const debugContext = new DebugMigrationContext(testTasks);
      migrateTransparentPrerequisite(debugContext);
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
    it("happy path", () => {
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
      const debugContext = new DebugMigrationContext(testTasks);
      migrateTransparentNpmInstall(debugContext);
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

    it("one project", () => {
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
      const debugContext = new DebugMigrationContext(testTasks);
      migrateTransparentNpmInstall(debugContext);
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

    it("empty projects", () => {
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
      const debugContext = new DebugMigrationContext(testTasks);
      migrateTransparentNpmInstall(debugContext);
      chai.assert.equal(
        stringify(testTasks, null, 4),
        stringify(parse(expectedTaskContent), null, 4)
      );
      chai.assert.isUndefined(debugContext.appYmlConfig.deploy?.npmCommands);
    });

    it("no npm tasks", () => {
      const testTaskContent = `[]`;
      const expectedTaskContent = `[]`;
      const testTasks = parse(testTaskContent) as CommentArray<CommentJSONValue>;
      const debugContext = new DebugMigrationContext(testTasks);
      migrateTransparentNpmInstall(debugContext);
      chai.assert.equal(
        stringify(testTasks, null, 4),
        stringify(parse(expectedTaskContent), null, 4)
      );
      chai.assert.isUndefined(debugContext.appYmlConfig.deploy?.npmCommands);
    });
  });
});
