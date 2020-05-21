# Make your Etherpad react to the sun

# About

A still experimental [Etherpad](https://github.com/ether/etherpad-lite) plugin that changes the skin variant according to the position of the sun at a given location, so you can make your skin go dark at night.

Still in very early stages (this is my first Node project), but open to suggestions and pull requests!

## Requirements

Tested with Etherpad 1.8.3 running in Node.js v12.16.3.

## Install

Not yet in Etherpad plugin repository, so create an ep_solar folder manually in your node_modules and copy the contents of this repository. Set your position (latitude and longitude in decimal degrees) and other settings directly in the static/js/index.js file.

## How it works

Given a location and time (by default, the current time of the client) an elevation of the sun is calculated and then whether it is day or night. The formulas at the [NOAA ESRL Solar Position Calculator](https://www.esrl.noaa.gov/gmd/grad/solcalc/azel.html) have been adapted for this purpose.

Upon opening a pad the above calculation is performed and the skin is updated accordingly, using the same functions as the skin_variants.js.

I use the aceSetAuthorStyle client hook, as it runs after all the iframes have been built.

## To do

- Set lat/lon in settings.json instead of directly in plugin script.
- Allow plugin to get location from client if allowed.
- Use a different hook that allows theme to react in real time instead of needing reload.
- Allow setting twilight/dawn colors for day/night transition.
