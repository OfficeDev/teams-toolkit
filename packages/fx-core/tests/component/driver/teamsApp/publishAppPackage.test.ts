// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import chai from "chai";
import { PublishAppPackageDriver } from "../../../../src/component/driver/teamsApp/publishAppPackage";
import { PublishAppPackageArgs } from "../../../../src/component/driver/teamsApp/interfaces/PublishAppPackageArgs";
import { AppStudioError } from "../../../../src/component/resource/appManifest/errors";
import { MockedM365Provider } from "../../../plugins/solution/util";

describe("teamsApp/publishAppPackage", async () => {
  const teamsAppDriver = new PublishAppPackageDriver();
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
  };

  afterEach(() => {
    sinon.restore();
  });

  it("should throw error if file not exists", async () => {
    const args: PublishAppPackageArgs = {
      appPackagePath: "fakepath",
    };

    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.equal(AppStudioError.FileNotFoundError.name, result.error.name);
    }
  });
});
