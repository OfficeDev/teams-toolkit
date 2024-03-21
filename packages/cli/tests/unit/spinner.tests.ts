// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { expect } from "chai";
import "mocha";
import sinon from "sinon";
import { CustomizedSpinner } from "../../src/spinner";
import { TextType } from "../../src/colorize";

describe("CustomizedSpinner", function () {
  let clock: sinon.SinonFakeTimers;
  let writeStub: sinon.SinonStub;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    writeStub = sinon.stub(process.stdout, "write");
  });

  afterEach(() => {
    clock.restore();
    writeStub.restore();
  });

  describe("should correctly cycle through spinner frames on start", async () => {
    it("", async () => {
      const spinner = new CustomizedSpinner();
      spinner.start();

      clock.tick(spinner.refreshInterval * 3);

      expect(writeStub.callCount).to.equal(4);
      expect(writeStub.lastCall.args[0]).to.include(spinner.spinnerFrames[2]);

      spinner.stop();
    });
  });

  describe("should hide and show the cursor on start and stop", async () => {
    it("", async () => {
      const spinner = new CustomizedSpinner();
      spinner.start();

      expect(writeStub.firstCall.args[0]).to.equal("\x1b[?25l");

      spinner.stop();

      expect(writeStub.lastCall.args[0]).to.equal("\x1b[?25h");
    });
  });

  describe("should allow custom spinner frames, text type, and refresh interval", async () => {
    it("", async () => {
      const customFrames = ["-", "\\", "|", "/"];
      const customTextType = TextType.Info;
      const customInterval = 200;
      const spinner = new CustomizedSpinner({
        spinnerFrames: customFrames,
        textType: customTextType,
        refreshInterval: customInterval,
      });
      expect(spinner.spinnerFrames).to.deep.equal(customFrames);
      expect(spinner.textType).to.equal(customTextType);
      expect(spinner.refreshInterval).to.equal(customInterval);
    });
  });
});
