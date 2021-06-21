// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import "mocha";
import {IDeveloper, TeamsAppManifest} from "../src/manifest";

import { assert } from "chai"; 


describe("Manifest", () => {
  it("TeamsAppManifest", () => {
    const manifest:TeamsAppManifest = new TeamsAppManifest();
    assert.isTrue(manifest.manifestVersion === "1.8");
 });
  
});