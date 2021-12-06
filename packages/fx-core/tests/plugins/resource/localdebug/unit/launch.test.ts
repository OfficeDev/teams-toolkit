import "mocha";
import * as Launch from "../../../../../src/plugins/resource/localdebug/launch";
import * as chai from "chai";

describe("launch", () => {
  describe("#getLaunchNamePrefix", () => {
    const defaultLaunchConfigTestInput = [
      {
        name: "Tab",
        includeFrontend: true,
        includeBackend: false,
        includeBot: false,
        isMigrateFromV1: false,
        isSpfx: false,
      },
      {
        name: "Tab + Bot",
        includeFrontend: true,
        includeBackend: false,
        includeBot: true,
        isMigrateFromV1: false,
        isSpfx: false,
      },
      {
        name: "Tab + Function",
        includeFrontend: true,
        includeBackend: true,
        includeBot: false,
        isMigrateFromV1: false,
        isSpfx: false,
      },
      {
        name: "Tab + Function + Bot",
        includeFrontend: true,
        includeBackend: true,
        includeBot: true,
        isMigrateFromV1: false,
        isSpfx: false,
      },
      {
        name: "Bot",
        includeFrontend: false,
        includeBackend: false,
        includeBot: true,
        isMigrateFromV1: false,
        isSpfx: false,
      },
      {
        name: "V1 Tab",
        includeFrontend: true,
        includeBackend: false,
        includeBot: false,
        isMigrateFromV1: true,
        isSpfx: false,
      },
      {
        name: "V1 Bot",
        includeFrontend: false,
        includeBackend: false,
        includeBot: true,
        isMigrateFromV1: true,
        isSpfx: false,
      },
      {
        name: "SPFX",
        includeFrontend: false,
        includeBackend: false,
        includeBot: false,
        isMigrateFromV1: false,
        isSpfx: true,
      },
    ];

    defaultLaunchConfigTestInput.forEach((input) => {
      it(input.name, () => {
        const launchConfigurations = input.isSpfx
          ? Launch.generateSpfxConfigurations()
          : Launch.generateConfigurations(
              input.includeFrontend,
              input.includeBackend,
              input.includeBot,
              input.isMigrateFromV1
            );

        const launchCompounds = input.isSpfx
          ? Launch.generateSpfxCompounds()
          : Launch.generateCompounds(input.includeFrontend, input.includeBackend, input.includeBot);

        const launchConfig = {
          version: "0.2.0",
          configurations: launchConfigurations,
          compounds: launchCompounds,
        };

        const prefix = Launch.getLaunchNamePrefix(launchConfig, input.isSpfx);
        chai.assert.equal(prefix, input.isSpfx ? "Teams workbench" : "Debug");
      });
    });

    const userDefinedLaunchConfigTestInput = [
      {
        name: "No compounds in launch.json",
        launchConfig: {},
        isSpfx: false,
      },
      {
        name: "No compounds in launch.json (SPFX)",
        launchConfig: { compounds: [] },
        isSpfx: true,
      },
      {
        name: "Self defined compound in launch.json",
        launchConfig: {
          compounds: [
            {
              name: "Test Debug 1",
            },
            {
              name: "Test Debug 2",
            },
          ],
        },
        isSpfx: false,
      },
      {
        name: "Self defined compound in launch.json (SPFX)",
        launchConfig: {
          compounds: [
            {
              name: "Test Debug 1",
            },
          ],
        },
        isSpfx: true,
      },
      {
        name: "New compound in launch.json",
        launchConfig: {
          compounds: [
            {
              name: "Test Debug 1",
            },
            {
              name: "Test Debug 2",
            },
            {
              name: "Debug (Edge)",
            },
          ],
        },
        isSpfx: false,
        prefix: "Debug",
      },
      {
        name: "New compound in launch.json (SPFX)",
        launchConfig: {
          compounds: [
            {
              name: "Teams workbench (Chrome)",
            },
            {
              name: "Debug (Edge)",
            },
          ],
        },
        isSpfx: true,
        prefix: "Teams workbench",
      },
      {
        name: "Error compound type in launch.json",
        launchConfig: {
          compounds: "string",
        },
        isSpfx: false,
      },
    ];

    userDefinedLaunchConfigTestInput.forEach((input) => {
      it(input.name, () => {
        const prefix = Launch.getLaunchNamePrefix(input.launchConfig, input.isSpfx);
        chai.assert.equal(prefix, input?.prefix);
      });
    });
  });
});
