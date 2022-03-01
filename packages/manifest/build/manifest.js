// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamsAppManifest = void 0;
/**
 * manifest definition according to : https://developer.microsoft.com/en-us/json-schemas/teams/v1.8/MicrosoftTeams.schema.json
 */
class TeamsAppManifest {
    constructor() {
        this.$schema = "https://developer.microsoft.com/en-us/json-schemas/teams/v1.8/MicrosoftTeams.schema.json";
        /**
         * The version of the schema this manifest is using.
         */
        this.manifestVersion = "1.8";
        /**
         * The version of the app. Changes to your manifest should cause a version change. This version string must follow the semver standard (http://semver.org).
         */
        this.version = "1.0.0";
        /**
         * A unique identifier for this app. This id must be a GUID.
         */
        this.id = "{{AppId}}";
        /**
         * A unique identifier for this app in reverse domain notation. E.g: com.example.myapp
         */
        this.packageName = "com.microsoft.teams.extension";
        this.developer = {
            name: "Teams App, Inc.",
            mpnId: "",
            websiteUrl: "https://localhost:3000",
            privacyUrl: "https://localhost:3000/privacy",
            termsOfUseUrl: "https://localhost:3000/termsofuse",
        };
        this.name = {
            short: "{{AppName}}",
            full: "This field is not used",
        };
        this.description = {
            short: "Short description for {{AppName}}.",
            full: "Full description of {{AppName}}.",
        };
        this.icons = { outline: "outline.png", color: "color.png" };
        /**
         * A color to use in conjunction with the icon. The value must be a valid HTML color code starting with '#', for example `#4464ee`.
         */
        this.accentColor = "#FFFFFF";
        /**
         * Specifies the permissions the app requests from users.
         */
        this.permissions = ["identity", "messageTeamMembers"];
        /**
         * A list of valid domains from which the tabs expect to load any content. Domain listings can include wildcards, for example `*.example.com`. If your tab configuration or content UI needs to navigate to any other domain besides the one use for tab configuration, that domain must be specified here.
         */
        this.validDomains = ["localhost:3000"];
    }
}
exports.TeamsAppManifest = TeamsAppManifest;
//# sourceMappingURL=manifest.js.map