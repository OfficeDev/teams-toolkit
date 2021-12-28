#!/usr/bin/env python
# -*- coding utf-8 -*-

import sys
import os
import re
import json
import fnmatch

def read_pattern(r):
    if r.startswith("regex:"):
        return re.compile(r[6:])
    converted = re.escape(r)
    converted = re.sub(r"((\\*\r)?\\*\n|(\\+r)?\\+n)+", r"( |\\t|(\\r|\\n|\\\\+[rn])[-+]?)*", converted)
    return re.compile(converted)

def read_regexes(file):
    regexes = {}
    try:
        with open(file, "r") as regexesFile:
            rules = json.loads(regexesFile.read())
            for rule in rules:
                regexes[rule] = read_pattern(rules[rule])
    except (IOError, ValueError) as e:
        raise("Error Reading rules file")
    return regexes

def read_files(filePath):
    try:
        with open(filePath, "r") as fileContent:
            contents = fileContent.read()
    except (IOError, ValueError) as e:
        raise("Error Reading rules file")
    return contents.splitlines()

def read_content(contentFile, rootDir):
    contentFileDir = os.path.join(rootDir, contentFile)
    try:
        with open(contentFileDir, "r") as content:
            return content.read()
    except (IOError, ValueError) as e:
        raise("Error Reading rules file")

def find_string(patterns, content, diffFile):
    for pattern in patterns:
        res = patterns[pattern].findall(content)
        if res:
            print("diffFile:", diffFile)
            for res_item in res:
                print("Sensitive Content: ", res_item)
            raise Exception("Found sensitive words")

def main():
    currentDir = os.path.dirname(os.path.realpath(__file__))
    regexesFilePath = os.path.join(currentDir, "regexes.json")
    patterns = read_regexes(regexesFilePath)
    rootDir = os.path.join(currentDir, "..", "..")
    includeFilePath = os.path.join(rootDir, "diffFiles.txt")
    excludeFilePath = os.path.join(rootDir, ".github", "detect", "excludes.txt")
    excludeFiles = read_files(excludeFilePath)
    diffFiles = read_files(includeFilePath)
    targetDiffFiles = diffFiles.copy()
    for item in diffFiles:
        for exFile in excludeFiles:
            if fnmatch.fnmatch(item, exFile):
                targetDiffFiles.remove(item)
                break
    for diffFile in targetDiffFiles:
        content = read_content(diffFile, rootDir)
        find_string(patterns, content, diffFile)
    
main()
