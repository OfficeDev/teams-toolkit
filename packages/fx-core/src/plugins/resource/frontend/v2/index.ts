// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { Container, Service } from "typedi";
import { FrontendPlugin } from "../..";
import {
  ResourcePlugins,
  ResourcePluginsV2,
} from "../../../solution/fx-solution/ResourcePluginContainer";
import { ResourcePluginAdapter } from "../../utils4v2";

@Service(ResourcePluginsV2.FrontendPlugin)
export class FrontendPluginV2 extends ResourcePluginAdapter {
  constructor() {
    super(Container.get<FrontendPlugin>(ResourcePlugins.FrontendPlugin));
  }
}
