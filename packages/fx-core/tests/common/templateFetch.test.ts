// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import "mocha";
import * as chai from "chai";
import * as sinon from "sinon";
import AdmZip from "adm-zip";
import axios from "axios";
import semver from "semver";

import * as templates from "../../src/common/template-utils/templates";
import {
  fetchTemplateUrl,
  fetchZipFromUrl,
  sendRequestWithRetry,
} from "../../src/common/template-utils/templatesUtils";

const templatesVersion = "^0.1.0";
const candidateVersion1 = semver.inc(templatesVersion.replace(/\^/g, ""), "patch") as string;
const targetVersion = semver.inc(candidateVersion1, "patch") as string;
const candidateVersion2 = semver.inc(targetVersion, "minor") as string;
const candidateVersion3 = semver.inc(targetVersion, "prerelease") as string;

const candidateTag1 = templates.tagPrefix + candidateVersion1;
const candidateTag2 = templates.tagPrefix + candidateVersion2;
const candidateTag3 = templates.tagPrefix + candidateVersion3;
const targetTag = templates.tagPrefix + targetVersion;

const manifest = `
${candidateTag1}
${candidateTag2}
${candidateTag3}
${targetTag}
`;

const tryLimits = 1;
const timeout = 1000;

describe("template-helper", () => {
  describe("Select Tag Test", () => {
    it("fallback for alpha", () => {
      sinon.stub(templates, "templatesVersion").value("0.0.0-alpha");
      sinon.stub(templates, "tagPrefix").value("templates-");
      const tag = templates.selectTag([templates.alphaVersion]);
      chai.assert.notExists(tag);
    });
  });

  describe("Template Fetch Test", () => {
    beforeEach(() => {
      sinon.stub(templates, "preRelease").value("");
      sinon.stub(templates, "templatesVersion").value(templatesVersion);
    });

    afterEach(() => {
      sinon.restore();
    });

    it("Test getTemplateURL", async () => {
      // Arrange
      sinon.stub(axios, "get").resolves({ status: 200, data: manifest });

      // Act
      const url = await fetchTemplateUrl("a", "js", "c", tryLimits, timeout);

      // Assert
      chai.assert.equal(url, templates.templateURL(targetTag, "a.js.c"));
    });

    it("Test fetchZipFromURL", async () => {
      // Arrange
      sinon.stub(axios, "get").resolves({ status: 200, data: new AdmZip().toBuffer() });

      // Act
      const zip = await fetchZipFromUrl("ut", tryLimits, timeout);

      // Assert
      chai.assert.equal(zip.getEntries().length, 0);
    });

    it("Test sendRequestWithRetry", async () => {
      // Arrange
      let cnt = 1;
      const fn = async (): Promise<any> => {
        if (cnt-- > 0) {
          throw { response: { status: 500 } };
        }
        return { status: 200 };
      };

      // Act
      const res = await sendRequestWithRetry(fn, 2);

      // Assert
      chai.assert.deepEqual(res, { status: 200 } as any);
    });
  });
});
