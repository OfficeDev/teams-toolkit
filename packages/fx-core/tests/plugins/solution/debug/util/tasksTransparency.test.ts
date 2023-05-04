// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import {
  generateM365Tasks,
  generateSpfxTasksJson,
  generateTasks,
  generateTasksJson,
  mergeTasksJson,
} from "../../../../../src/component/debug/util/tasksTransparency";
import * as commentJson from "comment-json";
import { CommentObject } from "comment-json";

describe("tasksTransparency", () => {
  describe("generateTasks", () => {
    it("frontend without sso (js)", () => {
      const tasks = generateTasks(true, false, false, false, false, "javascript") as any;
      chai.assert.isDefined(tasks);
      let count = 0;
      chai.assert.equal(tasks[count++].label, "Start Teams App Locally");
      chai.assert.equal(tasks[count++].label, "Validate & install prerequisites");
      chai.assert.equal(tasks[count++].label, "Install npm packages");
      chai.assert.equal(tasks[count++].label, "Set up tab");
      chai.assert.equal(tasks[count++].label, "Build & upload Teams manifest");
      chai.assert.equal(tasks[count++].label, "Start services");
      chai.assert.equal(tasks[count++].label, "Start frontend");
      chai.assert.equal(tasks.length, count);
    });

    it("frontend with sso (js)", () => {
      const tasks = generateTasks(true, false, false, false, true, "javascript") as any;
      chai.assert.isDefined(tasks);
      let count = 0;
      chai.assert.equal(tasks[count++].label, "Start Teams App Locally");
      chai.assert.equal(tasks[count++].label, "Validate & install prerequisites");
      chai.assert.equal(tasks[count++].label, "Install npm packages");
      chai.assert.equal(tasks[count++].label, "Set up tab");
      chai.assert.equal(tasks[count++].label, "Set up SSO");
      chai.assert.equal(tasks[count++].label, "Build & upload Teams manifest");
      chai.assert.equal(tasks[count++].label, "Start services");
      chai.assert.equal(tasks[count++].label, "Start frontend");
      chai.assert.equal(tasks.length, count);
    });

    it("frontend + backend with sso (js)", () => {
      const tasks = generateTasks(true, true, false, false, true, "javascript") as any;
      chai.assert.isDefined(tasks);
      let count = 0;
      chai.assert.equal(tasks[count++].label, "Start Teams App Locally");
      chai.assert.equal(tasks[count++].label, "Validate & install prerequisites");
      chai.assert.equal(tasks[count++].label, "Install npm packages");
      chai.assert.equal(tasks[count++].label, "Set up tab");
      chai.assert.equal(tasks[count++].label, "Set up SSO");
      chai.assert.equal(tasks[count++].label, "Build & upload Teams manifest");
      chai.assert.equal(tasks[count++].label, "Start services");
      chai.assert.equal(tasks[count++].label, "Start frontend");
      chai.assert.equal(tasks[count++].label, "Start backend");
      chai.assert.equal(tasks[count++].label, "Install Azure Functions binding extensions");
      chai.assert.equal(tasks.length, count);
    });

    it("frontend + backend with sso (ts)", () => {
      const tasks = generateTasks(true, true, false, false, true, "typescript") as any;
      chai.assert.isDefined(tasks);
      let count = 0;
      chai.assert.equal(tasks[count++].label, "Start Teams App Locally");
      chai.assert.equal(tasks[count++].label, "Validate & install prerequisites");
      chai.assert.equal(tasks[count++].label, "Install npm packages");
      chai.assert.equal(tasks[count++].label, "Set up tab");
      chai.assert.equal(tasks[count++].label, "Set up SSO");
      chai.assert.equal(tasks[count++].label, "Build & upload Teams manifest");
      chai.assert.equal(tasks[count++].label, "Start services");
      chai.assert.equal(tasks[count++].label, "Start frontend");
      chai.assert.equal(tasks[count++].label, "Start backend");
      chai.assert.equal(tasks[count++].label, "Install Azure Functions binding extensions");
      chai.assert.equal(tasks[count++].label, "Watch backend");
      chai.assert.equal(tasks.length, count);
    });

    it("bot without sso (js)", () => {
      const tasks = generateTasks(false, false, true, false, false, "javascript") as any;
      chai.assert.isDefined(tasks);
      let count = 0;
      chai.assert.equal(tasks[count++].label, "Start Teams App Locally");
      chai.assert.equal(tasks[count++].label, "Validate & install prerequisites");
      chai.assert.equal(tasks[count++].label, "Install npm packages");
      chai.assert.equal(tasks[count++].label, "Start local tunnel");
      chai.assert.equal(tasks[count++].label, "Set up bot");
      chai.assert.equal(tasks[count++].label, "Build & upload Teams manifest");
      chai.assert.equal(tasks[count++].label, "Start services");
      chai.assert.equal(tasks[count++].label, "Start bot");
      chai.assert.equal(tasks.length, count);
    });

    it("bot with sso (js)", () => {
      const tasks = generateTasks(false, false, true, false, true, "javascript") as any;
      chai.assert.isDefined(tasks);
      let count = 0;
      chai.assert.equal(tasks[count++].label, "Start Teams App Locally");
      chai.assert.equal(tasks[count++].label, "Validate & install prerequisites");
      chai.assert.equal(tasks[count++].label, "Install npm packages");
      chai.assert.equal(tasks[count++].label, "Start local tunnel");
      chai.assert.equal(tasks[count++].label, "Set up bot");
      chai.assert.equal(tasks[count++].label, "Set up SSO");
      chai.assert.equal(tasks[count++].label, "Build & upload Teams manifest");
      chai.assert.equal(tasks[count++].label, "Start services");
      chai.assert.equal(tasks[count++].label, "Start bot");
      chai.assert.equal(tasks.length, count);
    });

    it("frontend + bot without sso (js)", () => {
      const tasks = generateTasks(true, false, true, false, false, "javascript") as any;
      chai.assert.isDefined(tasks);
      let count = 0;
      chai.assert.equal(tasks[count++].label, "Start Teams App Locally");
      chai.assert.equal(tasks[count++].label, "Validate & install prerequisites");
      chai.assert.equal(tasks[count++].label, "Install npm packages");
      chai.assert.equal(tasks[count++].label, "Start local tunnel");
      chai.assert.equal(tasks[count++].label, "Set up tab");
      chai.assert.equal(tasks[count++].label, "Set up bot");
      chai.assert.equal(tasks[count++].label, "Build & upload Teams manifest");
      chai.assert.equal(tasks[count++].label, "Start services");
      chai.assert.equal(tasks[count++].label, "Start frontend");
      chai.assert.equal(tasks[count++].label, "Start bot");
      chai.assert.equal(tasks.length, count);
    });

    it("frontend + backend + bot with sso (js)", () => {
      const tasks = generateTasks(true, true, true, false, true, "javascript") as any;
      chai.assert.isDefined(tasks);
      let count = 0;
      chai.assert.equal(tasks[count++].label, "Start Teams App Locally");
      chai.assert.equal(tasks[count++].label, "Validate & install prerequisites");
      chai.assert.equal(tasks[count++].label, "Install npm packages");
      chai.assert.equal(tasks[count++].label, "Start local tunnel");
      chai.assert.equal(tasks[count++].label, "Set up tab");
      chai.assert.equal(tasks[count++].label, "Set up bot");
      chai.assert.equal(tasks[count++].label, "Set up SSO");
      chai.assert.equal(tasks[count++].label, "Build & upload Teams manifest");
      chai.assert.equal(tasks[count++].label, "Start services");
      chai.assert.equal(tasks[count++].label, "Start frontend");
      chai.assert.equal(tasks[count++].label, "Start backend");
      chai.assert.equal(tasks[count++].label, "Install Azure Functions binding extensions");
      chai.assert.equal(tasks[count++].label, "Start bot");
      chai.assert.equal(tasks.length, count);
    });

    it("frontend + backend + bot with sso (ts)", () => {
      const tasks = generateTasks(true, true, true, false, true, "typescript") as any;
      chai.assert.isDefined(tasks);
      let count = 0;
      chai.assert.equal(tasks[count++].label, "Start Teams App Locally");
      chai.assert.equal(tasks[count++].label, "Validate & install prerequisites");
      chai.assert.equal(tasks[count++].label, "Install npm packages");
      chai.assert.equal(tasks[count++].label, "Start local tunnel");
      chai.assert.equal(tasks[count++].label, "Set up tab");
      chai.assert.equal(tasks[count++].label, "Set up bot");
      chai.assert.equal(tasks[count++].label, "Set up SSO");
      chai.assert.equal(tasks[count++].label, "Build & upload Teams manifest");
      chai.assert.equal(tasks[count++].label, "Start services");
      chai.assert.equal(tasks[count++].label, "Start frontend");
      chai.assert.equal(tasks[count++].label, "Start backend");
      chai.assert.equal(tasks[count++].label, "Install Azure Functions binding extensions");
      chai.assert.equal(tasks[count++].label, "Watch backend");
      chai.assert.equal(tasks[count++].label, "Start bot");
      chai.assert.equal(tasks.length, count);
    });

    it("func hosted bot without (ts)", () => {
      const tasks = generateTasks(false, false, true, true, false, "typescript") as any;
      chai.assert.isDefined(tasks);
      let count = 0;
      chai.assert.equal(tasks[count++].label, "Start Teams App Locally");
      chai.assert.equal(tasks[count++].label, "Validate & install prerequisites");
      chai.assert.equal(tasks[count++].label, "Install npm packages");
      chai.assert.equal(tasks[count++].label, "Start local tunnel");
      chai.assert.equal(tasks[count++].label, "Set up bot");
      chai.assert.equal(tasks[count++].label, "Build & upload Teams manifest");
      chai.assert.equal(tasks[count++].label, "Start services");
      chai.assert.equal(tasks[count++].label, "Start bot");
      chai.assert.equal(tasks[count++].label, "Start Azurite emulator");
      chai.assert.equal(tasks[count++].label, "Watch bot");
      chai.assert.equal(tasks.length, count);
    });
  });

  describe("generateM365Tasks", () => {
    it("m365 frontend with sso (js)", () => {
      const tasks = generateM365Tasks(true, false, false, false, true, "javascript") as any;
      chai.assert.isDefined(tasks);
      let count = 0;
      chai.assert.equal(tasks[count++].label, "Start Teams App Locally");
      chai.assert.equal(tasks[count++].label, "Start Teams App Locally & Install App");
      chai.assert.equal(tasks[count++].label, "Validate & install prerequisites");
      chai.assert.equal(tasks[count++].label, "Install npm packages");
      chai.assert.equal(tasks[count++].label, "Set up tab");
      chai.assert.equal(tasks[count++].label, "Set up SSO");
      chai.assert.equal(tasks[count++].label, "Build & upload Teams manifest");
      chai.assert.equal(tasks[count++].label, "Start services");
      chai.assert.equal(tasks[count++].label, "Start frontend");
      chai.assert.equal(tasks[count++].label, "Install app in Teams");
      chai.assert.equal(tasks.length, count);
    });

    it("m365 bot without sso (js)", () => {
      const tasks = generateM365Tasks(false, false, true, false, false, "javascript") as any;
      chai.assert.isDefined(tasks);
      let count = 0;
      chai.assert.equal(tasks[count++].label, "Start Teams App Locally");
      chai.assert.equal(tasks[count++].label, "Start Teams App Locally & Install App");
      chai.assert.equal(tasks[count++].label, "Validate & install prerequisites");
      chai.assert.equal(tasks[count++].label, "Install npm packages");
      chai.assert.equal(tasks[count++].label, "Start local tunnel");
      chai.assert.equal(tasks[count++].label, "Set up bot");
      chai.assert.equal(tasks[count++].label, "Build & upload Teams manifest");
      chai.assert.equal(tasks[count++].label, "Start services");
      chai.assert.equal(tasks[count++].label, "Start bot");
      chai.assert.equal(tasks[count++].label, "Install app in Teams");
      chai.assert.equal(tasks.length, count);
    });
  });

  describe("generateTasksJson", () => {
    it("frontend + backend + bot with sso (ts)", () => {
      const tasksJson = generateTasksJson(true, true, true, false, true, "typescript");
      const expectedJson = commentJson.parse(expected);
      chai.assert.deepEqual(tasksJson, expectedJson);
      const actual = commentJson.stringify(tasksJson, null, 4);
      chai.assert.equal(actual, expected);
    });
  });

  describe("generateSpfxTasksJson", () => {
    it("spfx", () => {
      const tasksJson = generateSpfxTasksJson();
      const expectedJson = commentJson.parse(spfxExpected);
      chai.assert.deepEqual(tasksJson, expectedJson);
      const actual = commentJson.stringify(tasksJson, null, 4);
      chai.assert.equal(actual, spfxExpected);
    });
  });

  describe("mergeTasksJson", () => {
    it("no overlap", () => {
      const existingData = `// This file is automatically generated by Teams Toolkit.
// See https://aka.ms/teamsfx-debug-tasks to know the details and how to customize each task.
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "test1",
            "type": "shell",
            "command": "echo"
        }
    ],
    "inputs": []
}`;
      const newData = `{
    "tasks": [
        {
            "label": "test2",
            "type": "shell",
            "command": "echo"
        }
    ]
}`;
      const merged = `// This file is automatically generated by Teams Toolkit.
// See https://aka.ms/teamsfx-debug-tasks to know the details and how to customize each task.
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "test1",
            "type": "shell",
            "command": "echo"
        },
        {
            "label": "test2",
            "type": "shell",
            "command": "echo"
        }
    ],
    "inputs": []
}`;
      const result = mergeTasksJson(
        commentJson.parse(existingData) as CommentObject,
        commentJson.parse(newData) as CommentObject
      );
      chai.assert.deepEqual(result, commentJson.parse(merged));
      const actual = commentJson.stringify(result, null, 4);
      chai.assert.equal(actual, merged);
    });
  });
});

