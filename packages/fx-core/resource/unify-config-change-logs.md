# Congratulations! You have successfully upgraded your Teams to support config unify

We have updated the configuration files so that your project is compatible with the latest Teams Toolkit features. Now you can continue your work.

## Know about the changes we made

* Use ```config.local.json``` for local debug instead of ```localSettings.json```.
* Use ```manifest.template.json``` to generate manifest both for local and remote Teams app instead of ```manifest.local.template.json``` and ```manifest.remote.template.json```.
* We have backed up ```localSettings.json```, ```manifest.local.template.json``` and ```manifest.remote.template.json``` in ```.backup``` folder.

## Know about how to restore your project

* Copy the .backup/.fx folder to your project root path.
* Copy the .backup/templates folder to your project root path.
* Delete ```config.local.json``` and ```manifest.template.json``` if needed.