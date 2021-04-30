// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { default as axios } from "axios";
import { DownloadConstants } from "../constants";
import { DownloadError } from "../errors";

import * as utils from "./common";

export async function downloadByUrl(url: string, timeoutMs: number = DownloadConstants.DEFAULT_TIMEOUT_MS): Promise<Buffer> {
    let res = undefined;
    try {
        res = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: timeoutMs
        });
    } catch (e) {
        throw new DownloadError(url, e);
    }

    if (!res || !utils.isHttpCodeOkOrCreated(res.status)) {
        throw new DownloadError(url);
    }

    return res.data;
}
