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
    "light pink",
    "rainbow"
];

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
    "darkyellow": 19, "gold": 19,
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

const cheatTypes = {
    "GenerateGuests": 20,
    "ExplodeGuests": 22,
    "GiveAllGuests": 23,
    "SpawnDucks": 47
};

function parseIntOrDefault(n, def) {
    if (isNumber(parseInt(n))) {
        return parseInt(n);
    }
    else {
        return def;
    }
}

function isNumber(n) {
    return typeof n == 'number' && !isNaN(n) && isFinite(n);
}

function randomColor() {
    return Math.floor(Math.random() * 32);
}

function toColorIndex(str) {
    if (str.trim().toLowerCase() == "rainbow") {
        return 32;
    }
    if (isNumber(parseInt(str))) {
        if (parseInt(str) < 32 && parseInt(str) >= 0)
            return randomColor();
        return parseInt(str);
    }
    else {
        str = str.toLowerCase();
        str = str.split(" ").join("");
        str = str.split("-").join("");
        str = str.split("_").join("");

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

                console.log(baseColor);
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
        else if (data.type == "EXPLODE_PEEPS") {
            context.executeAction("setcheataction", {
                type: cheatTypes.ExplodeGuests,
                param1: 0,
                param2: 0
            }, (result) => {

            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "guests",
                    text: data.username + ": Might have made guests explosive"
                });
            }
        }
        else if (data.type == "SPAWN_DUCKS") {
            let value = parseIntOrDefault(data.message, 10);
            context.executeAction("setcheataction", {
                type: cheatTypes.SpawnDucks,
                param1: value,
                param2: 0
            }, (result) => {

            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "blank",
                    text: data.username + ": Started a duck migration of " + value + " ducks"
                });
            }
        }
        else if (data.type == "GIVE_PEEPS_BALLOONS") {
            context.executeAction("setcheataction", {
                type: cheatTypes.GiveAllGuests,
                param1: 2,
                param2: 0
            }, (result) => {

            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "guests",
                    text: data.username + ": Gave guests balloons"
                });
            }
        }
        else if (data.type == "GIVE_PEEPS_PARK_MAPS") {
            context.executeAction("setcheataction", {
                type: cheatTypes.GiveAllGuests,
                param1: 1,
                param2: 0
            }, (result) => {

            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "guests",
                    text: data.username + ": Gave guests park maps"
                });
            }
        }
        else if (data.type == "GIVE_PEEPS_UMBRELLAS") {
            context.executeAction("setcheataction", {
                type: cheatTypes.GiveAllGuests,
                param1: 3,
                param2: 0
            }, (result) => {

            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "guests",
                    text: data.username + ": Gave guests umbrellas"
                });
            }
        }
        else if (data.type == "SPAWN_PEEPS") {
            let value = parseIntOrDefault(data.message, 100);
            context.executeAction("setcheataction", {
                type: cheatTypes.GenerateGuests,
                param1: parseIntOrDefault(data.message, 100),
                param2: 0
            }, (result) => {

            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "guests",
                    text: data.username + ": Brought " + value + " peeps"
                });
            }
        }
        else if (data.type == "GIVE_PEEPS_MONEY") {
            context.executeAction("setcheataction", {
                type: cheatTypes.GiveAllGuests,
                param1: 0,
                param2: 0
            }, (result) => {

            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "guests",
                    text: data.username + ": Gave all guests $1000"
                });
            }
        }
        else if (data.type == "REMOVE_ALL_PEEPS") {
            context.executeAction("setcheataction", {
                type: 21,
                param1: 0,
                param2: 0
            }, (result) => {

            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "guests",
                    text: data.username + ": Made all the guests disappear"
                });
            }
        }
        else if (data.type == "NAUSEATE_PEEPS") {
            context.executeAction("setcheataction", {
                type: 19,
                param1: 4,
                param2: 255
            }, (result) => {

            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "guests",
                    text: data.username + ": Made all the guests sick"
                });
            }
        }
        else if (data.type == "HEAL_PEEPS") {
            context.executeAction("setcheataction", {
                type: 19,
                param1: 4,
                param2: 0
            }, (result) => {

            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "guests",
                    text: data.username + ": Healed all the guests"
                });
            }
        }
        else if (data.type == "ADD_MONEY" || data.type == "REMOVE_MONEY") {
            let value = parseIntOrDefault(data.message, 1000);
            if ((value > 0 && data.type == "ADD_MONEY") ||
                value < 0 && data.type == "REMOVE_MONEY") {
                if (value < 0)
                    value = -value;
                context.executeAction("setcheataction", {
                    type: 16,
                    param1: value * 10,
                    param2: 0
                }, (result) => {

                });

                if (enabledNotifications) {
                    park.postMessage({
                        type: "guests",
                        text: data.username + ": Donated $" + value + ".00 to your park"
                    });
                }
            }
            else if ((value < 0 && data.type == "ADD_MONEY") ||
                value > 0 && data.type == "REMOVE_MONEY") {
                if (value > 0)
                    value = -value;
                context.executeAction("setcheataction", {
                    type: 16,
                    param1: value * 10,
                    param2: 0
                }, (result) => {

                });

                if (enabledNotifications) {
                    park.postMessage({
                        type: "guests",
                        text: data.username + ": Stole $" + (-value) + ".00 from your park"
                    });
                }
            }
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
                    let recolor = recolorAction[1];
                    if (recolor == 32) {
                        recolor = randomColor();
                    }

                    const setColorParams = {
                        ride: ride.id,
                        type: type,
                        value: recolor,
                        index: index
                    };

                    context.executeAction("ridesetappearance", setColorParams, (result) => {

                    });
                }

                for (let j = 0; j < ride.colourSchemes.length; j++) {
                    let colourScheme = ride.colourSchemes[j];
                    let color = recolorAction[0];

                    if (colourScheme.main == color || color == 32) {
                        setColor(0, j);
                    }
                    if (colourScheme.additional == color || color == 32) {
                        setColor(1, j);
                    }
                    if (colourScheme.supports == color || color == 32) {
                        setColor(2, j);
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