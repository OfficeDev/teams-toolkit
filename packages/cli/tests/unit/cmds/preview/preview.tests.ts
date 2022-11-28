// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as path from "path";
import mock from "mock-fs";

import { FxError, ok, err, UserError } from "@microsoft/teamsfx-api";
import * as sinon from "sinon";

import Preview from "../../../../src/cmds/preview/preview";
import { expect } from "../../utils";
import { Task, TaskResult } from "../../../../src/cmds/preview/task";
import { ProgrammingLanguage } from "@microsoft/teamsfx-core";

describe("sequentialTasks", () => {
  const sequentialTasks = Preview.sequentialTasks;
  // Arrange
  const testError = new UserError("TestError", "Test Error", "UnitTest");
  const testError2 = new UserError("TestError2", "Test Error 2", "UnitTest");

  // polyfill for TypeScript < 4.5. After upgrading to 4.5, use Awaited instead.
  type AwaitedType<T> = T extends PromiseLike<infer U> ? U : T;
  const cases: [
    Parameters<typeof sequentialTasks>,
    AwaitedType<ReturnType<typeof sequentialTasks>>,
    string
  ][] = [
    [[], ok([]), "No task"],
    [
      [() => Promise.resolve(ok("a")), () => undefined, () => Promise.resolve(ok("b"))],
      ok(["a", undefined, "b"]),
      "Success tasks with undefined",
    ],
    [[() => Promise.resolve(ok("a"))], ok(["a"]), "Single success task"],
    [
      [() => Promise.resolve(ok("a")), () => Promise.resolve(ok("b"))],
      ok(["a", "b"]),
      "Multiple success tasks",
    ],
    [[() => Promise.resolve(err(testError))], err(testError), "Single error task"],
    [
      [() => undefined, () => Promise.resolve(err(testError))],
      err(testError),
      "Error tasks with undefined",
    ],
    [
      [
        () => Promise.resolve(ok("a")),
        () => Promise.resolve(err(testError)),
        () => Promise.resolve(ok("b")),
      ],
      err(testError),
      "Multiple mixed tasks",
    ],
    [
      [
        () => Promise.resolve(ok("a")),
        () => Promise.resolve(err(testError)),
        () => Promise.resolve(err(testError2)),
        () => Promise.resolve(ok("b")),
      ],
      err(testError),
      "Multiple mixed tasks 2",
    ],
  ];
  for (const [input, expected, message] of cases) {
    it(`Case '${message}'`, async () => {
      // Act
      const output = await sequentialTasks(...input);

      // Assert
      expect(output).to.deep.equal(expected, message);
    });
  }
});

describe("createBotTasksForStartServices", () => {
  let preview: Preview;
  const sandbox = sinon.createSandbox();
  beforeEach(() => {
    preview = new Preview();

    sandbox
      .stub(Task.prototype, "waitFor")
      .callsFake(async function (this: { taskTitle: string; command: string }) {
        return ok(makeResult(this.taskTitle, this.command));
      });
  });
  afterEach(() => {
    sandbox.restore();
    mock.restore();
  });

  const worksapceFolder = "fake workspace folder";
  const funcCoreToolsPath = "fake func core tools path";
  function makeResult(name: string, command: string): TaskResult & { name: string } {
    // use command to check whether the returned task is correct
    return {
      name: name,
      command: command,
      success: true,
      stdout: [],
      stderr: [],
      exitCode: 0,
    };
  }

  // Arrange
  const cases: [string, boolean, boolean, boolean, (unknown | FxError | undefined)[], string][] = [
    // language, includeBot, includeFuncHostedBot, hasTeamsFxDevScript, expected, message
    [ProgrammingLanguage.JS, false, false, false, [], "JavaScript, no bot"],
    [ProgrammingLanguage.TS, false, false, false, [], "TypeScript, no bot"],
    [
      ProgrammingLanguage.JS,
      true,
      false,
      false,
      [
        [undefined, makeResult("bot start", "npx nodemon --inspect=9239 --signal SIGINT index.js")],
        undefined,
      ],
      "JavaScript, legacy bot",
    ],
    [
      ProgrammingLanguage.JS,
      true,
      false,
      false,
      [
        [undefined, makeResult("bot start", "npx nodemon --inspect=9239 --signal SIGINT index.js")],
        undefined,
      ],
      "TypeScript, legacy bot",
    ],
    [
      ProgrammingLanguage.JS,
      true,
      false,
      true,
      [[undefined, makeResult("bot start", "npm run dev:teamsfx")], undefined],
      "JavaScript, legacy bot, new local preview",
    ],
    [
      ProgrammingLanguage.TS,
      true,
      false,
      true,
      [[undefined, makeResult("bot start", "npm run dev:teamsfx")], undefined],
      "TypeScript, legacy bot, new local preview",
    ],
    [
      ProgrammingLanguage.JS,
      true,
      true,
      true,
      [
        [undefined, makeResult("bot start", "npm run dev:teamsfx")],
        makeResult("start Azurite emulator", "npm run prepare-storage:teamsfx"),
      ],
      "JavaScript, func hosted bot",
    ],
    [
      ProgrammingLanguage.TS,
      true,
      true,
      true,
      [
        [
          makeResult("bot watch", "npm run watch:teamsfx"),
          makeResult("bot start", "npm run dev:teamsfx"),
        ],
        makeResult("start Azurite emulator", "npm run prepare-storage:teamsfx"),
      ],
      "TypeScript, func hosted bot",
    ],
  ];
  const localEnv = {};

  const funcEnv = { PATH: path.delimiter + funcCoreToolsPath };
  for (const [
    lang,
    includeBot,
    includeFuncHostedBot,
    hasTeamsFxDevScript,
    expected,
    message,
  ] of cases) {
    it(`Case '${message}'`, async () => {
      // mock package.json for hasTeamsfxDevScript
      mock({
        [path.join(worksapceFolder, "bot", "package.json")]: JSON.stringify({
          scripts: hasTeamsFxDevScript ? { "dev:teamsfx": "fake script" } : {},
        }),
      });

      const actualResult = [];
      try {
        // Act
        const promises = await preview.createBotTasksForStartServices(
          worksapceFolder,
          lang,
          includeBot,
          includeFuncHostedBot,
          localEnv,
          funcEnv
        );
        for (const item of promises) {
          if (item) {
            const awaitedItem = await item;
            // unpack the values so expect(...) errors are more readable
            actualResult.push(awaitedItem.isOk() ? awaitedItem.value : awaitedItem.error);
          } else {
            actualResult.push(undefined);
          }
        }
      } catch (e) {
        expect.fail(`Case '${message}' failed, error = '${e}', stack = '${e.stack}'`);
      }

      // Assert
      expect(actualResult).to.deep.equal(expected, message);
    });
  }
});
