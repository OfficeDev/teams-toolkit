// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { IStaticTab, IConfigurableTab, IBot, IComposeExtension } from "../manifest";
import { EnvInfoV2 } from "../v2/types";
import { ResourceStates } from "./resourceStates";

export interface EnvInfoV3 extends EnvInfoV2 {
  state: ResourceStates;
}

// TODO: consolidate local and remote manifest,
export type ManifestCapability =
  | {
      name: "staticTab";
      snippet?: { local: IStaticTab; remote: IStaticTab };
      existingApp?: boolean;
    }
  | {
      name: "configurableTab";
      snippet?: { local: IConfigurableTab; remote: IConfigurableTab };
      existingApp?: boolean;
    }
  | {
      name: "Bot";
      snippet?: { local: IBot; remote: IBot };
      existingApp?: boolean;
    }
  | {
      name: "MessageExtension";
      snippet?: { local: IComposeExtension; remote: IComposeExtension };
      existingApp?: boolean;
    };
