// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import * as sinon from "sinon";
import chai from "chai";
import { ValidateTeamsAppDriver } from "../../../../src/component/driver/teamsApp/validate";
import { ValidateTeamsAppArgs } from "../../../../src/component/driver/teamsApp/interfaces/ValidateTeamsAppArgs";
import { AppStudioError } from "../../../../src/component/resource/appManifest/errors";
import {
  MockedLogProvider,
  MockedM365Provider,
  MockedUserInteraction,
} from "../../../plugins/solution/util";
import { Platform } from "@microsoft/teamsfx-api";

describe("teamsApp/validate", async () => {
  const teamsAppDriver = new ValidateTeamsAppDriver();
  const mockedDriverContext: any = {
    m365TokenProvider: new MockedM365Provider(),
    logProvider: new MockedLogProvider(),
    ui: new MockedUserInteraction(),
    projectPath: "./",
  };

  afterEach(() => {
    sinon.restore();
  });

  it("should throw error if file not exists", async () => {
    const args: ValidateTeamsAppArgs = {
      manifestTemplatePath: "fakepath",
    };

    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isErr());
    if (result.isErr()) {
      chai.assert.equal(AppStudioError.FileNotFoundError.name, result.error.name);
    }
  });

  it("happy path", async () => {
    const args: ValidateTeamsAppArgs = {
      manifestTemplatePath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
    };

    process.env.CONFIG_TEAMS_APP_NAME = "fakeName";

    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isOk());
  });

  it("happy path - VS", async () => {
    const args: ValidateTeamsAppArgs = {
      manifestTemplatePath:
        "./tests/plugins/resource/appstudio/resources-multi-env/templates/appPackage/v3.manifest.template.json",
    };

    mockedDriverContext.platform = Platform.VS;

    process.env.CONFIG_TEAMS_APP_NAME = "fakeName";

    const result = await teamsAppDriver.run(args, mockedDriverContext);
    chai.assert(result.isOk());
  });
});
