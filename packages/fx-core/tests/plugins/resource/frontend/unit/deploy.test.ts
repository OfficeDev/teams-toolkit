// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

import faker from "faker";
import mockfs from "mock-fs";

import { FrontendDeployment } from "../../../../../src/plugins/resource/frontend/ops/deploy";

chai.use(chaiAsPromised);

describe("FrontendDeploy", async () => {
  const today = new Date();
  const yesterday = new Date();
  const tomorrow = new Date();
  const longAgo = new Date();
  yesterday.setDate(today.getDate() - 1);
  longAgo.setDate(today.getDate() - 10);
  tomorrow.setDate(today.getDate() + 1);

  describe("needBuild", async () => {
    afterEach(() => {
      mockfs.restore();
    });

    it("some files changed since last build", async () => {
      mockfs({
        tabs: mockfs.directory({
          ctime: longAgo,
          mtime: longAgo,
          items: {
            ".deployment": mockfs.directory({
              mtime: yesterday,
              ctime: yesterday,
              items: {
                "deployment.json": mockfs.file({
                  content: `{"lastBuildTime":"${yesterday.toISOString()}"}`,
                  ctime: yesterday,
                  mtime: yesterday,
                }),
              },
            }),
            dir: mockfs.directory({
              mtime: today,
              ctime: today,
              items: {
                "some-file.txt": mockfs.file({
                  content: faker.lorem.lines(),
                  ctime: today,
                  mtime: today,
                }),
              },
            }),
            node_modules: mockfs.directory({
              mtime: tomorrow,
              ctime: tomorrow,
              items: {
                "some-js-file.txt": mockfs.file({
                  content: faker.lorem.lines(),
                  ctime: tomorrow,
                  mtime: tomorrow,
                }),
              },
            }),
          },
        }),
      });

      const result = await FrontendDeployment.needBuild("tabs");
      chai.assert.isTrue(result);
    });

    it("nothing changed since last build", async () => {
      mockfs({
        tabs: mockfs.directory({
          ctime: longAgo,
          mtime: longAgo,
          items: {
            ".deployment": mockfs.directory({
              mtime: yesterday,
              ctime: yesterday,
              items: {
                "deployment.json": mockfs.file({
                  content: `{"lastBuildTime":"${today.toISOString()}"}`,
                  ctime: yesterday,
                  mtime: yesterday,
                }),
              },
            }),
            dir: mockfs.directory({
              mtime: yesterday,
              ctime: yesterday,
              items: {
                "some-file.txt": mockfs.file({
                  content: faker.lorem.lines(),
                  ctime: yesterday,
                  mtime: yesterday,
                }),
              },
            }),
            node_modules: mockfs.directory({
              mtime: tomorrow,
              ctime: tomorrow,
              items: {
                "some-js-file.txt": mockfs.file({
                  content: faker.lorem.lines(),
                  ctime: tomorrow,
                  mtime: tomorrow,
                }),
              },
            }),
          },
        }),
      });

      const result = await FrontendDeployment.needBuild("tabs");
      chai.assert.isFalse(result);
    });
  });

  describe("needDeploy", () => {
    afterEach(() => {
      mockfs.restore();
    });

    it("have built since last deployment", async () => {
      mockfs({
        tabs: mockfs.directory({
          ctime: longAgo,
          mtime: longAgo,
          items: {
            ".deployment": mockfs.directory({
              mtime: yesterday,
              ctime: yesterday,
              items: {
                "deployment.json": mockfs.file({
                  content: `{"lastBuildTime":"${today.toISOString()}","lastDeployTime":"${yesterday.toISOString()}"}`,
                  ctime: yesterday,
                  mtime: yesterday,
                }),
              },
            }),
          },
        }),
      });
      const result = await FrontendDeployment.needDeploy("tabs");
      chai.assert.isTrue(result);
    });

    it("no built since last deployment", async () => {
      mockfs({
        tabs: mockfs.directory({
          ctime: longAgo,
          mtime: longAgo,
          items: {
            ".deployment": mockfs.directory({
              mtime: today,
              ctime: today,
              items: {
                "deployment.json": mockfs.file({
                  content: `{"lastBuildTime":"${yesterday.toISOString()}","lastDeployTime":"${today.toISOString()}"}`,
                  ctime: today,
                  mtime: today,
                }),
              },
            }),
          },
        }),
      });
      const result = await FrontendDeployment.needDeploy("tabs");
      chai.assert.isFalse(result);
    });
  });
});
