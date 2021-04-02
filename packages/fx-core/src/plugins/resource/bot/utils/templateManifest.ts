// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { default as axios } from "axios";
import Ajv, { JSONSchemaType } from "ajv";
import semver from "semver";

import { ProgrammingLanguage } from "../enums/programmingLanguage";
import { TemplateProjectsConstants } from "../constants";
import { DownloadException, TemplateProjectNotFoundException, TplManifestFormatException } from "../exceptions";

type Manifest = {
    [groupName: string]: {
        [programmingLanguage: string]: {
            [scenario: string]: {
                version: string;
                url: string;
            }[];
        };
    };
};

export class TemplateManifest {
    public manifest: Manifest = {};

    public static async fromUrl(url: string): Promise<TemplateManifest> {
        const ret = new TemplateManifest();

        let res = undefined;

        try {
            res = await axios.get(url);
        } catch (e) {
            throw new DownloadException(url, e);
        }

        if (!res || res.status !== 200) {
            throw new DownloadException(url);
        }

        // Validate res.data by json schema.
        const ajv = new Ajv();

        const schema: JSONSchemaType<Manifest> = {
            type: "object",
            patternProperties: {
                "^.*$": {
                    type: "object",
                    patternProperties: {
                        "^.*$": {
                            type: "object",
                            patternProperties: {
                                "^.*$": {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            version: { type: "string" },
                                            url: { type: "string" },
                                        },
                                        required: ["version", "url"],
                                    },
                                },
                            },
                            required: [],
                        },
                    },
                    required: [],
                },
            },
            required: [],
        };

        const validate = ajv.compile(schema);

        if (!validate(res.data)) {
            throw new TplManifestFormatException();
        }

        ret.manifest = res.data;

        return ret;
    }

    public getNewestTemplateUrl(
        lang: ProgrammingLanguage,
        group_name: string,
        scenario = TemplateProjectsConstants.DEFAULT_SCENARIO_NAME,
    ): string {
        if (!this.manifest[group_name]?.[lang]?.[scenario]) {
            throw new TemplateProjectNotFoundException();
        }

        const scenarioTemplates = this.manifest[group_name][lang][scenario].filter((x) =>
            semver.satisfies(x.version, TemplateProjectsConstants.VERSION_RANGE),
        );

        if (scenarioTemplates.length <= 0) {
            throw new TemplateProjectNotFoundException();
        }

        const sortedTemplates = scenarioTemplates.sort((a, b) => -semver.compare(a.version, b.version));
        return sortedTemplates[0].url;
    }
}
