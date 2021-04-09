// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
"use strict";

import * as underscore from "underscore";

/**
 * Constructs a new in memory token cache.
 * @constructor
 */
export function MemoryCache(this: any) {
  this._entries = [];
}

/**
 * Removes a collection of entries from the cache in a single batch operation.
 * @param  {Array}   entries  An array of cache entries to remove.
 * @param  {Function} callback This function is called when the operation is complete.  Any error is provided as the
 *                             first parameter.
 */
MemoryCache.prototype.remove = function(entries: any, callback: () => void) {
  const updatedEntries = underscore.filter(this._entries, function(element) {
    if (underscore.findWhere(entries, element)) {
      return false;
    }
    return true;
  });

  this._entries = updatedEntries;
  callback();
};

/**
 * Adds a collection of entries to the cache in a single batch operation.
 * @param {Array}   entries  An array of entries to add to the cache.
 * @param  {Function} callback This function is called when the operation is complete.  Any error is provided as the
 *                             first parameter.
 */
MemoryCache.prototype.add = function(entries: any, callback: (arg0: null, arg1: boolean) => void) {
  // Remove any entries that are duplicates of the existing
  // cache elements.
  underscore.each(this._entries, function(element) {
    underscore.each(entries, function(addElement, index) {
      if (
        underscore.isEqual(element, addElement) ||
        element.accessToken == addElement.accessToken
      ) {
        entries[index] = null;
      }
    });
  });

  // Add the new entries to the end of the cache.
  entries = underscore.compact(entries);
  for (let i = 0; i < entries.length; i++) {
    this._entries.push(entries[i]);
  }

  callback(null, true);
};

/**
 * Finds all entries in the cache that match all of the passed in values.
 * @param  {object}   query    This object will be compared to each entry in the cache.  Any entries that
 *                             match all of the values in this object will be returned.  All the values
 *                             in the passed in object must match values in a potentialy returned object
 *                             exactly.  The returned object may have more values than the passed in query
 *                             object.
 * @param  {TokenCacheFindCallback} callback
 */
MemoryCache.prototype.find = function(
  query: Partial<any>,
  callback: (arg0: null, arg1: any[]) => void
) {
  const results = underscore.where(this._entries, query);
  callback(null, results);
};

MemoryCache.prototype.size = function() {
  return this._entries.length;
};
