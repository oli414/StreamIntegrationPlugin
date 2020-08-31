// Expose the OpenRCT2 to Visual Studio Code's Intellisense
/// <reference path="../../../bin/openrct2.d.ts" />

import Oui from "./OliUI"

const colorsLookUp = [
    "black",
    "grey",
    "white",
    "dark purple",
    "light purple",
    "bright purple",
    "dark blue",
    "light blue",
    "icy blue",
    "dark water",
    "light water",
    "saturated green",
    "dark green",
    "moss green",
    "bright green",
    "olive green",
    "dark olive green",
    "bright yellow",
    "yellow",
    "dark yellow",
    "light orange",
    "dark orange",
    "light brown",
    "saturated brown",
    "dark brown",
    "salmon pink",
    "bordeaux red",
    "saturated red",
    "bright red",
    "dark pink",
    "bright pink",
    "light pink"
];

function isNumber(n) {
    return typeof n == 'number' && !isNaN(n) && isFinite(n);
}

function randomColor() {
    return Math.floor(Math.random() * 32);
}

function toColorIndex(str) {
    if (isNumber(str)) {
        if (parseInt(str) < 32 && parseInt(str) >= 0)
            return randomColor();
        return parseInt(str);
    }
    else {
        const colorDictionary = {
            "darkpurple": 3,
            "lightpurple": 4, "purple": 4,
            "brightpurple": 5,
            "darkblue": 6, "blue": 6,
            "lightblue": 7,
            "icyblue": 8, "icy": 8, "ice": 8,
            "darkwater": 9, "water": 9, "ocean": 9,
            "lightwater": 10,
            "saturatedgreen": 11, "green": 11,
            "darkgreen": 12,
            "mossgreen": 13, "moss": 13,
            "brightgreen": 14, "lightgreen": 14,
            "olivegreen": 15, "olive": 15,
            "darkolivegreen": 16,
            "brightyellow": 17, "lightyellow": 17,
            "yellow": 18,
            "darkyellow": 19,
            "lightorange": 20, "orange": 20,
            "darkorange": 21,
            "lightbrown": 22,
            "saturatedbrown": 23, "brown": 23,
            "darkbrown": 24,
            "salmonpink": 25, "salmon": 25,
            "bordeauxred": 26,
            "saturatedred": 27, "darkred": 27,
            "brightred": 28, "red": 28,
            "darkpink": 29, "magenta": 29,
            "brightpink": 30, "pink": 30,
            "lightpink": 31,
            "black": 0, "dark": 0,
            "grey": 1, "gray": 1,
            "white": 2, "light": 2, "snow": 2,
        };

        str = str.toLowerCase();
        str = str.replace(" ", "");
        str = str.replace("-", "");
        str = str.replace("_", "");

        let color = colorDictionary[str];
        if (color == null) {
            color = randomColor();
            for (let prop in colorDictionary) {
                if (str.includes(prop)) {
                    color = colorDictionary[prop];
                    break;
                }
            }
        }
        return color;
    }
}

let currentPeepCount = 0;
let setPeepsFollow = context.sharedStorage.get("Oli414.StreamIntegration.TrackPeeps", true);
let setViewerEntersNotification = context.sharedStorage.get("Oli414.StreamIntegration.EnablePeepSpawnNotification", true);
let enabledNotifications = context.sharedStorage.get("Oli414.StreamIntegration.EnableNotifications", true);
let activeViewerPeeps = [];
let disablePlugin = context.sharedStorage.get("Oli414.StreamIntegration.DisablePlugin", false);

let statusLabel = null;

