// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as extensionPackage from "./../../package.json";

declare type VersionComparisonResult = -1 | 0 | 1;

export interface Version {
  major: number;
  minor: number;
  patch: number;
  pre?: string;
}

export function compare(v1: string | Version, v2: string | Version): VersionComparisonResult {
  if (typeof v1 === "string") {
    v1 = fromString(v1);
  }
  if (typeof v2 === "string") {
    v2 = fromString(v2);
  }

  if (v1.major > v2.major) return 1;
  if (v1.major < v2.major) return -1;

  if (v1.minor > v2.minor) return 1;
  if (v1.minor < v2.minor) return -1;

  if (v1.patch > v2.patch) return 1;
  if (v1.patch < v2.patch) return -1;

  if (v1.pre === undefined && v2.pre !== undefined) return 1;
  if (v1.pre !== undefined && v2.pre === undefined) return -1;

  if (v1.pre !== undefined && v2.pre !== undefined) {
    return v1.pre.localeCompare(v2.pre) as VersionComparisonResult;
  }

  return 0;
}

export function from(
  major: string | number,
  minor: string | number,
  patch?: string | number,
  pre?: string
): Version {
  return {
    major: typeof major === "string" ? parseInt(major, 10) : major,
    minor: typeof minor === "string" ? parseInt(minor, 10) : minor,
    patch: patch == null ? 0 : typeof patch === "string" ? parseInt(patch, 10) : patch,
    pre: pre,
  };
}

export function fromString(version: string): Version {
  const [ver, pre] = version.split("-");
  const [major, minor, patch] = ver.split(".");
  return from(major, minor, patch, pre);
}

export function getExtensionId(): string {
  return extensionPackage.publisher + "." + extensionPackage.name;
}

export function isPrereleaseVersion(version: string | Version): boolean {
  if (typeof version === "string") {
    version = fromString(version);
  }
  // The odd nuber is the prerelease version, with patch version as timestamp like 2023071206 as 10 number.
  if (version.minor % 2 === 1 && version.patch.toString().length === 10) {
    return true;
  }
  return false;
}
