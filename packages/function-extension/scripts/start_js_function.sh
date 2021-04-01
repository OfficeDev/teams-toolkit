#!/bin/bash

set -e

DIR="$(cd `dirname $0`; pwd)"
pushd "$DIR"

echo "## Copy built nuget package to local nuget source"
function_app_dir="$DIR/../tests/TestAssets/FunctionAppJS/"
release_path="$DIR/../src/bin/Release/"
local_nuget_path="${function_app_dir}/localNuget"
local_nuget_source_name="localNuget"
rm -rf $local_nuget_path
mkdir $local_nuget_path
dotnet nuget remove source $local_nuget_source_name || true
dotnet nuget add source $local_nuget_path --name $local_nuget_source_name || true
dotnet nuget locals all --clear

cd $release_path
files=$(ls $release_path)
for filename in $files
do
  if [ "${filename##*.}"x = "nupkg"x ];then
    echo $filename
    cp $release_path/$filename $local_nuget_path

    nuget_package_version=$(echo $filename | sed 's/Microsoft.Azure.WebJobs.Extensions.TeamsFx.//' | sed 's/.nupkg//')
    break
  fi
done

cd $function_app_dir

test_space_main=$function_app_dir/test_space_main
test_space_emptyClientId=$function_app_dir/test_space_emptyClientId
test_space_nullClientId=$function_app_dir/test_space_nullClientId
test_space_emptyStringProperties=$function_app_dir/test_space_emptyStringProperties
test_space_nullProperties=$function_app_dir/test_space_nullProperties

test_function_app_js_template_dir=$function_app_dir/testFunctionAppJSTemplate
test_local_settings_json_files_dir=$function_app_dir/testLocalSettingJsonFiles
local_settings_json_file_name=local.settings.json
local_settings_json_dir=$function_app_dir/localSettingsJson

echo "## Get secret from pipeline variables"
files=$(ls $local_settings_json_dir)
for filename in $files
do
    sed -i "s/__CLIENT_SECRET__/$ClientSecret/g" $local_settings_json_dir/$filename
done

# TODO: Move the logic to C# test cases.
echo "## Prepare test workspace"
rm -rf $test_space_main && mkdir $test_space_main && cp -r $test_function_app_js_template_dir/* $test_space_main/
rm -rf $test_space_emptyClientId && mkdir $test_space_emptyClientId && cp -r $test_function_app_js_template_dir/* $test_space_emptyClientId/
rm -rf $test_space_nullClientId && mkdir $test_space_nullClientId && cp -r $test_function_app_js_template_dir/* $test_space_nullClientId/
rm -rf $test_space_emptyStringProperties && mkdir $test_space_emptyStringProperties && cp -r $test_function_app_js_template_dir/* $test_space_emptyStringProperties/
rm -rf $test_space_nullProperties && mkdir $test_space_nullProperties && cp -r $test_function_app_js_template_dir/* $test_space_nullProperties/

sudo cp $local_settings_json_dir/main_local.settings.json $test_space_main/$local_settings_json_file_name
sudo cp $local_settings_json_dir/emptyClientId_local.settings.json $test_space_emptyClientId/$local_settings_json_file_name
sudo cp $local_settings_json_dir/nullClientId_local.settings.json $test_space_nulllientId/$local_settings_json_file_name
sudo cp $local_settings_json_dir/emptyStringProperties_local.settings.json $test_space_emptyStringProperties/$local_settings_json_file_name
sudo cp $local_settings_json_dir/nullProperties_local.settings.json $test_space_nullProperties/$local_settings_json_file_name


echo "## For each test space: 1. Sync function extensions; 2. start function app"
cd $test_space_main
func extensions install --package Microsoft.Azure.WebJobs.Extensions.TeamsFx --version $nuget_package_version --source $local_nuget_path
func host start --port 7071 &

cd $test_space_emptyClientId
func extensions install --package Microsoft.Azure.WebJobs.Extensions.TeamsFx --version $nuget_package_version --source $local_nuget_path
func host start --port 7072 &

cd $test_space_emptyStringProperties
func extensions install --package Microsoft.Azure.WebJobs.Extensions.TeamsFx --version $nuget_package_version --source $local_nuget_path
func host start --port 7073 &

cd $test_space_emptyClientId
func extensions install --package Microsoft.Azure.WebJobs.Extensions.TeamsFx --version $nuget_package_version --source $local_nuget_path
func host start --port 7074 &

cd $test_space_nullProperties
func extensions install --package Microsoft.Azure.WebJobs.Extensions.TeamsFx --version $nuget_package_version --source $local_nuget_path
func host start --port 7075 &


popd
