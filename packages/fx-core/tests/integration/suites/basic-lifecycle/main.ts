// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { it } from "mocha";
import * as chai from "chai";
import { ConfigMap, ConfigFolderName } from "fx-api";
import { MockAzureResourceManager } from "../../tools/arm";
import { objectToConfigMap } from "../../tools/suite";
import * as fs from "fs-extra";
import { Core } from "fx-api";
import del = require("del");
import { SqlValidator } from "../../tools/sqlValidate";
import { AadValidator, deleteAadApp } from "../../tools/aadValidate";
import { RcValidator } from "../../tools/rcValidate";
import { TeamsCore } from "../../../../src/core";
import { ContextFactory } from "../../tools/context";

require("dotenv").config();

chai.should();

const testFileSuffix = "json";

for (let path of fs.readdirSync(`${__dirname}`)) {
  if (
    path.indexOf(testFileSuffix, path.length - testFileSuffix.length) === -1
  ) {
    continue;
  }
  const suitePath = `${__dirname}/${path}`;
  const f = fs.readJsonSync(suitePath);
  describe(`Suite:${f.description}`, function () {
    this.timeout(60 * 60 * 1000); // 1 hour;
    let core: Core;
    let answers: ConfigMap;
    let projectPath: string;

    before(async function () {
      core = TeamsCore.getInstance();

      // make each test unique
      const ts = Math.round(Date.now() / 1000);
      f["answer"]["app-name"] = `${f["answer"]["app-name"]}${ts}`;

      answers = objectToConfigMap(f.answer);

      projectPath = `${f["answer"]["folder"]}/${f["answer"]["app-name"]}`;
    });

    after(async function () {
      // delete aad app
      const context = await fs.readJSONSync(
        `${projectPath}/.${ConfigFolderName}/env.default.json`
      );
      await deleteAadApp(context);

      // remove project
      await del(projectPath, { force: true });

      // remove resouce
      MockAzureResourceManager.getInstance().restore(
        `${f["answer"]["app-name"]}-rg`
      );
    });

    it("create a new project.", async function () {
      answers.set("stage", "create");
      const result = await core.create(ContextFactory.get(), answers);
      result.isOk().should.be.true;
    });

    it("provision to Teams Cloud - Dev Test with TTL = 7 Days.", async function () {
      answers.set("stage", "provision");

      const result = await core.provision(
        ContextFactory.get(projectPath),
        answers
      );
      result.isOk().should.be.true;

      // Get context
      const context = await fs.readJSONSync(
        `${projectPath}/.${ConfigFolderName}/env.default.json`
      );

      if (path === "sql.json") {
        // Validate SQL and identity
        await SqlValidator.init(context);
        await SqlValidator.validateSql();
      }

      // Validate Aad App
      let aad = AadValidator.init(context);
      await AadValidator.validate(aad);

      // Validate Runtime Connector
      let rc = RcValidator.init(context);
      await RcValidator.validate(rc, aad);
    });

    it("deploy to Teams Cloud - Dev Test with TTL = 7 Days.", async function () {
      answers.set("stage", "deloy");
      const result = await core.deploy(
        ContextFactory.get(projectPath),
        answers
      );
      result.isOk().should.be.true;
    });
  });
}
