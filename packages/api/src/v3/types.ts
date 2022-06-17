// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
  IStaticTab,
  IConfigurableTab,
  IBot,
  IComposeExtension,
  IWebApplicationInfo,
} from "@microsoft/teams-manifest";
import { ProjectSettings } from "../types";
import { TokenProvider } from "../utils/login";
import { Context, EnvInfoV2 } from "../v2/types";
import { AppManifestProvider } from "./plugins";
import { ResourceStates } from "./resourceStates";

export interface EnvInfoV3 extends EnvInfoV2 {
  state: ResourceStates;
}

// TODO: consolidate local and remote manifest,
export type ManifestCapability =
  | {
      name: "staticTab";
      snippet?: IStaticTab;
      existingApp?: boolean;
    }
  | {
      name: "configurableTab";
      snippet?: IConfigurableTab;
      existingApp?: boolean;
    }
  | {
      name: "Bot";
      snippet?: IBot;
      existingApp?: boolean;
    }
  | {
      name: "MessageExtension";
      snippet?: IComposeExtension;
      existingApp?: boolean;
    }
  | {
      name: "WebApplicationInfo";
      snippet?: IWebApplicationInfo;
      existingApp?: boolean;
    };
