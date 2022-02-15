import * as React from "react";
import { provideReactWrapper } from "@microsoft/fast-react-wrapper";
import { provideVSCodeDesignSystem, vsCodeButton, vsCodeTag } from "@vscode/webview-ui-toolkit";

const { wrap } = provideReactWrapper(React, provideVSCodeDesignSystem());

export const VSCodeTag = wrap(vsCodeTag());
export const VSCodeButton = wrap(vsCodeButton());
