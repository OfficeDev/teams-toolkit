// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as chai from "chai";
import {
  generateM365Tasks,
  generateTasks,
} from "../../../../../src/component/debug/util/tasksNext";

describe("tasksNext", () => {
  describe("generateTasks", () => {
    it("frontend", () => {
      const tasks = generateTasks(true, false, false, false, "javascript");
      chai.assert.isDefined(tasks);
      chai.assert.equal(tasks.length, 5);
      chai.assert.equal(tasks[0].label, "Pre Debug Check & Start All");
      chai.assert.equal(tasks[1].label, "validate local prerequisites");
      chai.assert.equal(tasks[2].label, "prepare local environment");
      chai.assert.equal(tasks[3].label, "Start All");
      chai.assert.equal(tasks[4].label, "Start Frontend");
    });

    it("m365 frontend", () => {
      const tasks = generateM365Tasks(true, false, false, "javascript");
      chai.assert.isDefined(tasks);
      chai.assert.equal(tasks.length, 7);
      chai.assert.equal(tasks[0].label, "Pre Debug Check & Start All");
      chai.assert.equal(tasks[1].label, "Pre Debug Check & Start All & Install App");
      chai.assert.equal(tasks[2].label, "validate local prerequisites");
      chai.assert.equal(tasks[3].label, "prepare local environment");
      chai.assert.equal(tasks[4].label, "Start All");
      chai.assert.equal(tasks[5].label, "install app in Teams");
      chai.assert.equal(tasks[6].label, "Start Frontend");
    });

    it("frontend + backend (js)", () => {
      const tasks = generateTasks(true, true, false, false, "javascript");
      chai.assert.isDefined(tasks);
      chai.assert.equal(tasks.length, 6);
      chai.assert.equal(tasks[0].label, "Pre Debug Check & Start All");
      chai.assert.equal(tasks[1].label, "validate local prerequisites");
      chai.assert.equal(tasks[2].label, "prepare local environment");
      chai.assert.equal(tasks[3].label, "Start All");
      chai.assert.equal(tasks[4].label, "Start Frontend");
      chai.assert.equal(tasks[5].label, "Start Backend");
    });

    it("frontend + backend (ts)", () => {
      const tasks = generateTasks(true, true, false, false, "typescript");
      chai.assert.isDefined(tasks);
      chai.assert.equal(tasks.length, 7);
      chai.assert.equal(tasks[0].label, "Pre Debug Check & Start All");
      chai.assert.equal(tasks[1].label, "validate local prerequisites");
      chai.assert.equal(tasks[2].label, "prepare local environment");
      chai.assert.equal(tasks[3].label, "Start All");
      chai.assert.equal(tasks[4].label, "Start Frontend");
      chai.assert.equal(tasks[5].label, "Start Backend");
      chai.assert.equal(tasks[6].label, "Watch Backend");
    });

    it("bot", () => {
      const tasks = generateTasks(false, false, true, false, "javascript");
      chai.assert.isDefined(tasks);
      chai.assert.equal(tasks.length, 6);
      chai.assert.equal(tasks[0].label, "Pre Debug Check & Start All");
      chai.assert.equal(tasks[1].label, "validate local prerequisites");
      chai.assert.equal(tasks[2].label, "start ngrok");
      chai.assert.equal(tasks[3].label, "prepare local environment");
      chai.assert.equal(tasks[4].label, "Start All");
      chai.assert.equal(tasks[5].label, "Start Bot");
    });

    it("m365 bot", () => {
      const tasks = generateM365Tasks(false, false, true, "javascript");
      chai.assert.isDefined(tasks);
      chai.assert.equal(tasks.length, 8);
      chai.assert.equal(tasks[0].label, "Pre Debug Check & Start All");
      chai.assert.equal(tasks[1].label, "Pre Debug Check & Start All & Install App");
      chai.assert.equal(tasks[2].label, "validate local prerequisites");
      chai.assert.equal(tasks[3].label, "start ngrok");
      chai.assert.equal(tasks[4].label, "prepare local environment");
      chai.assert.equal(tasks[5].label, "Start All");
      chai.assert.equal(tasks[6].label, "install app in Teams");
      chai.assert.equal(tasks[7].label, "Start Bot");
    });

    it("frontend + bot", () => {
      const tasks = generateTasks(true, false, true, false, "javascript");
      chai.assert.isDefined(tasks);
      chai.assert.equal(tasks.length, 7);
      chai.assert.equal(tasks[0].label, "Pre Debug Check & Start All");
      chai.assert.equal(tasks[1].label, "validate local prerequisites");
      chai.assert.equal(tasks[2].label, "start ngrok");
      chai.assert.equal(tasks[3].label, "prepare local environment");
      chai.assert.equal(tasks[4].label, "Start All");
      chai.assert.equal(tasks[5].label, "Start Frontend");
      chai.assert.equal(tasks[6].label, "Start Bot");
    });

    it("frontend + backend (js) + bot", () => {
      const tasks = generateTasks(true, true, true, false, "javascript");
      chai.assert.isDefined(tasks);
      chai.assert.equal(tasks.length, 8);
      chai.assert.equal(tasks[0].label, "Pre Debug Check & Start All");
      chai.assert.equal(tasks[1].label, "validate local prerequisites");
      chai.assert.equal(tasks[2].label, "start ngrok");
      chai.assert.equal(tasks[3].label, "prepare local environment");
      chai.assert.equal(tasks[4].label, "Start All");
      chai.assert.equal(tasks[5].label, "Start Frontend");
      chai.assert.equal(tasks[6].label, "Start Backend");
      chai.assert.equal(tasks[7].label, "Start Bot");
    });

    it("frontend + backend (ts) + bot", () => {
      const tasks = generateTasks(true, true, true, false, "typescript");
      chai.assert.isDefined(tasks);
      chai.assert.equal(tasks.length, 9);
      chai.assert.equal(tasks[0].label, "Pre Debug Check & Start All");
      chai.assert.equal(tasks[1].label, "validate local prerequisites");
      chai.assert.equal(tasks[2].label, "start ngrok");
      chai.assert.equal(tasks[3].label, "prepare local environment");
      chai.assert.equal(tasks[4].label, "Start All");
      chai.assert.equal(tasks[5].label, "Start Frontend");
      chai.assert.equal(tasks[6].label, "Start Backend");
      chai.assert.equal(tasks[7].label, "Watch Backend");
      chai.assert.equal(tasks[8].label, "Start Bot");
    });

    it("bot + backend (js)", () => {
      const tasks = generateTasks(false, true, true, false, "javascript");
      chai.assert.isDefined(tasks);
      chai.assert.equal(tasks.length, 7);
      chai.assert.equal(tasks[0].label, "Pre Debug Check & Start All");
      chai.assert.equal(tasks[1].label, "validate local prerequisites");
      chai.assert.equal(tasks[2].label, "start ngrok");
      chai.assert.equal(tasks[3].label, "prepare local environment");
      chai.assert.equal(tasks[4].label, "Start All");
      chai.assert.equal(tasks[5].label, "Start Backend");
      chai.assert.equal(tasks[6].label, "Start Bot");
    });

    it("bot + backend (ts)", () => {
      const tasks = generateTasks(false, true, true, false, "typescript");
      chai.assert.isDefined(tasks);
      chai.assert.equal(tasks.length, 8);
      chai.assert.equal(tasks[0].label, "Pre Debug Check & Start All");
      chai.assert.equal(tasks[1].label, "validate local prerequisites");
      chai.assert.equal(tasks[2].label, "start ngrok");
      chai.assert.equal(tasks[3].label, "prepare local environment");
      chai.assert.equal(tasks[4].label, "Start All");
      chai.assert.equal(tasks[5].label, "Start Backend");
      chai.assert.equal(tasks[6].label, "Watch Backend");
      chai.assert.equal(tasks[7].label, "Start Bot");
    });
    it("func hosted bot", () => {
      const tasks = generateTasks(false, false, true, true, "typescript");
      chai.assert.isDefined(tasks);
      chai.assert.equal(tasks.length, 8);
      chai.assert.equal(tasks[0].label, "Pre Debug Check & Start All");
      chai.assert.equal(tasks[1].label, "validate local prerequisites");
      chai.assert.equal(tasks[2].label, "start ngrok");
      chai.assert.equal(tasks[3].label, "prepare local environment");
      chai.assert.equal(tasks[4].label, "Start All");
      chai.assert.equal(tasks[5].label, "Start Bot");
      chai.assert.equal(tasks[6].label, "Start Azurite Emulator");
      chai.assert.equal(tasks[7].label, "Watch Bot");
    });
  });
});