const expected = `// This file is automatically generated by Teams Toolkit.
// The teamsfx tasks defined in this file require Teams Toolkit version >= 4.1.0.
// See https://aka.ms/teamsfx-debug-tasks for details on how to customize each task and how to integrate with existing Teams Toolkit projects.
{
    "version": "2.0.0",
    "tasks": [
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
                        "npmInstallArgs": [
                            "--no-audit"
                        ]
                    },
                    {
                        "cwd": "\${workspaceFolder}/api",
                        "npmInstallArgs": [
                            "--no-audit"
                        ]
                    },
                    {
                        "cwd": "\${workspaceFolder}/bot",
                        "npmInstallArgs": [
                            "--no-audit"
                        ]
                    }
                ]
            }
        },
        {
            // Start the local tunnel service to forward public ngrok URL to local port and inspect traffic.
            // See https://aka.ms/teamsfx-local-tunnel-task for the detailed args definitions,
            // as well as samples to:
            //   - use your own ngrok command / configuration / binary
            //   - use your own tunnel solution
            //   - provide alternatives if ngrok does not work on your dev machine
            "label": "Start local tunnel",
            "type": "teamsfx",
            "command": "debug-start-local-tunnel",
            "args": {
                "ngrokArgs": "http 3978 --log=stdout --log-format=logfmt"
            },
            "isBackground": true,
            "problemMatcher": "\$teamsfx-local-tunnel-watch"
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
                // "botPassword": "", // use plain text or environment variable reference like \${env:BOT_PASSWORD}
                "botMessagingEndpoint": "/api/messages" // use your own routing "/any/path", or full URL "https://contoso.com/any/path"
            }
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
                // "clientSecret": "", // use plain text or environment variable reference like \${env:CLIENT_SECRET}
                // "accessAsUserScopeId": "
            }
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
        },
        {
            "label": "Start services",
            "dependsOn": [
                "Start frontend",
                "Start backend",
                "Start bot"
            ]
        },
        {
            "label": "Start frontend",
            "type": "shell",
            "command": "npm run dev:teamsfx",
            "isBackground": true,
            "options": {
                "cwd": "\${workspaceFolder}/tabs"
            },
            "problemMatcher": {
                "pattern": {
                    "regexp": "^.*$",
                    "file": 0,
                    "location": 1,
                    "message": 2
                },
                "background": {
                    "activeOnStart": true,
                    "beginsPattern": ".*",
                    "endsPattern": "Compiled|Failed|compiled|failed"
                }
            }
        },
        {
            "label": "Start backend",
            "type": "shell",
            "command": "npm run dev:teamsfx",
            "isBackground": true,
            "options": {
                "cwd": "\${workspaceFolder}/api",
                "env": {
                    "PATH": "\${command:fx-extension.get-func-path}\${env:PATH}"
                }
            },
            "problemMatcher": {
                "pattern": {
                    "regexp": "^.*$",
                    "file": 0,
                    "location": 1,
                    "message": 2
                },
                "background": {
                    "activeOnStart": true,
                    "beginsPattern": "^.*(Job host stopped|signaling restart).*$",
                    "endsPattern": "^.*(Worker process started and initialized|Host lock lease acquired by instance ID).*$"
                }
            },
            "presentation": {
                "reveal": "silent"
            },
            "dependsOn": [
                "Install Azure Functions binding extensions",
                "Watch backend"
            ]
        },
        {
            // TeamsFx Azure Functions project depends on extra Azure Functions binding extensions for HTTP trigger authorization.
            "label": "Install Azure Functions binding extensions",
            "type": "shell",
            "command": "dotnet build extensions.csproj -o ./bin --ignore-failed-sources",
            "options": {
                "cwd": "\${workspaceFolder}/api",
                "env": {
                    "PATH": "\${command:fx-extension.get-dotnet-path}\${env:PATH}"
                }
            },
            "presentation": {
                "reveal": "silent"
            }
        },
        {
            "label": "Watch backend",
            "type": "shell",
            "command": "npm run watch:teamsfx",
            "isBackground": true,
            "options": {
                "cwd": "\${workspaceFolder}/api"
            },
            "problemMatcher": "\$tsc-watch",
            "presentation": {
                "reveal": "silent"
            }
        },
        {
            "label": "Start bot",
            "type": "shell",
            "command": "npm run dev:teamsfx",
            "isBackground": true,
            "options": {
                "cwd": "\${workspaceFolder}/bot"
            },
            "problemMatcher": {
                "pattern": [
                    {
                        "regexp": "^.*$",
                        "file": 0,
                        "location": 1,
                        "message": 2
                    }
                ],
                "background": {
                    "activeOnStart": true,
                    "beginsPattern": "[nodemon] starting",
                    "endsPattern": "restify listening to|Bot/ME service listening at|[nodemon] app crashed"
                }
            },
            "presentation": {
                "reveal": "silent"
            }
        }
    ]
}`;

