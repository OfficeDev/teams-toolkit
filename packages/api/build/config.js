// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigMap = void 0;
class ConfigMap extends Map {
    getString(k, defaultValue) {
        const v = super.get(k);
        if (!v)
            return defaultValue;
        return String(v);
    }
    getBoolean(k, defaultValue) {
        const v = super.get(k);
        if (!v)
            return defaultValue;
        return Boolean(v);
    }
    getNumber(k, defaultValue) {
        const v = super.get(k);
        if (!v)
            return defaultValue;
        return Number(v);
    }
    getStringArray(k, defaultValue) {
        const v = super.get(k);
        if (!v)
            return defaultValue;
        return v;
    }
    getNumberArray(k, defaultValue) {
        const v = super.get(k);
        if (!v)
            return defaultValue;
        return v;
    }
    getBooleanArray(k, defaultValue) {
        const v = super.get(k);
        if (!v)
            return defaultValue;
        return v;
    }
    getOptionItem(k, defaultValue) {
        const v = super.get(k);
        if (!v)
            return defaultValue;
        return v;
    }
    getOptionItemArray(k, defaultValue) {
        const v = super.get(k);
        if (!v)
            return defaultValue;
        return v;
    }
    toJSON() {
        const out = {};
        for (const entry of super.entries()) {
            out[entry[0]] = entry[1];
        }
        return out;
    }
    static fromJSON(obj) {
        if (!obj)
            return undefined;
        let map = new ConfigMap();
        for (const entry of Object.entries(obj)) {
            map.set(entry[0], entry[1]);
        }
        return map;
    }
}
exports.ConfigMap = ConfigMap;
//# sourceMappingURL=config.js.map