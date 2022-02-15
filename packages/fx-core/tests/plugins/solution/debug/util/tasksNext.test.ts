// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import { generateTasks } from "../../../../../src/plugins/solution/fx-solution/debug/util/tasksNext";

describe("tasksNext", () => {
  describe("generateTasks", () => {
    it("frontend", () => {
      const tasks = generateTasks(true, false, false, "javascript");
      chai.assert.isDefined(tasks);
      chai.assert.equal(tasks.length, 5);
      chai.assert.equal(tasks[0].label, "Pre Debug Check & Start All");
      chai.assert.equal(tasks[1].label, "validate local prerequisites");
      chai.assert.equal(tasks[2].label, "prepare local environment");
      chai.assert.equal(tasks[3].label, "start all");
      chai.assert.equal(tasks[4].label, "start frontend");
    });

    it("frontend + backend (js)", () => {
      const tasks = generateTasks(true, true, false, "javascript");
      chai.assert.isDefined(tasks);
      chai.assert.equal(tasks.length, 6);
      chai.assert.equal(tasks[0].label, "Pre Debug Check & Start All");
      chai.assert.equal(tasks[1].label, "validate local prerequisites");
      chai.assert.equal(tasks[2].label, "prepare local environment");
      chai.assert.equal(tasks[3].label, "start all");
      chai.assert.equal(tasks[4].label, "start frontend");
      chai.assert.equal(tasks[5].label, "start backend");
    });

    it("frontend + backend (ts)", () => {
      const tasks = generateTasks(true, true, false, "typescript");
      chai.assert.isDefined(tasks);
      chai.assert.equal(tasks.length, 7);
      chai.assert.equal(tasks[0].label, "Pre Debug Check & Start All");
      chai.assert.equal(tasks[1].label, "validate local prerequisites");
      chai.assert.equal(tasks[2].label, "prepare local environment");
      chai.assert.equal(tasks[3].label, "start all");
      chai.assert.equal(tasks[4].label, "start frontend");
      chai.assert.equal(tasks[5].label, "start backend");
      chai.assert.equal(tasks[6].label, "watch backend");
    });

    it("bot", () => {
      const tasks = generateTasks(false, false, true, "javascript");
      chai.assert.isDefined(tasks);
      chai.assert.equal(tasks.length, 6);
      chai.assert.equal(tasks[0].label, "Pre Debug Check & Start All");
      chai.assert.equal(tasks[1].label, "validate local prerequisites");
      chai.assert.equal(tasks[2].label, "start ngrok");
      chai.assert.equal(tasks[3].label, "prepare local environment");
      chai.assert.equal(tasks[4].label, "start all");
      chai.assert.equal(tasks[5].label, "start bot");
    });

    it("frontend + bot", () => {
      const tasks = generateTasks(true, false, true, "javascript");
      chai.assert.isDefined(tasks);
      chai.assert.equal(tasks.length, 7);
      chai.assert.equal(tasks[0].label, "Pre Debug Check & Start All");
      chai.assert.equal(tasks[1].label, "validate local prerequisites");
      chai.assert.equal(tasks[2].label, "start ngrok");
      chai.assert.equal(tasks[3].label, "prepare local environment");
      chai.assert.equal(tasks[4].label, "start all");
      chai.assert.equal(tasks[5].label, "start frontend");
      chai.assert.equal(tasks[6].label, "start bot");
    });

    it("frontend + backend (js) + bot", () => {
      const tasks = generateTasks(true, true, true, "javascript");
      chai.assert.isDefined(tasks);
      chai.assert.equal(tasks.length, 8);
      chai.assert.equal(tasks[0].label, "Pre Debug Check & Start All");
      chai.assert.equal(tasks[1].label, "validate local prerequisites");
      chai.assert.equal(tasks[2].label, "start ngrok");
      chai.assert.equal(tasks[3].label, "prepare local environment");
      chai.assert.equal(tasks[4].label, "start all");
      chai.assert.equal(tasks[5].label, "start frontend");
      chai.assert.equal(tasks[6].label, "start backend");
      chai.assert.equal(tasks[7].label, "start bot");
    });

    it("frontend + backend (ts) + bot", () => {
      const tasks = generateTasks(true, true, true, "typescript");
      chai.assert.isDefined(tasks);
      chai.assert.equal(tasks.length, 9);
      chai.assert.equal(tasks[0].label, "Pre Debug Check & Start All");
      chai.assert.equal(tasks[1].label, "validate local prerequisites");
      chai.assert.equal(tasks[2].label, "start ngrok");
      chai.assert.equal(tasks[3].label, "prepare local environment");
      chai.assert.equal(tasks[4].label, "start all");
      chai.assert.equal(tasks[5].label, "start frontend");
      chai.assert.equal(tasks[6].label, "start backend");
      chai.assert.equal(tasks[7].label, "watch backend");
      chai.assert.equal(tasks[8].label, "start bot");
    });
  });
});
