// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

"use strict";

export abstract class login {
    statusChangeMap = new Map();

    async setStatusChangeMap(name: string, statusChange: (status: string, token?: string, accountInfo?: Record<string, unknown>) => Promise<void>): Promise<boolean> {
        this.statusChangeMap.set(name, statusChange);
        this.notifyStatus();
        return true;
    }

    abstract notifyStatus(): Promise<boolean>;
}