// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { UserError } from "@microsoft/teamsfx-api";
import { CreateTeamsAppDriver } from "../../../../src/component/driver/teamsApp/create";
import { CreateTeamsAppArgs } from "../../../../src/component/driver/teamsApp/interfaces/CreateTeamsAppArgs";
import { AppStudioError } from "../../../../src/component/resource/appManifest/errors";
import { MockedM365Provider } from "../../../plugins/solution/util";

chai.use(chaiAsPromised);

describe("teamsApp/create", async () => {
  const teamsAppDriver = new CreateTeamsAppDriver();
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
  };

  afterEach(() => {
    sinon.restore();
  });

  it("should throw error if file not exists", async () => {
    const args: CreateTeamsAppArgs = {
      appPackagePath: "fakePath",
    };
    await chai
      .expect(teamsAppDriver.run(args, mockedDriverContext))
      .to.be.eventually.rejectedWith(
        AppStudioError.FileNotFoundError.message(args.appPackagePath)[0]
      )
      .and.is.instanceOf(UserError);
  });
});