function CreateWindow() {
    const window = new Oui.Window("stream-integration", "Twitch Stream Integration");
    window.setColors(5);
    window.setWidth(300);

    let status = "Status: Connecting...";
    if (disablePlugin) {
        status = "Status: Disabled";
    }
    statusLabel = new Oui.Widgets.Label(status);
    statusLabel.setHeight(14);
    window.addChild(statusLabel);

    const disablePluginCheck = new Oui.Widgets.Checkbox("Disable plugin (requires park reload)", (value) => {
        disablePlugin = value;
        context.sharedStorage.set("Oli414.StreamIntegration.DisablePlugin", disablePlugin);
    });
    disablePluginCheck.setChecked(disablePlugin);
    window.addChild(disablePluginCheck);

    const notificationsToolbox = new Oui.Widgets.Checkbox("Enable notifications", (value) => {
        enabledNotifications = value;
        context.sharedStorage.set("Oli414.StreamIntegration.EnableNotifications", enabledNotifications);
    });
    notificationsToolbox.setChecked(enabledNotifications);
    window.addChild(notificationsToolbox);

    const groupbox = new Oui.GroupBox("Peeps");
    window.addChild(groupbox);

    const peepLabel = new Oui.Widgets.Label("Viewer peeps are peeps that are named by/after");
    groupbox.addChild(peepLabel);

    const peepLabel2 = new Oui.Widgets.Label("stream viewers");
    peepLabel2.setHeight(14);
    groupbox.addChild(peepLabel2);

    const trackSpawnedViewerPeeps = new Oui.Widgets.Checkbox("Track viewer peeps", (value) => {
        setPeepsFollow = value;
        context.sharedStorage.set("Oli414.StreamIntegration.TrackPeeps", setPeepsFollow);

        if (!setPeepsFollow) {
            for (let i = 0; i < map.numEntities; i++) {
                let peep = map.getEntity(i);

                if (peep == null)
                    continue;

                if (peep.type != "peep")
                    continue;

                if (peep.peepType != "guest")
                    continue;

                peep.setFlag("tracking", false);
            }
        }
    });
    trackSpawnedViewerPeeps.setChecked(setPeepsFollow);
    groupbox.addChild(trackSpawnedViewerPeeps);

    const spawnNotification = new Oui.Widgets.Checkbox("Show notification when viewer peep spawn", (value) => {
        setViewerEntersNotification = value;
        context.sharedStorage.set("Oli414.StreamIntegration.EnablePeepSpawnNotification", setViewerEntersNotification);
    });
    spawnNotification.setChecked(setViewerEntersNotification);
    groupbox.addChild(spawnNotification);

    return window;
}

