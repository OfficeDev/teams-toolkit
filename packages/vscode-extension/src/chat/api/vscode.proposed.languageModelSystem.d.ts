// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.


declare module "vscode" {

	// https://github.com/microsoft/vscode/issues/206265

	// TODO@API don't have this dedicated type but as property, e.g anthropic doesn't have a system-role, see
	// https://github.com/anthropics/anthropic-sdk-typescript/blob/c2da9604646ff103fbdbca016a9a9d49b03b387b/src/resources/messages.ts#L384
	// So, we could have `LanguageModelChatRequestOptions#system` which would be more limiting but also more natural?

	export enum LanguageModelChatMessageRole {
		System = 3
	}
}