const spfxExpected = `// This file is automatically generated by Teams Toolkit.
// The teamsfx tasks defined in this file require Teams Toolkit version >= 4.1.0.
// See https://aka.ms/teamsfx-debug-tasks for details on how to customize each task and how to integrate with existing Teams Toolkit projects.
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Start Teams App Locally",
            "dependsOn": [
                "Validate & install prerequisites",
                "Build & upload Teams manifest",
                "gulp serve"
            ],
            "dependsOrder": "sequence"
        },
        {
            "label": "Start Teams App Locally & Install App",
            "dependsOn": [
                "Validate & install prerequisites",
                "Build & upload Teams manifest",
                "gulp serve",
                "Install app in Teams"
            ],
            "dependsOrder": "sequence"
        },
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
                    4321 // SPFx service port
                ]
            }
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
                        "cwd": "\${workspaceFolder}/SPFx",
                        "npmInstallArgs": [
                            "--no-audit"
                        ]
                    }
                ]
            }
        },
        {
            "label": "gulp trust-dev-cert",
            "type": "process",
            "command": "node",
            "args": [
                "\${workspaceFolder}/SPFx/node_modules/gulp/bin/gulp.js",
                "trust-dev-cert"
            ],
            "options": {
                "cwd": "\${workspaceFolder}/SPFx"
            },
            "dependsOn": "Install npm packages"
        },
        {
            "label": "gulp serve",
            "type": "process",
            "command": "node",
            "args": [
                "\${workspaceFolder}/SPFx/node_modules/gulp/bin/gulp.js",
                "serve",
                "--nobrowser"
            ],
            "problemMatcher": [
                {
                    "pattern": [
                        {
                            "regexp": ".",
                            "file": 1,
                            "location": 2,
                            "message": 3
                        }
                    ],
                    "background": {
                        "activeOnStart": true,
                        "beginsPattern": "^.*Starting gulp.*",
                        "endsPattern": "^.*Finished subtask 'reload'.*"
                    }
                }
            ],
            "isBackground": true,
            "options": {
                "cwd": "\${workspaceFolder}/SPFx"
            },
            "dependsOn": "gulp trust-dev-cert"
        },
        {
            "label": "Install app in Teams",
            "type": "shell",
            "command": "exit \${command:fx-extension.install-app-in-teams}",
            "presentation": {
                "reveal": "never"
            }
        },
        {
            "label": "Terminate All Tasks",
            "command": "echo \${input:terminate}",
            "type": "shell",
            "problemMatcher": []
        }
    ],
    "inputs": [
        {
            "id": "terminate",
            "type": "command",
            "command": "workbench.action.tasks.terminate",
            "args": "terminateAll"
        }
    ]
}`;
