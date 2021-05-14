// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { default as axios } from "axios";
import semver from "semver";

import { ProgrammingLanguage } from "../enums/programmingLanguage";
import { DownloadConstants, TemplateProjectsConstants } from "../constants";
import { DownloadError, TemplateProjectNotFoundError } from "../errors";
import { Logger } from "../logger";
import * as utils from "../utils/common";
import { selectTag, tagListURL, templateURL } from "../../../../common/templates";

export class TemplateManifest {
  public tags: string[] = [];

  public static async newInstance(): Promise<TemplateManifest> {
    const ret = new TemplateManifest();

    let res = undefined;

    try {
      res = await axios.get(tagListURL, {
        timeout: DownloadConstants.TEMPLATES_TIMEOUT_MS,
      });
    } catch (e) {
      throw new DownloadError(tagListURL, e);
    }

    if (!res || res.status !== 200) {
      throw new DownloadError(tagListURL);
    }

    ret.tags = res.data.replace(/\r/g, "").split("\n");

    return ret;
  }

  public getNewestTemplateUrl(
    lang: ProgrammingLanguage,
    group_name: string,
    scenario = TemplateProjectsConstants.DEFAULT_SCENARIO_NAME
  ): string {
    Logger.debug(`getNewestTemplateUrl for ${lang},${group_name},${scenario}.`);

    const langKey = utils.convertToLangKey(lang);

    const selectedTag = selectTag(this.tags);
    if (!selectedTag) {
      throw new TemplateProjectNotFoundError();
    }

    return templateURL(selectedTag, `${group_name}.${langKey}.${scenario}`);
  }
}
