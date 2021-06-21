// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import {IDeveloper, TeamsAppManifest} from "../src/manifest";

import { assert } from "chai"; 


describe("Manifest", () => {
  
  it("IDeveloper", () => {
     const developer:IDeveloper = {
      name:"MS",
      websiteUrl: "http://test.com",
      privacyUrl: "http://test.com",
      termsOfUseUrl: "http://test.com"
     };
     assert.deepEqual(developer, {
      name:"MS",
      websiteUrl: "http://test.com",
      privacyUrl: "http://test.com",
      termsOfUseUrl: "http://test.com"
     })
  });

  it("TeamsAppManifest", () => {
    const manifest:TeamsAppManifest = new TeamsAppManifest();
    assert.isTrue(manifest.manifestVersion === "1.8");
 });
  
});