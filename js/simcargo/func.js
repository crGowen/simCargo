var SimCargoController = (function () {
    function SimCargoController() {
    }
    SimCargoController.getFile = function (file, ports) {
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (xhr.readyState == 4) {
                if (xhr.status != 200) {
                    console.error("Request status = " + xhr.status);
                }
                else {
                    if (ports) {
                        SimCargoController.appendNewPorts(SimCargoController.cleanInput(xhr.responseText));
                    }
                    else {
                        SimCargoController.appendNewCraft(SimCargoController.cleanInput(xhr.responseText));
                    }
                }
            }
        };
        xhr.overrideMimeType("text/plain");
        xhr.open("GET", file, true);
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhr.send(null);
    };
    SimCargoController.cleanInput = function (str) {
        var newStr = "";
        for (var i = 0; i < str.length; i++) {
            switch (str.charAt(i)) {
                case 'A':
                case 'a':
                case 'B':
                case 'b':
                case 'C':
                case 'c':
                case 'D':
                case 'd':
                case 'E':
                case 'e':
                case 'F':
                case 'f':
                case 'G':
                case 'g':
                case 'H':
                case 'h':
                case 'I':
                case 'i':
                case 'J':
                case 'j':
                case 'K':
                case 'k':
                case 'L':
                case 'l':
                case 'M':
                case 'm':
                case 'N':
                case 'n':
                case 'O':
                case 'o':
                case 'P':
                case 'p':
                case 'Q':
                case 'q':
                case 'R':
                case 'r':
                case 'S':
                case 's':
                case 'T':
                case 't':
                case 'U':
                case 'u':
                case 'V':
                case 'v':
                case 'W':
                case 'w':
                case 'X':
                case 'x':
                case 'Y':
                case 'y':
                case 'Z':
                case 'z':
                case '.':
                case '0':
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                case '8':
                case '9':
                case '+':
                case '-':
                case ',':
                    newStr += str.charAt(i);
                    break;
                case '_':
                    newStr += " ";
                    break;
            }
        }
        return newStr;
    };
    SimCargoController.parseAirportsFile = function () {
        if (SimCargoController.tempIndex === SimCargoController.portFiles.length) {
            SimCargoController.tempIndex = 0;
            SimCargoController.parseCraftFile();
            return;
        }
        ;
        SimCargoController.getFile("/fs/ports/" + SimCargoController.portFiles[SimCargoController.tempIndex] + ".dat", true);
        SimCargoController.tempIndex++;
    };
    SimCargoController.parseCraftFile = function () {
        if (SimCargoController.tempIndex === SimCargoController.craftFiles.length) {
            SimCargoController.tempIndex = 0;
            SimCargoController.finishDataLoad();
            return;
        }
        ;
        SimCargoController.getFile("/fs/craft/" + SimCargoController.craftFiles[SimCargoController.tempIndex] + ".dat", false);
        SimCargoController.tempIndex++;
    };
    SimCargoController.appendNewPorts = function (ports) {
        var portList = ports.split(" ");
        for (var i = 1; i < portList.length; i++) {
            SimCargoController.cargoPorts.push(new CargoPort(portList[i]));
        }
        SimCargoController.parseAirportsFile();
    };
    SimCargoController.appendNewCraft = function (craft) {
        var index = SimCargoController.cargoCrafts.length;
        craft = craft.split("+")[1];
        var props = craft.split(",");
        SimCargoController.cargoCrafts.push(new CargoCraft(props[0], props[1], parseInt(props[2]), parseInt(props[3]), parseInt(props[4]), parseInt(props[5]), parseFloat(props[6]), parseInt(props[7])));
        var numSlots = parseInt(props[8]);
        for (var i = 0; i < numSlots; i++) {
            SimCargoController.cargoCrafts[index].addCargoSlot(props[9 + i * 2], parseInt(props[10 + i * 2]));
        }
        var offset = 9 + numSlots * 2;
        numSlots = parseInt(props[offset]);
        offset++;
        for (var i = 0; i < numSlots; i++) {
            SimCargoController.cargoCrafts[index].addFlightConfig(parseInt(props[offset + i * 4]), parseInt(props[offset + i * 4 + 1]), parseInt(props[offset + i * 4 + 2]), (props[offset + i * 4 + 3] === "y"));
        }
        SimCargoController.parseCraftFile();
    };
    SimCargoController.estimateDistanceLatLimit = function (dist) {
        dist = dist / 3440.1;
        dist = dist / 2;
        dist = Math.tan(dist);
        dist = dist * dist;
        var maxLat = 2 * Math.atan(Math.sqrt(dist));
        return maxLat * 180 / Math.PI;
    };
    SimCargoController.estimateDistanceLongLimit = function (dist, lat) {
        dist = dist / 3440.1;
        dist = dist / 2;
        dist = Math.tan(dist);
        dist = dist * dist;
        dist = dist / (dist + 1);
        dist = dist / Math.pow(Math.cos(lat * Math.PI / 180), 2);
        var maxLong = 2 * Math.asin(Math.sqrt(dist));
        return maxLong * 180 / Math.PI;
    };
    SimCargoController.getDistanceBetweenPorts = function (portA, portB) {
        var deltaLat = Math.abs(portA.getLat() - portB.getLat());
        var deltaLong = Math.abs(portA.getLong() - portB.getLong());
        if (deltaLong === 0)
            deltaLong = 0.1;
        var a = Math.pow(Math.sin(deltaLat / 360 * Math.PI), 2);
        a += Math.cos(portA.getLat() / 180 * Math.PI) * Math.cos(portB.getLat() / 180 * Math.PI) * Math.pow(Math.sin(deltaLong / 360 * Math.PI), 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return c * 3440.1 * SimCargoController.fudge;
    };
    SimCargoController.generateDistancesList = function (port) {
        var dList = [];
        for (var i = 0; i < SimCargoController.cargoPorts.length; i++) {
            if (SimCargoController.cargoPorts[i] !== port) {
                dList.push({
                    distance: SimCargoController.getDistanceBetweenPorts(port, SimCargoController.cargoPorts[i]),
                    cargoPort: SimCargoController.cargoPorts[i]
                });
            }
        }
        console.log(dList);
    };
    SimCargoController.getFuelReq = function (dist, craft) {
        return dist * craft.getFuelRate() + craft.getEmergencyFuelReq();
    };
    SimCargoController.getReqWgt = function (portA, portB, craft, cargoWgt) {
        var totalWgt = craft.getEmptyWgt() + cargoWgt + SimCargoController.pilotWgt;
        totalWgt += SimCargoController.getFuelReq(SimCargoController.getDistanceBetweenPorts(portA, portB), craft);
        return totalWgt;
    };
    SimCargoController.finishDataLoad = function () {
        SimCargoController.newGame();
        SimCargoController.updateUi("j");
    };
    SimCargoController.lBtnClick = function () {
        switch (SimCargoController.uiMode) {
            case 'j':
                break;
        }
    };
    SimCargoController.rBtnClick = function () {
        switch (SimCargoController.uiMode) {
            case 'j':
                break;
        }
    };
    SimCargoController.addToUiList = function (id, l, c, r, selectable) {
        var elemHandle = short.create("div", id, ["scList__item"]);
        if (selectable)
            elemHandle.classList.add("scList__item--hl");
        var textHandle = short.create("div", "", ["scList__text", "scList__text--left"]);
        textHandle.innerText = l;
        elemHandle.appendChild(textHandle);
        textHandle = short.create("div", "", ["scList__text", "scList__text--center"]);
        textHandle.innerText = c;
        elemHandle.appendChild(textHandle);
        textHandle = short.create("div", "", ["scList__text", "scList__text--right"]);
        textHandle.innerText = r;
        elemHandle.appendChild(textHandle);
        short.byId("scListCon").appendChild(elemHandle);
    };
    SimCargoController.setBtns = function (leftBtn, rightBtn) {
        if (leftBtn)
            short.byId("scLBtn").innerText = leftBtn;
        if (rightBtn)
            short.byId("scRBtn").innerText = rightBtn;
    };
    SimCargoController.generateCargoWeight = function () {
        var maxWeight = 0;
        for (var i = 0; i < SimCargoController.cargoCrafts.length; i++) {
            if (SimCargoController.cargoCrafts[i].getIsOwned()) {
                if (SimCargoController.cargoCrafts[i].getCargoCapacity() > maxWeight)
                    maxWeight = SimCargoController.cargoCrafts[i].getCargoCapacity();
            }
        }
        var wgtClass = "s";
        if (maxWeight >= 600)
            wgtClass = "h";
        if (maxWeight >= 1000)
            wgtClass = "m";
        var lowerBoundWgt = 0;
        switch (wgtClass) {
            case "s":
                lowerBoundWgt = 250;
                break;
            case "h":
                lowerBoundWgt = 400;
                break;
            case "m":
                lowerBoundWgt = 600;
                break;
        }
        var cargoWgt = Math.floor(Math.random() * Math.min(lowerBoundWgt, maxWeight) / 50);
        cargoWgt = cargoWgt * 50;
        return cargoWgt;
    };
    SimCargoController.getMaxRange = function (craft) {
        var wgt = craft.getEmptyWgt() + SimCargoController.pilotWgt;
        wgt = craft.getMaxTakeoffWgt() - wgt;
        wgt -= craft.getEmergencyFuelReq();
        wgt /= craft.getFuelRate();
        return wgt;
    };
    SimCargoController.getMaxRangeFromCurrentPort = function () {
        var maxRange = 0;
        for (var i = 0; i < SimCargoController.cargoCrafts.length; i++) {
            if (SimCargoController.cargoCrafts[i].getIsOwned() && SimCargoController.checkPortViability(SimCargoController.currentAirport, SimCargoController.cargoCrafts[i]) > -1) {
                if (SimCargoController.getMaxRange(SimCargoController.cargoCrafts[i]) > maxRange)
                    maxRange = SimCargoController.getMaxRange(SimCargoController.cargoCrafts[i]);
            }
        }
        return maxRange;
    };
    SimCargoController.generateJobs = function () {
        var jobRangeLimit = SimCargoController.getMaxRangeFromCurrentPort() * 2.5;
        var minLat = SimCargoController.currentAirport.getLat() - SimCargoController.estimateDistanceLatLimit(jobRangeLimit);
        var maxLat = SimCargoController.currentAirport.getLat() + SimCargoController.estimateDistanceLatLimit(jobRangeLimit);
        var minLong = SimCargoController.currentAirport.getLong() - SimCargoController.estimateDistanceLongLimit(jobRangeLimit, SimCargoController.currentAirport.getLat());
        var maxLong = SimCargoController.currentAirport.getLong() + SimCargoController.estimateDistanceLongLimit(jobRangeLimit, SimCargoController.currentAirport.getLat());
        var nearbyAirports = [];
        for (var i = 0; i < SimCargoController.cargoPorts.length; i++) {
            if (SimCargoController.cargoPorts[i].withinLatLimits(minLat, maxLat)) {
                if (SimCargoController.cargoPorts[i].withinLongLimits(minLong, maxLong)) {
                    if (SimCargoController.getDistanceBetweenPorts(SimCargoController.currentAirport, SimCargoController.cargoPorts[i]) < jobRangeLimit
                        && SimCargoController.cargoPorts[i] !== SimCargoController.currentAirport)
                        nearbyAirports.push(SimCargoController.cargoPorts[i]);
                }
            }
        }
        console.log(jobRangeLimit);
        console.log(SimCargoController.currentAirport);
        console.log(nearbyAirports);
        console.log(SimCargoController.generateCargoWeight());
    };
    SimCargoController.checkPortViability = function (port, craft) {
        var config = -1;
        var valid = true;
        if (craft.getSizeAsNum() > port.getSupportedSizeAsNum())
            return -1;
        for (var i = 0; i < craft.getNumFlightConfigs(); i++) {
            valid = true;
            if (craft.getFlightConfig(i).altitude < port.getAlt())
                valid = false;
            if (craft.getFlightConfig(i).rwyLength > port.getRwyLength())
                valid = false;
            if (craft.getFlightConfig(i).firmSurface && !port.hasFirmSurface())
                valid = false;
            if (valid && config < 0) {
                config = i;
            }
            else if (valid && (craft.getFlightConfig(i).weight > craft.getFlightConfig(config).weight)) {
                config = i;
            }
        }
        return config;
    };
    SimCargoController.updateUi = function (mode) {
        switch (mode) {
            case "j":
            case "J":
            case "jobs":
                short.byId("scTitleCon").innerText = "Job List";
                short.clearChildren(short.byId("scListCon"));
                for (var i = 0; i < 10; i++) {
                    SimCargoController.addToUiList("c" + i.toString(), "left", "mid", "right", true);
                }
                SimCargoController.setBtns("leftONE", "rightTWO");
                SimCargoController.uiMode = "j";
                break;
        }
    };
    SimCargoController.listHandler = function (event) {
        var elem = event.target;
        var index = -1;
        if (elem.id[0] === "c") {
            index = parseInt(elem.id.substring(1));
        }
        else if (elem.parentElement.id[0] === "c") {
            index = parseInt(elem.parentElement.id.substring(1));
        }
        if (index < 0)
            return;
        switch (SimCargoController.uiMode) {
            case 'j':
                console.log("Job index = " + index.toString());
                break;
        }
    };
    SimCargoController.newGame = function (loc, craft) {
        if (loc === void 0) { loc = ""; }
        if (craft === void 0) { craft = ""; }
        SimCargoController.cargoCrafts[2].buy();
        SimCargoController.money = 30000;
        var startingPort = Math.floor(Math.random() * SimCargoController.cargoPorts.length);
        while (SimCargoController.checkPortViability(SimCargoController.cargoPorts[startingPort], SimCargoController.cargoCrafts[2]) === -1) {
            startingPort = Math.floor(Math.random() * SimCargoController.cargoPorts.length);
        }
        SimCargoController.currentAirport = SimCargoController.cargoPorts[startingPort];
        SimCargoController.generateJobs();
    };
    SimCargoController.init = function () {
        SimCargoController.uiMode = "x";
        SimCargoController.cargoPorts = [];
        SimCargoController.cargoCrafts = [];
        SimCargoController.fudge = 1.15;
        SimCargoController.pilotWgt = 170;
        SimCargoController.portFiles = ["us"];
        SimCargoController.craftFiles = ["C208", "C172", "C152", "XCub"];
        SimCargoController.tempIndex = 0;
        short.byId("scListCon").addEventListener("click", SimCargoController.listHandler);
        SimCargoController.parseAirportsFile();
    };
    return SimCargoController;
}());
var CargoPort = (function () {
    function CargoPort(port) {
        var props = port.split(",");
        this.name = props[0];
        this.alt = parseInt(props[1]);
        this.minRwyLength = parseInt(props[2]);
        this.fullILS = (props[3] === "y");
        this.location = {
            lat: parseFloat(props[4]),
            long: parseFloat(props[5])
        };
        this.firmSurface = (props[6] === "y");
        this.accomodatesAircraftUptoSize = props[7];
    }
    CargoPort.prototype.getLat = function () {
        return this.location.lat;
    };
    CargoPort.prototype.getLong = function () {
        return this.location.long;
    };
    CargoPort.prototype.getAlt = function () {
        return this.alt;
    };
    CargoPort.prototype.getRwyLength = function () {
        return this.minRwyLength;
    };
    CargoPort.prototype.hasFirmSurface = function () {
        return this.firmSurface;
    };
    CargoPort.prototype.getSupportedSizeAsNum = function () {
        switch (this.accomodatesAircraftUptoSize) {
            case "s":
                return 0;
            case "m":
                return 1;
            case "b":
                return 2;
        }
    };
    CargoPort.prototype.withinLatLimits = function (lowerLat, upperLat) {
        if (this.location.lat > upperLat)
            return false;
        if (this.location.lat < lowerLat)
            return false;
        return true;
    };
    CargoPort.prototype.withinLongLimits = function (lowerLong, upperLong) {
        if (this.location.long <= upperLong && this.location.long >= lowerLong)
            return true;
        if (upperLong >= 180) {
            upperLong = upperLong - 360;
            console.log("new upper = " + upperLong);
            if (this.location.long <= upperLong)
                return true;
        }
        if (lowerLong <= -180) {
            lowerLong = 360 + lowerLong;
            console.log("new lower = " + lowerLong);
            if (this.location.long >= lowerLong)
                return true;
        }
        return false;
    };
    return CargoPort;
}());
var CargoCraft = (function () {
    function CargoCraft(n, t, eW, mS, cD, mA, estLbs, emergencyL) {
        this.name = n;
        this.size = t;
        this.emptyWgt = eW;
        this.maxSpd = mS;
        this.costUsd = cD;
        this.maxAlt = mA;
        this.estLbsPerNM = estLbs;
        this.emergencyLbs = emergencyL;
        this.cargoSlots = [];
        this.flightConfigs = [];
        this.totalCargoCapacity = 0;
        this.isOwned = false;
    }
    CargoCraft.prototype.buy = function () {
        this.isOwned = true;
    };
    CargoCraft.prototype.sell = function () {
        this.isOwned = false;
    };
    CargoCraft.prototype.getIsOwned = function () {
        return this.isOwned;
    };
    CargoCraft.prototype.getEmptyWgt = function () {
        return this.emptyWgt;
    };
    CargoCraft.prototype.getCargoCapacity = function () {
        return this.totalCargoCapacity;
    };
    CargoCraft.prototype.getFuelRate = function () {
        return this.estLbsPerNM;
    };
    CargoCraft.prototype.getEmergencyFuelReq = function () {
        return this.emergencyLbs;
    };
    CargoCraft.prototype.addCargoSlot = function (n, c) {
        this.cargoSlots.push({ name: n, capacity: c });
        this.totalCargoCapacity += c;
    };
    CargoCraft.prototype.addFlightConfig = function (w, a, l, f) {
        this.flightConfigs.push({ weight: w, altitude: a, rwyLength: l, firmSurface: f });
    };
    CargoCraft.prototype.getFlightConfig = function (index) {
        return this.flightConfigs[index];
    };
    CargoCraft.prototype.getMaxTakeoffWgt = function () {
        var weight = 0;
        for (var i = 0; i < this.flightConfigs.length; i++) {
            if (this.flightConfigs[i].weight > weight)
                weight = this.flightConfigs[i].weight;
        }
        return weight;
    };
    CargoCraft.prototype.getNumFlightConfigs = function () {
        return this.flightConfigs.length;
    };
    CargoCraft.prototype.getSizeAsNum = function () {
        switch (this.size) {
            case "s":
                return 0;
            case "m":
                return 1;
            case "b":
                return 2;
        }
    };
    return CargoCraft;
}());
//# sourceMappingURL=func.js.map