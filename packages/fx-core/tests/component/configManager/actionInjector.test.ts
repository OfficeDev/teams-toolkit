import { assert } from "chai";
import sinon from "sinon";
import fs from "fs-extra";
import { Utils } from "@microsoft/m365-spec-parser";
import { ActionInjector } from "../../../src/component/configManager/actionInjector";
import {
  InjectAPIKeyActionFailedError,
  InjectOAuthActionFailedError,
} from "../../../src/error/common";

describe("ActionInjector", () => {
  function countOccurrences(str: string, substring: string): number {
    let count = 0;
    let pos = str.indexOf(substring);

    while (pos !== -1) {
      count++;
      pos = str.indexOf(substring, pos + 1);
    }

    return count;
  }
  describe("injectCreateOAuthAction", () => {
    const sandbox = sinon.createSandbox();
    const sampleAuthAction = {
      uses: "oauth/register",
      with: {
        name: "testAuth",
        appId: "${{TEAMS_APP_ID}}",
        apiSpecPath: "path/to/spec",
        flow: "authorizationCode",
      },
      writeToEnvironmentFile: {
        configurationId: "TEST_AUTH_CONFIGURATION_ID",
      },
    };
    let writeStub: sinon.SinonStub;

    beforeEach(() => {
      writeStub = sandbox.stub(fs, "writeFile").resolves();
      sandbox.stub(ActionInjector, "generateAuthAction").returns(sampleAuthAction);
    });
    afterEach(() => {
      sandbox.restore();
    });

    it("should inject OAuth action successfully if no existing env names for configuration id exists", async () => {
      const ymlPath = "path/to/yml";
      const authName = "testAuth";
      const specRelativePath = "path/to/spec";
      const forceToAddNew = false;

      const ymlContent = `
        provision:
          - uses: teamsApp/create
            with:
              # Teams app name
              name: test
            # Write the information of created resources into environment file for
            # the specified environment variable(s).
            writeToEnvironmentFile:
              teamsAppId: TEAMS_APP_ID
          - uses: apiKey/register
      `;

      sandbox.stub(fs, "readFile").resolves(ymlContent as any);
      sandbox.stub(Utils, "getSafeRegistrationIdEnvName").returns("TEST_AUTH_CONFIGURATION_ID");
      sandbox.stub(ActionInjector, "getTeamsAppIdEnvName").returns("TEAMS_APP_ID");

      const result = await ActionInjector.injectCreateOAuthAction(
        ymlPath,
        authName,
        specRelativePath,
        forceToAddNew
      );

      assert.deepEqual(result, {
        defaultRegistrationIdEnvName: "TEST_AUTH_CONFIGURATION_ID",
        registrationIdEnvName: "TEST_AUTH_CONFIGURATION_ID",
      });
      assert.isTrue(writeStub.args[0][1].includes("oauth/register"));
      assert.isFalse(writeStub.args[0][1].includes("apiKey/register"));
    });

    it("should throw InjectOAuthActionFailedError if provision node is missing", async () => {
      const ymlPath = "path/to/yml";
      const authName = "testAuth";
      const specRelativePath = "path/to/spec";
      const forceToAddNew = false;

      const ymlContent = `
        otherNode:
          - uses: teamsApp/create
      `;

      sandbox.stub(fs, "readFile").resolves(ymlContent as any);

      try {
        await ActionInjector.injectCreateOAuthAction(
          ymlPath,
          authName,
          specRelativePath,
          forceToAddNew
        );
        assert.fail("Expected InjectOAuthActionFailedError to be thrown");
      } catch (error) {
        assert.instanceOf(error, InjectOAuthActionFailedError);
      }
    });

    it("should throw InjectOAuthActionFailedError if teamsApp/create action is missing", async () => {
      const ymlPath = "path/to/yml";
      const authName = "testAuth";
      const specRelativePath = "path/to/spec";
      const forceToAddNew = false;

      const ymlContent = `
        provision:
          - uses: otherAction
      `;

      sandbox.stub(fs, "readFile").resolves(ymlContent as any);
      sandbox.stub(ActionInjector, "hasActionWithName").returns(false);
      sandbox.stub(ActionInjector, "getTeamsAppIdEnvName").returns(undefined);

      try {
        await ActionInjector.injectCreateOAuthAction(
          ymlPath,
          authName,
          specRelativePath,
          forceToAddNew
        );
        assert.fail("Expected InjectOAuthActionFailedError to be thrown");
      } catch (error) {
        assert.instanceOf(error, InjectOAuthActionFailedError);
      }
    });

    it("should handle existing OAuth action if env names for configuration id exists", async () => {
      const ymlPath = "path/to/yml";
      const authName = "testAuth";
      const specRelativePath = "path/to/spec";
      const forceToAddNew = true;

      const ymlContent = `
        provision:
          - uses: teamsApp/create
            with:
              # Teams app name
              name: test
            # Write the information of created resources into environment file for
            # the specified environment variable(s).
            writeToEnvironmentFile:
              teamsAppId: TEAMS_APP_ID
          - uses: oauth/register
            with:
              name: oAuth2AuthCode
              appId: appId
              apiSpecPath: ./appPackage/apiSpecificationFile/openapi_3.yaml
              flow: authorizationCode
            writeToEnvironmentFile:
              configurationId: OAUTH2AUTHCODE_CONFIGURATION_ID
          - uses: apiKey/register
      `;

      sandbox.stub(fs, "readFile").resolves(ymlContent as any);
      sandbox
        .stub(Utils, "getSafeRegistrationIdEnvName")
        .returns("OAUTH2AUTHCODE_CONFIGURATION_ID");
      sandbox.stub(ActionInjector, "getTeamsAppIdEnvName").returns("TEAMS_APP_ID");

      const result = await ActionInjector.injectCreateOAuthAction(
        ymlPath,
        authName,
        specRelativePath,
        forceToAddNew
      );

      assert.deepEqual(result, {
        defaultRegistrationIdEnvName: "OAUTH2AUTHCODE_CONFIGURATION_ID",
        registrationIdEnvName: "OAUTH2AUTHCODE_CONFIGURATION_ID1",
      });
      assert.isTrue(writeStub.args[0][1].includes("apiKey/register"));

      assert.equal(countOccurrences(writeStub.args[0][1], "oauth/register"), 2);
    });
  });

  describe("injectCreateAPIKeyAction", () => {
    const sandbox = sinon.createSandbox();
    const sampleAPIKeyAction = {
      uses: "apiKey/register",
      with: {
        name: "testAuth",
        appId: "${{TEAMS_APP_ID}}",
        apiSpecPath: "path/to/spec",
      },
      writeToEnvironmentFile: {
        registrationId: "TEST_AUTH_CONFIGURATION_ID",
      },
    };
    let writeStub: sinon.SinonStub;

    beforeEach(() => {
      writeStub = sandbox.stub(fs, "writeFile").resolves();
      sandbox.stub(ActionInjector, "generateAuthAction").returns(sampleAPIKeyAction);
    });

    afterEach(() => {
      sandbox.restore();
    });

    it("should inject APIKey action successfully if no existing env names for configuration id exists", async () => {
      const ymlPath = "path/to/yml";
      const authName = "testAuth";
      const specRelativePath = "path/to/spec";
      const forceToAddNew = false;

      const ymlContent = `
      provision:
        - uses: teamsApp/create
          with:
            # Teams app name
            name: test
          # Write the information of created resources into environment file for
          # the specified environment variable(s).
          writeToEnvironmentFile:
            teamsAppId: TEAMS_APP_ID
        - uses: oauth/register
    `;

      sandbox.stub(fs, "readFile").resolves(ymlContent as any);
      sandbox.stub(ActionInjector, "hasActionWithName").returns(false);
      sandbox.stub(Utils, "getSafeRegistrationIdEnvName").returns("TEST_AUTH_CONFIGURATION_ID");
      sandbox.stub(ActionInjector, "getTeamsAppIdEnvName").returns("TEAMS_APP_ID");

      const result = await ActionInjector.injectCreateAPIKeyAction(
        ymlPath,
        authName,
        specRelativePath,
        forceToAddNew
      );

      assert.deepEqual(result, {
        defaultRegistrationIdEnvName: "TEST_AUTH_CONFIGURATION_ID",
        registrationIdEnvName: "TEST_AUTH_CONFIGURATION_ID",
      });
      assert.isFalse(writeStub.args[0][1].includes("oauth/register"));
      assert.isTrue(writeStub.args[0][1].includes("apiKey/register"));
    });

    it("should throw InjectAPIKeyActionFailedError if provision node is missing", async () => {
      const ymlPath = "path/to/yml";
      const authName = "testAuth";
      const specRelativePath = "path/to/spec";
      const forceToAddNew = false;

      const ymlContent = `
        otherNode:
          - uses: teamsApp/create
      `;

      sandbox.stub(fs, "readFile").resolves(ymlContent as any);

      try {
        await ActionInjector.injectCreateAPIKeyAction(
          ymlPath,
          authName,
          specRelativePath,
          forceToAddNew
        );
        assert.fail("Expected InjectAPIKeyActionFailedError to be thrown");
      } catch (error) {
        assert.instanceOf(error, InjectAPIKeyActionFailedError);
      }
    });

    it("should throw InjectAPIKeyActionFailedError if teamsApp/create action is missing", async () => {
      const ymlPath = "path/to/yml";
      const authName = "testAuth";
      const specRelativePath = "path/to/spec";
      const forceToAddNew = false;

      const ymlContent = `
        provision:
          - uses: otherAction
      `;

      sandbox.stub(fs, "readFile").resolves(ymlContent as any);
      sandbox.stub(ActionInjector, "hasActionWithName").returns(false);
      sandbox.stub(ActionInjector, "getTeamsAppIdEnvName").returns(undefined);

      try {
        await ActionInjector.injectCreateAPIKeyAction(
          ymlPath,
          authName,
          specRelativePath,
          forceToAddNew
        );
        assert.fail("Expected InjectAPIKeyActionFailedError to be thrown");
      } catch (error) {
        assert.instanceOf(error, InjectAPIKeyActionFailedError);
      }
    });

    it.only("should handle existing OAuth action if env names for configuration id exists", async () => {
      const ymlPath = "path/to/yml";
      const authName = "testAuth";
      const specRelativePath = "path/to/spec";
      const forceToAddNew = true;

      const ymlContent = `
          provision:
            - uses: teamsApp/create
              with:
                # Teams app name
                name: test
              # Write the information of created resources into environment file for
              # the specified environment variable(s).
              writeToEnvironmentFile:
                teamsAppId: TEAMS_APP_ID
            - uses: apiKey/register
              with:
                name: bearerAuth
                appId: appId
                apiSpecPath: ./appPackage/apiSpecificationFile/openapi_1.yaml
              writeToEnvironmentFile:
                registrationId: BEARERAUTH_REGISTRATION_ID
        `;

      sandbox.stub(fs, "readFile").resolves(ymlContent as any);
      sandbox.stub(Utils, "getSafeRegistrationIdEnvName").returns("BEARERAUTH_REGISTRATION_ID");
      sandbox.stub(ActionInjector, "getTeamsAppIdEnvName").returns("TEAMS_APP_ID");

      const result = await ActionInjector.injectCreateAPIKeyAction(
        ymlPath,
        authName,
        specRelativePath,
        forceToAddNew
      );

      assert.deepEqual(result, {
        defaultRegistrationIdEnvName: "BEARERAUTH_REGISTRATION_ID",
        registrationIdEnvName: "BEARERAUTH_REGISTRATION_ID1",
      });

      assert.equal(countOccurrences(writeStub.args[0][1], "apiKey/register"), 2);
    });
  });
});
