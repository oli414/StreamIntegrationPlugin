# OpenRCT2 Stream Integration
This plugin allows you to enable Twitch integration with OpenRCT2. 
Plugins cannot communicate with Twitch directly, make sure to run the [OpenRCT2 Stream Integration Relay](https://github.com/oli414/OpenRCT2StreamIntegration) simultaneously.

## Prerequisites
- This plugin requires OpenRCT2 Release v0.4.0 (or higher, not yet available), or OpenRCT2 Develop v0.3.0 (or higher)

## Installation
- Download the most recent plugin file [here](https://github.com/oli414/StreamIntegrationPlugin/releases) (`StreamIntegration.js
`)
- Move/copy `StreamIntegration.js` to `<OpenRCT2 folder>/plugin` (Usually at `documents/OpenRCT2/plugin`)

- Install the OpenRCT2 Stream Integration Relay ([installation steps here](https://github.com/oli414/OpenRCT2StreamIntegration))

## Running the OpenRCT2 Stream Integration for Twitch
- Run `start.bat` from the Relay's installation folder (On Windows), or: Navigate a command prompt to the project folder and run `npm run start`
- Your default browser may open asking you to log into Twitch, and give permission for the OpenRCT2 Stream Integration to keep track of channel activities
- Wait for the command prompt to show "All systems are up and running"
- Run OpenRCT2 and load a park
- Open the Twitch Stream Integration window under the map icon and verify that the status is "Connected"
