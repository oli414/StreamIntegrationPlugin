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
    "AddMoney": 16,
    "ClearLoan": 18,
    "GenerateGuests": 20,
    "ExplodeGuests": 22,
    "GiveAllGuests": 22,
    "SetGrassLength": 23,
    "WaterPlants": 24,
    "FixVandalism": 26,
    "RemoveLitter": 27,
    "RenewRides": 29,
    "FixRides": 31,
    "ForceWeather": 35,
    "SpawnDucks": 46
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

        if (true) {
            console.log(data);
        }

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
        else if (data.type == "SET_STAFF_NAME") {
            for (let i = 0; i < map.numEntities; i++) {
                let peep = map.getEntity(i);

                if (peep == null)
                    continue;

                if (peep.type != "peep")
                    continue;

                if (peep.peepType != "staff")
                    continue;

                if (peep.name.startsWith("Handyman") ||
                    peep.name.startsWith("Mechanic") ||
                    peep.name.startsWith("Security Guard") ||
                    peep.name.startsWith("Entertainer")) {


                    context.executeAction("staffsetname", {
                        spriteIndex: peep.id,
                        name: data.message
                    }, (result) => {

                    });

                    if (setViewerEntersNotification) {
                        park.postMessage({
                            type: "peep",
                            text: data.username + ": Renamed " + peep.name + " to " + data.message,
                            subject: peep.id
                        });
                    }

                    peep.name = data.message;

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
        else if (data.type == "EXPLODE_PEEPS") {
            for (var i = 0; i < map.numEntities; i++) {
                var entity = map.getEntity(i);
                if (!entity) {
                    continue;
                }

                var entityIsGuest = entity.type === 'peep' && entity.peepType === "guest";

                if (entityIsGuest && context.getRandom(0, 6) === 0) {
                    entity.setFlag("explode", true);
                }
            }

            if (enabledNotifications) {
                park.postMessage({
                    type: "guests",
                    text: data.username + ": Might have made guests explosive"
                });
            }
        }
        else if (data.type == "SPAWN_DUCKS") {
            let value = parseIntOrDefault(data.message, 10);
            context.executeAction("cheatset", {
                type: cheatTypes.SpawnDucks,
                param1: value,
                param2: 0
            }, (result) => {

            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "blank",
                    text: data.username + ": Started a duck migration"
                });
            }
        }
        else if (data.type == "GIVE_PEEPS_BALLOONS") {
            context.executeAction("cheatset", {
                type: cheatTypes.GiveAllGuests,
                param1: 2,
                param2: 0
            }, (result) => {
                console.log(result);
            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "guests",
                    text: data.username + ": Gave guests balloons"
                });
            }
        }
        else if (data.type == "GIVE_PEEPS_PARK_MAPS") {
            context.executeAction("cheatset", {
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
            context.executeAction("cheatset", {
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
        else if (data.type == "REMOVE_ITEM_FROM_PEEPS") {
            var item = "balloon";
            if(data.message !== undefined && data.message !== "") {
                item = data.message;
            }
            for (var i = 0; i < map.numEntities; i++) {
                var entity = map.getEntity(i);
                if (!entity) {
                    continue;
                }

                var entityIsGuest = entity.type === 'peep' && entity.peepType === "guest";

                if (entityIsGuest) {
                    for(var j = 0; j < entity.items.length; j++) {
                        if(entity.items[j].type === item) {
                            entity.removeItem(entity.items[j]);
                        }
                    }
                }
            }

            if (enabledNotifications) {
                park.postMessage({
                    type: "guests",
                    text: data.username + ": Made guests lose their " + item + "s"
                });
            }
        }
        else if (data.type == "REMOVE_ALL_ITEMS_FROM_PEEPS") {
            for (var i = 0; i < map.numEntities; i++) {
                var entity = map.getEntity(i);
                if (!entity) {
                    continue;
                }

                var entityIsGuest = entity.type === 'peep' && entity.peepType === "guest";

                if (entityIsGuest) {
                    for(; 0 < entity.items.length;) {//Loop through all the items, but the array gets smaller every time we remove an item.
                        entity.removeItem(entity.items[0]);//Let's always remove the first item in the list. Let's clear them out!
                    }
                }
            }

            if (enabledNotifications) {
                park.postMessage({
                    type: "guests",
                    text: data.username + ": Made guests lose all their items"
                });
            }
        }
        else if (data.type == "SPAWN_PEEPS") {
            let value = parseIntOrDefault(data.message, 100);
            context.executeAction("cheatset", {
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
            context.executeAction("cheatset", {
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
            context.executeAction("cheatset", {
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
            context.executeAction("cheatset", {
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
            context.executeAction("cheatset", {
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
        else if (data.type == "FILL_BLADDERS") {
            context.executeAction("cheatset", {
                type: 19,
                param1: 6,
                param2: 255
            }, (result) => {

            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "guests",
                    text: data.username + ": Filled everyone's bladder"
                });
            }
        }
        else if (data.type == "EMPTY_BLADDERS") {
            context.executeAction("cheatset", {
                type: 19,
                param1: 6,
                param2: 0
            }, (result) => {

            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "guests",
                    text: data.username + ": Emptied everyone's bladder"
                });
            }
        }
        else if (data.type == "MOW_GRASS") {
            context.executeAction("cheatset", {
                type: cheatTypes.SetGrassLength,
                param1: 3,
                param2: 0,
                flags: null
            }, (result) => {
                console.log(result);
            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "blank",
                    text: data.username + ": Mowed the grass"
                });
            }
        }
        else if (data.type == "RENEW_RIDES") {
            context.executeAction("cheatset", {
                type: cheatTypes.RenewRides,
                param1: 0,
                param2: 0
            }, (result) => {
                console.log(result);
            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "blank",
                    text: data.username + ": Refurbished all the rides"
                });
            }
        }
        else if (data.type == "FIX_RIDES") {
            context.executeAction("cheatset", {
                type: cheatTypes.FixRides,
                param1: 0,
                param2: 0
            }, (result) => {
                console.log(result);
            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "blank",
                    text: data.username + ": Fixed all the rides"
                });
            }
        }
        else if (data.type == "FIX_RIDE") {

            const ridename = data.message;

            for (let i = 0; i < map.numRides; i++) {
                let ride = map.rides[i];

                if ((ride.name.toLowerCase() == ridename.toLowerCase())) {
                    if (enabledNotifications) {
                        park.postMessage({
                            type: "blank",
                            text: data.username + ": Fixed " + ride.name
                        });
                    }

                    ride

                    /*
                    context.executeAction("ridesetname", {
                        ride: ride.id,
                        name: parts[1]
                    }, (result) => {

                    });*/


                    break;
                }
            }

            const ride = 0;

            if (enabledNotifications) {
                park.postMessage({
                    type: "blank",
                    text: data.username + ": Fixed " + ride.name
                });
            }
        }
        else if (data.type == "FIX_VANDALISM") {
            context.executeAction("cheatset", {
                type: cheatTypes.FixVandalism,
                param1: 0,
                param2: 0
            }, (result) => {

            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "blank",
                    text: data.username + ": Fixed all the vandalism"
                });
            }
        }
        else if (data.type == "REMOVE_LITTER") {
            context.executeAction("cheatset", {
                type: cheatTypes.RemoveLitter,
                param1: 0,
                param2: 0
            }, (result) => {

            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "blank",
                    text: data.username + ": Removed all the litter"
                });
            }
        }
        else if (data.type == "WATER_PLANTS") {
            context.executeAction("cheatset", {
                type: cheatTypes.WaterPlants,
                param1: 0,
                param2: 0
            }, (result) => {

            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "blank",
                    text: data.username + ": Watered all the plants"
                });
            }
        }
        else if (data.type == "FORCE_WEATHER") {
            context.executeAction("cheatset", {
                type: cheatTypes.ForceWeather,
                param1: parseIntOrDefault(data.message, 0),
                param2: 0
            }, (result) => {

            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "blank",
                    text: data.username + ": Changed the weather"
                });
            }
        }
        else if (data.type == "SET_PARK_NAME") {
            context.executeAction("parksetname", {
                name: data.message
            }, (result) => {

            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "blank",
                    text: data.username + ": Changed the park name to " + data.message
                });
            }
        }
        else if (data.type == "CLEAR_LOAN") {
            context.executeAction("cheatset", {
                type: cheatTypes.ClearLoan,
                param1: 0,
                param2: 0
            }, (result) => {

            });

            if (enabledNotifications) {
                park.postMessage({
                    type: "blank",
                    text: data.username + ": Paid off your loan"
                });
            }
        }
        else if (data.type == "ADD_MONEY" || data.type == "REMOVE_MONEY") {
            let value = parseIntOrDefault(data.message, 1000);
            if ((value > 0 && data.type == "ADD_MONEY") ||
                value < 0 && data.type == "REMOVE_MONEY") {
                if (value < 0)
                    value = -value;
                context.executeAction("cheatset", {
                    type: cheatTypes.AddMoney,
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
                context.executeAction("cheatset", {
                    type: cheatTypes.AddMoney,
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

    context.subscribe("guest.generation", (e) => {
        if (e.id && peepSpawnQueue.length > 0) {
            let peep = map.getEntity(e.id);

            if (peep == null)
                return;

            if (peep.type != "peep")
                return;

            if (peep.peepType != "guest")
                return;

            if (activeViewerPeeps.indexOf(peep.name) >= 0)
                return;

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
    });

    context.subscribe("interval.tick", () => {
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

                if (ride.vehicleColours.length > 0) {
                    let vehicleColours = ride.vehicleColours[0];
                    let color = recolorAction[0];

                    if (vehicleColours.body == color || color == 32) {
                        setColor(3, 0);
                    }
                    if (vehicleColours.trim == color || color == 32) {
                        setColor(4, 0);
                    }
                    if (vehicleColours.ternary == color || color == 32) {
                        setColor(5, 0);
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