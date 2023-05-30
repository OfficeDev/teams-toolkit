// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { OptionItem } from "@microsoft/teamsfx-api";
import { getLocalizedString } from "../../../../common/localizeUtils";
import { Constants } from "./constants";
import { Utils } from "./utils";
import semver from "semver";

export enum SPFxVersionOptionIds {
  installLocally = "true",
  globalPackage = "false",
}

export class PackageSelectOptionsHelper {
  private static options: OptionItem[] = [];
  private static globalPackageVersions: (string | undefined)[] = [undefined, undefined];
  private static latestSpGeneratorVersion: string | undefined = undefined;

  public static async loadOptions(): Promise<void> {
    const versions = await Promise.all([
      Utils.findGloballyInstalledVersion(undefined, Constants.GeneratorPackageName, 0, false),
      Utils.findLatestVersion(undefined, Constants.GeneratorPackageName, 5),
      Utils.findGloballyInstalledVersion(undefined, Constants.YeomanPackageName, 0, false),
    ]);

    PackageSelectOptionsHelper.globalPackageVersions[0] = versions[0];
    PackageSelectOptionsHelper.globalPackageVersions[1] = versions[2];
    PackageSelectOptionsHelper.latestSpGeneratorVersion = versions[1];

    PackageSelectOptionsHelper.options = [
      {
        id: SPFxVersionOptionIds.installLocally,

        label:
          versions[1] !== undefined
            ? getLocalizedString(
                "plugins.spfx.questions.packageSelect.installLocally.withVersion.label",
                "v" + versions[1]
              )
            : getLocalizedString(
                "plugins.spfx.questions.packageSelect.installLocally.noVersion.label"
              ),
      },
      {
        id: SPFxVersionOptionIds.globalPackage,
        label:
          versions[0] !== undefined
            ? getLocalizedString(
                "plugins.spfx.questions.packageSelect.useGlobalPackage.withVersion.label",
                "v" + versions[0]
              )
            : getLocalizedString(
                "plugins.spfx.questions.packageSelect.useGlobalPackage.noVersion.label"
              ),
        description: getLocalizedString(
          "plugins.spfx.questions.packageSelect.useGlobalPackage.detail",
          Constants.RecommendedLowestSpfxVersion
        ),
      },
    ];
  }

  public static getOptions(): OptionItem[] {
    return PackageSelectOptionsHelper.options;
  }

  public static clear(): void {
    PackageSelectOptionsHelper.options = [];
    PackageSelectOptionsHelper.globalPackageVersions = [undefined, undefined];
    PackageSelectOptionsHelper.latestSpGeneratorVersion = undefined;
  }

  public static checkGlobalPackages(): boolean {
    return (
      !!PackageSelectOptionsHelper.globalPackageVersions[0] &&
      !!PackageSelectOptionsHelper.globalPackageVersions[1]
    );
  }

  public static getLatestSpGeneratorVersion(): string | undefined {
    return PackageSelectOptionsHelper.latestSpGeneratorVersion;
  }

  public static isLowerThanRecommendedVersion(): boolean | undefined {
    const installedVersion = PackageSelectOptionsHelper.globalPackageVersions[0];
    if (!installedVersion) {
      return undefined;
    }

    const recommendedLowestVersion = Constants.RecommendedLowestSpfxVersion.substring(1); // remove "v"
    return semver.lte(installedVersion, recommendedLowestVersion);
  }
}