function main() {
    const window = CreateWindow();
    ui.registerMenuItem("Twitch Stream Integration", function () {
        window.open();
    });

    if (disablePlugin) {
        return;
    }

    let connected = false;
    let silent = false;
    let initialConnect = true;
    let socket = network.createSocket();

    let recolorQueue = [];
    let peepSpawnQueue = [];

    function connect() {
        if (!silent) {
            console.log("[StreamIntegration] " + "Connecting...");
            silent = true;
        }
        statusLabel.setText("Status: Connecting...");
        if (initialConnect) {
            socket.connect(8081, "127.0.0.1", () => {
                if (!connected) {
                    statusLabel.setText("Status: Connected");
                    console.log("[StreamIntegration] " + "Connected");
                    connected = true;
                }
            });
            initialConnect = true;
        }
        else {
            socket.connect(8081, "127.0.0.1");
        }
    }

    socket.on("close", () => {
        connected = false;
        silent = false;
        statusLabel.setText("Status: Disconnected");
        console.log("[StreamIntegration] " + "Connection closed");
        connect();
    });

    socket.on("error", (err) => {
        if (!silent) {
            console.log("[StreamIntegration] " + err);
        }
        if (err.toString().includes("timed out")) {
            statusLabel.setText("Status: Connection time out");
            connected = false;
            socket.destroy("Time out");
            //socket = network.createSocket();
            connect();
        }
        else {
            console.log("[StreamIntegration] " + err);
        }
    });

    socket.on("data", (msg) => {
        const data = JSON.parse(msg);
        if (data.type == "NAME_RIDE") {
            const parts = data.message.split(" to ");

            for (let i = 0; i < map.numRides; i++) {
                let ride = map.rides[i];

                if ((ride.name.toLowerCase() == "<" + parts[0].toLowerCase() + ">") ||
                    (parts[0].startsWith("<") && parts[0].endsWith(">") && ride.name.toLowerCase() == parts[0].toLowerCase())) {

                    if (enabledNotifications) {
                        park.postMessage({
                            type: "attraction",
                            text: data.username + ": Renamed " + ride.name + " to " + parts[1] + "",
                            subject: ride.id
                        });
                    }

                    context.executeAction("ridesetname", {
                        ride: ride.id,
                        name: parts[1]
                    }, (result) => {

                    });

                    break;
                }
            }
        }
        else if (data.type == "SPAWN_PEEP") {
            let name = data.message;
            if (name == "") {
                name = data.username;
            }

            let currentPeep = null;
            let preExisting = false;
            let peeps = map.getAllEntities("peep");
            for (let i = 0; i < peeps.length; i++) {
                let peep = peeps[i];

                if (peep.name == name) {
                    currentPeep = peep;
                    preExisting = true;
                    break;
                }
            }

            if (!preExisting) {
                peepSpawnQueue.push(name);
            }
            else {
                activeViewerPeeps.push(name);
                if (setPeepsFollow) {
                    currentPeep.setFlag("tracking", setPeepsFollow);
                }

                if (setViewerEntersNotification) {
                    park.postMessage({
                        type: "peep",
                        text: name + " entered the park!",
                        subject: currentPeep.id
                    });
                }
            }
        }
        else if (data.type == "REPLACE_RIDE_COLOR") {
            const str = data.message;
            const parts = str.split(" to ");

            let baseColor = randomColor();
            let newColor = randomColor();
            if (parts[0] && parts[1]) {
                baseColor = toColorIndex(parts[0]);
                newColor = toColorIndex(parts[1]);
            }
            else if (parts[0]) {
                baseColor = toColorIndex(parts[0]);
            }

            if (enabledNotifications) {
                park.postMessage({
                    type: "attraction",
                    text: data.username + ": Recolored " + colorsLookUp[baseColor] + " to " + colorsLookUp[newColor] + ""
                });
            }

            recolorQueue.push([
                baseColor,
                newColor
            ]);
        }

    });

    connect();

    let rideIndex = 0;
    let lastPeepCount = 0;
    context.subscribe("interval.tick", () => {
        // Rename newly spawned peeps
        let allPeeps = map.getAllEntities("peep");
        currentPeepCount = allPeeps.length;
        if (peepSpawnQueue.length > 0) {
            if (currentPeepCount > lastPeepCount && lastPeepCount != 0) {
                for (let i = 0; i < map.numEntities; i++) {
                    let peep = map.getEntity(i);

                    if (peep == null)
                        continue;

                    if (peep.type != "peep")
                        continue;

                    if (peep.peepType != "guest")
                        continue;

                    if (activeViewerPeeps.indexOf(peep.name) >= 0)
                        continue;

                    if (peep.getFlag("leavingPark"))
                        continue;

                    if (peep.x < 0 || peep.x >= map.size.x * 32 && peep.y == 0 && peep.z == 0)
                        continue;

                    if (!(Math.floor(peep.x / 32) <= 1 || Math.floor(peep.y / 32) <= 1 ||
                        Math.floor(peep.x / 32) >= map.size.x - 2 || Math.floor(peep.y / 32) >= map.size.y - 2))
                        continue;

                    // New peep has spawned
                    peep.setFlag("tracking", setPeepsFollow);
                    context.executeAction("guestsetname", {
                        peep: peep.id,
                        name: peepSpawnQueue[0]
                    }, (result) => {

                    });

                    if (setViewerEntersNotification) {
                        park.postMessage({
                            type: "peep",
                            text: peepSpawnQueue[0] + " entered the park!",
                            subject: peep.id
                        });
                    }

                    activeViewerPeeps.push(peepSpawnQueue[0]);
                    peepSpawnQueue.shift();
                }
            }
        }
        lastPeepCount = currentPeepCount;

        // Recolor rides
        if (recolorQueue.length > 0) {
            let checksPerTick = 2;
            for (let i = 0; i < checksPerTick && i + rideIndex < map.numRides; i++) {
                let ride = map.rides[rideIndex];
                let recolorAction = recolorQueue[0];

                function setColor(type, index) {
                    const setColorParams = {
                        ride: ride.id,
                        type: type,
                        value: recolorAction[1],
                        index: index
                    };

                    context.executeAction("ridesetappearance", setColorParams, (result) => {

                    });
                }

                for (let j = 0; j < ride.colourSchemes.length; j++) {
                    let colourScheme = ride.colourSchemes[j];
                    if (colourScheme.main == recolorAction[0]) {
                        setColor(0, j);
                    }
                    if (colourScheme.additional == recolorAction[0]) {
                        setColor(1, j);
                    }
                    if (colourScheme.supports == recolorAction[0]) {
                        setColor(2, j);
                    }
                }

                for (let j = 0; j < ride.vehicleColours.length && j < 1; j++) {
                    let vehicleColours = ride.vehicleColours[j];
                    if (vehicleColours.body == recolorAction[0]) {
                        setColor(3, j);
                    }
                    if (vehicleColours.trim == recolorAction[0]) {
                        setColor(4, j);
                    }
                    if (vehicleColours.ternary == recolorAction[0]) {
                        setColor(5, j);
                    }
                }

                rideIndex++;
            }
            if (rideIndex >= map.numRides) {
                rideIndex = 0;
                recolorQueue.shift();
            }
        }
    });
}

registerPlugin({
    name: "StreamIntegration",
    version: "0.1",
    licence: "MIT",
    authors: ["Oli414"],
    type: "local",
    main: main
});