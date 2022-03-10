#!/usr/bin/env python
# -*- coding utf-8 -*-

import sys
import os
import re
import json
import fnmatch

exclude_key_words = "http"

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
        raise("Error Reading rules file", filePath)
    return contents.splitlines()

def read_content(contentFile, rootDir):
    contentFileDir = os.path.join(rootDir, contentFile)
    try:
        with open(contentFileDir, "r") as content:
            return content.read()
    except (IOError, ValueError) as e:
        print("============ read file fail: ", contentFileDir)
        raise Exception("Error Reading rules file")

def find_string(patterns, content, diffFile):
    for pattern in patterns:
        res = patterns[pattern].findall(content)
        if res:
            print("diffFile:", diffFile)
            for res_item in res:
                print("Sensitive Content: ", res_item)
            raise Exception("Found sensitive words")

def read_diffFiles(rootDir):
    includeFilePath = os.path.join(rootDir, "diffFiles.txt")
    diffFiles = read_files(includeFilePath)
    excludeFiles = filter_diffFiles(rootDir)
    targetDiffFiles = diffFiles.copy()
    for item in diffFiles:
        for exFile in excludeFiles:
            if fnmatch.fnmatch(item, exFile):
                targetDiffFiles.remove(item)
                break
    return targetDiffFiles

def read_allRepoFile(rootDir):
    result = [os.path.join(dp, f) for dp, dn, filenames in os.walk(rootDir) for f in filenames]
    pathPerfix = rootDir + '/'
    new_list = [str(i).replace( pathPerfix, '') for i in result]
    targetDiffFiles = new_list.copy()
    excludeFiles = filter_diffFiles(rootDir)
    for item in new_list:
        for exFile in excludeFiles:
            if fnmatch.fnmatch(item, exFile):
                targetDiffFiles.remove(item)
                break
    return targetDiffFiles

def filter_diffFiles(rootDir):
    excludeFilePath = os.path.join(rootDir, ".github", "detect", "excludes.txt")
    excludeFiles = read_files(excludeFilePath)
    return excludeFiles

def find_string_in_content(pattern, diffFile):
    try:
        for i, line in enumerate(open(diffFile)):
            if exclude_key_words in line:
                continue
            new_line=line.replace('"',' ')
            new_line=new_line.replace(',',' ')
            x = new_line.split()
            match = list(filter(pattern.match, x))
            if match: 
                print("Sensitive Content: ", line, " in file: ", diffFile)
                raise  Exception("Sensitive content detected! please take action to this file: ", diffFile)
    except (IOError, ValueError) as e:
        print("============ read file fail: ", diffFile)
        raise Exception("Error Reading rules file")

def main():
    currentDir = os.path.dirname(os.path.realpath(__file__))
    regexesFilePath = os.path.join(currentDir, "regexes.json")
    patterns = read_regexes(regexesFilePath)
    rootDir = os.path.join(currentDir, "..", "..")
    scanType = sys.argv[1]
    targetDiffFiles = []
    if scanType == 'diff':
        targetDiffFiles = read_diffFiles(rootDir)
    else:
        targetDiffFiles = read_allRepoFile(rootDir)
    for diffFile in targetDiffFiles:
        for pattern in patterns:
            find_string_in_content(patterns[pattern], diffFile)
    
main()
