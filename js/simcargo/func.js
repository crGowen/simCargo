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
        console.log("loading /fs/ports/" + SimCargoController.portFiles[SimCargoController.tempIndex] + ".dat ...");
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
        console.log("loading /fs/craft/" + SimCargoController.craftFiles[SimCargoController.tempIndex] + ".dat ...");
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
        SimCargoController.cargoCrafts.push(new CargoCraft(props[0], props[1], parseInt(props[2]), parseInt(props[3]), parseInt(props[4]), parseInt(props[5]), parseFloat(props[6]), parseInt(props[7]), parseInt(props[8])));
        var numSlots = parseInt(props[9]);
        for (var i = 0; i < numSlots; i++) {
            SimCargoController.cargoCrafts[index].addCargoSlot(props[10 + i * 2], parseInt(props[11 + i * 2]));
        }
        var offset = 10 + numSlots * 2;
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
        var a = Math.pow(Math.sin(deltaLat / 360 * Math.PI), 2);
        a += Math.cos(portA.getLat() / 180 * Math.PI) * Math.cos(portB.getLat() / 180 * Math.PI) * Math.pow(Math.sin(deltaLong / 360 * Math.PI), 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.floor(c * 3440.1 * SimCargoController.fudge);
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
        return Math.floor(dist * craft.getFuelRate() + craft.getEmergencyFuelReq());
    };
    SimCargoController.getReqWgt = function (portA, portB, craft, cargoWgt) {
        var totalWgt = craft.getEmptyWgt() + cargoWgt + SimCargoController.pilotWgt;
        totalWgt += SimCargoController.getFuelReq(SimCargoController.getDistanceBetweenPorts(portA, portB), craft);
        return totalWgt;
    };
    SimCargoController.finishDataLoad = function () {
        if (SimCargoController.loadProgress()) {
            SimCargoController.generateJobs();
        }
        else {
            SimCargoController.newGame();
        }
        SimCargoController.updateUi("j");
    };
    SimCargoController.lBtnClick = function () {
        switch (SimCargoController.uiMode) {
            case "j":
                if (window.confirm("Are you sure you want to RESET all progress?")) {
                    localStorage.clear();
                    SimCargoController.newGame();
                    SimCargoController.updateUi("j");
                }
                break;
            case "f":
                SimCargoController.updateUi("j");
                break;
            case "p":
                if (SimCargoController.jUpdateRequired) {
                    SimCargoController.generateJobs();
                    SimCargoController.jUpdateRequired = false;
                }
                SimCargoController.updateUi("j");
                break;
        }
    };
    SimCargoController.rBtnClick = function () {
        switch (SimCargoController.uiMode) {
            case "j":
                SimCargoController.updateUi("p");
                break;
            case "f":
                SimCargoController.money += SimCargoController.selectedJob.pay;
                SimCargoController.currentAirport = SimCargoController.selectedJob.endingAt;
                SimCargoController.generateJobs();
                SimCargoController.updateUi("j");
                break;
            case "p":
                if (SimCargoController.selectedPlane) {
                    if (SimCargoController.selectedPlane.getIsOwned()) {
                        SimCargoController.money += SimCargoController.selectedPlane.getPrice();
                        SimCargoController.selectedPlane.sell();
                    }
                    else {
                        SimCargoController.money -= SimCargoController.selectedPlane.getPrice();
                        SimCargoController.selectedPlane.buy();
                    }
                    SimCargoController.jUpdateRequired = true;
                    SimCargoController.saveProgress();
                    SimCargoController.updateUi("p");
                }
                break;
        }
    };
    SimCargoController.addToUiList = function (id, l, c, r, selectable, addition) {
        if (addition === void 0) { addition = "a"; }
        var elemHandle = short.create("div", id, ["scList__item"]);
        if (selectable)
            elemHandle.classList.add("scList__item--hl");
        switch (addition) {
            case "b":
                elemHandle.classList.add("scList__item--bottomMarginsOnly");
                break;
            case "n":
            case "z":
                elemHandle.classList.add("scList__item--noMargins");
                break;
            case "t":
                elemHandle.classList.add("scList__item--topMarginsOnly");
                break;
            case "f":
                elemHandle.classList.add("sc--faded");
                break;
            case "p":
                elemHandle.classList.add("scList__item--purchased");
                break;
        }
        if (addition === "x" || addition === "z") {
            var textHandle = short.create("div", "", ["scList__text", "scList__text--full"]);
            textHandle.innerText = l;
            elemHandle.appendChild(textHandle);
        }
        else {
            var textHandle = short.create("div", "", ["scList__text", "scList__text--left"]);
            textHandle.innerText = l;
            elemHandle.appendChild(textHandle);
            textHandle = short.create("div", "", ["scList__text", "scList__text--center"]);
            textHandle.innerText = c;
            elemHandle.appendChild(textHandle);
            textHandle = short.create("div", "", ["scList__text", "scList__text--right"]);
            textHandle.innerText = r;
            elemHandle.appendChild(textHandle);
        }
        short.byId("scListCon").appendChild(elemHandle);
    };
    SimCargoController.setBtns = function (leftBtn, rightBtn) {
        if (leftBtn)
            short.byId("scLBtn").innerText = leftBtn;
        if (rightBtn)
            short.byId("scRBtn").innerText = rightBtn;
    };
    SimCargoController.generateCargoWeight = function (craft) {
        var lowerBoundWgt = 0;
        if (craft.getCargoCapacity() >= 2000)
            lowerBoundWgt = 1500;
        else if (craft.getCargoCapacity() >= 1000)
            lowerBoundWgt = 600;
        else if (craft.getCargoCapacity() >= 600)
            lowerBoundWgt = 400;
        else
            lowerBoundWgt = 250;
        var cargoWgt = Math.floor(Math.random() * Math.min(lowerBoundWgt + 1, craft.getCargoCapacity() + 1) / 50);
        cargoWgt = cargoWgt * 50;
        return Math.max(20, cargoWgt);
    };
    SimCargoController.getMaxRange = function (craft, cargoWgt, config) {
        if (cargoWgt === void 0) { cargoWgt = 0; }
        if (config === void 0) { config = -5; }
        var wgt = craft.getEmptyWgt() + SimCargoController.pilotWgt + cargoWgt;
        if (config > -5) {
            wgt = craft.getFlightConfig(config).weight - wgt;
        }
        else {
            wgt = craft.getMaxTakeoffWgt() - wgt;
        }
        wgt = Math.min(wgt, craft.getMaxFuel());
        wgt -= craft.getEmergencyFuelReq();
        wgt /= craft.getFuelRate();
        return Math.floor(wgt);
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
    SimCargoController.buildValidAircraft = function (port) {
        for (var i = 0; i < SimCargoController.cargoCrafts.length; i++) {
            if (SimCargoController.cargoCrafts[i].getIsOwned() && SimCargoController.checkPortViability(port, SimCargoController.cargoCrafts[i]) > -1 && SimCargoController.checkPortViability(SimCargoController.currentAirport, SimCargoController.cargoCrafts[i]) > -1) {
                if (SimCargoController.getMaxRange(SimCargoController.cargoCrafts[i]) * 2.8 > SimCargoController.getDistanceBetweenPorts(port, SimCargoController.currentAirport))
                    SimCargoController.validAircraft.push(SimCargoController.cargoCrafts[i]);
            }
        }
    };
    SimCargoController.plotRoute = function (craft, wgt, job, portA, portB) {
        if (portA === void 0) { portA = SimCargoController.currentAirport; }
        if (portB === void 0) { portB = job.endingAt; }
        if (job.flights.length >= 3)
            return false;
        var via = SimCargoController.checkPortViability(portA, craft);
        if (SimCargoController.getDistanceBetweenPorts(portA, portB) <= SimCargoController.getMaxRange(craft, wgt, via)) {
            job.addFlight(portA, portB, via);
            return true;
        }
        else {
            var distanceToTarget = 0;
            var bestIndex = -1;
            for (var i = 0; i < SimCargoController.nearbyAirports.length; i++) {
                if (SimCargoController.checkPortViability(SimCargoController.nearbyAirports[i], craft) > -1
                    && SimCargoController.getDistanceBetweenPorts(portA, SimCargoController.nearbyAirports[i]) <= SimCargoController.getMaxRange(craft, wgt, via)
                    && SimCargoController.nearbyAirports[i] !== portB
                    && SimCargoController.nearbyAirports[i] !== portA) {
                    var tempDist = SimCargoController.getDistanceBetweenPorts(portB, SimCargoController.nearbyAirports[i]);
                    if (distanceToTarget === 0 || tempDist < distanceToTarget) {
                        distanceToTarget = tempDist;
                        bestIndex = i;
                    }
                }
            }
            if (bestIndex < 0) {
                return false;
            }
            job.addFlight(portA, SimCargoController.nearbyAirports[bestIndex], via);
            return SimCargoController.plotRoute(craft, wgt, job, SimCargoController.nearbyAirports[bestIndex], portB);
        }
    };
    SimCargoController.generateJobs = function () {
        SimCargoController.saveProgress();
        SimCargoController.jobs = [];
        var jobRangeLimit = SimCargoController.getMaxRangeFromCurrentPort() * 2.8;
        var minLat = SimCargoController.currentAirport.getLat() - SimCargoController.estimateDistanceLatLimit(jobRangeLimit);
        var maxLat = SimCargoController.currentAirport.getLat() + SimCargoController.estimateDistanceLatLimit(jobRangeLimit);
        var minLong = SimCargoController.currentAirport.getLong() - SimCargoController.estimateDistanceLongLimit(jobRangeLimit, SimCargoController.currentAirport.getLat());
        var maxLong = SimCargoController.currentAirport.getLong() + SimCargoController.estimateDistanceLongLimit(jobRangeLimit, SimCargoController.currentAirport.getLat());
        SimCargoController.nearbyAirports = [];
        for (var i = 0; i < SimCargoController.cargoPorts.length; i++) {
            if (SimCargoController.cargoPorts[i].withinLatLimits(minLat, maxLat)) {
                if (SimCargoController.cargoPorts[i].withinLongLimits(minLong, maxLong)) {
                    if (SimCargoController.getDistanceBetweenPorts(SimCargoController.currentAirport, SimCargoController.cargoPorts[i]) < jobRangeLimit
                        && SimCargoController.cargoPorts[i] !== SimCargoController.currentAirport)
                        SimCargoController.nearbyAirports.push(SimCargoController.cargoPorts[i]);
                }
            }
        }
        var abort = false;
        var counter = 0;
        for (var i = 0; i < 6 && !abort; i++) {
            if (counter > 1250 || SimCargoController.nearbyAirports.length < 1) {
                console.log("No jobs available for any owned aircraft..." + counter);
                abort = true;
            }
            else {
                counter++;
                SimCargoController.validAircraft = [];
                var valid = true;
                var target = short.ranElem(SimCargoController.nearbyAirports);
                while (SimCargoController.getDistanceBetweenPorts(SimCargoController.currentAirport, target) < 50) {
                    target = short.ranElem(SimCargoController.nearbyAirports);
                }
                SimCargoController.buildValidAircraft(target);
                if (SimCargoController.validAircraft.length > 0) {
                    var tCraft = short.ranElem(SimCargoController.validAircraft);
                    var cargoWgt = SimCargoController.generateCargoWeight(tCraft);
                    SimCargoController.jobs.push(new CargoJob(tCraft, target, cargoWgt));
                    if (!SimCargoController.plotRoute(tCraft, cargoWgt, SimCargoController.jobs[i])) {
                        SimCargoController.jobs.pop();
                        valid = false;
                    }
                    else {
                        SimCargoController.jobs[i].calculatePay();
                    }
                }
                else {
                    valid = false;
                }
                if (!valid) {
                    i--;
                }
                else {
                    counter = 0;
                }
            }
        }
        if (abort) {
            SimCargoController.jobs = [];
        }
        return abort;
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
    SimCargoController.saveProgress = function () {
        localStorage.setItem("saveSet", "y");
        localStorage.setItem("currentPort", SimCargoController.currentAirport.getCode());
        localStorage.setItem("money", SimCargoController.money.toString());
        var bStr = "";
        for (var i = 0; i < SimCargoController.cargoCrafts.length; i++) {
            if (SimCargoController.cargoCrafts[i].getIsOwned())
                bStr = bStr + "y";
            else
                bStr = bStr + "n";
        }
        localStorage.setItem("ownedPlanes", bStr);
    };
    SimCargoController.loadProgress = function () {
        if (localStorage.getItem("saveSet") !== "y")
            return false;
        SimCargoController.currentAirport = SimCargoController.getPortByCode(localStorage.getItem("currentPort"));
        var ownerships = localStorage.getItem("ownedPlanes");
        for (var i = 0; i < SimCargoController.cargoCrafts.length; i++) {
            if (ownerships[i] === "y")
                SimCargoController.cargoCrafts[i].buy();
            else
                SimCargoController.cargoCrafts[i].sell();
        }
        SimCargoController.money = parseInt(localStorage.getItem("money"));
        return true;
    };
    SimCargoController.getPortByCode = function (code) {
        for (var i = 0; i < SimCargoController.cargoPorts.length; i++) {
            if (SimCargoController.cargoPorts[i].getCode() === code)
                return SimCargoController.cargoPorts[i];
        }
    };
    SimCargoController.updateUi = function (mode) {
        switch (mode) {
            case "j":
            case "J":
            case "jobs":
                short.byId("scTitleConL").innerText = "Current Aiport: " + SimCargoController.currentAirport.getCode();
                short.byId("scTitleConC").innerText = "Available Jobs";
                short.byId("scTitleConR").innerText = "Balance: $" + short.formatNumberWithCommas(SimCargoController.money);
                short.clearChildren(short.byId("scListCon"));
                if (SimCargoController.jobs.length === 0) {
                    SimCargoController.addToUiList("xNoJobsHere", "You own no aircraft capable of safely taking off from this airport.", "", "", false, "x");
                }
                for (var i = 0; i < SimCargoController.jobs.length; i++) {
                    SimCargoController.addToUiList("c" + i.toString(), "Deliver " + SimCargoController.jobs[i].cargoWgt + "lb to " + SimCargoController.jobs[i].endingAt.getCode(), "Distance: " + short.formatNumberWithCommas(SimCargoController.jobs[i].getDist()) + "NM", "pays $" + short.formatNumberWithCommas(SimCargoController.jobs[i].pay), true);
                }
                SimCargoController.setBtns("Reset Progress", "Planes");
                short.byId("scRBtn").classList.remove("sc--faded");
                SimCargoController.uiMode = "j";
                break;
            case "f":
                short.byId("scTitleConL").innerText = "Current Aiport: " + SimCargoController.currentAirport.getCode();
                short.byId("scTitleConC").innerText = "View Job";
                short.byId("scTitleConR").innerText = "Balance: $" + short.formatNumberWithCommas(SimCargoController.money);
                short.clearChildren(short.byId("scListCon"));
                SimCargoController.addToUiList("ctitle", "Deliver " + SimCargoController.selectedJob.cargoWgt + "lb to " + SimCargoController.selectedJob.endingAt.getCode(), "Distance: " + short.formatNumberWithCommas(SimCargoController.selectedJob.getDist()) + "NM", "pays $" + short.formatNumberWithCommas(SimCargoController.selectedJob.pay), false);
                SimCargoController.addToUiList("ccraft", SimCargoController.selectedJob.craft.getName(), "Max. altitude: " + short.formatNumberWithCommas(SimCargoController.selectedJob.craft.getMaxAlt()) + "ft", "Empty Weight: " + SimCargoController.selectedJob.craft.getEmptyWgt(), false, "p");
                if (SimCargoController.selectedJob.craft.getName() === "Cessna 152") {
                    SimCargoController.addToUiList("cnogpswarn", "Warning: the Cessna 152 does not have a GPS, you will need to plot a route with VFR and/or VOR/NDB navigation. Daytime flying recommended.", "", "", false, "x");
                }
                var ilsLine;
                for (var i = 0; i < SimCargoController.selectedJob.flights.length; i++) {
                    SimCargoController.addToUiList("cf" + i.toString(), "------------------", "----------- FLIGHT " + (i + 1).toString() + "/" + SimCargoController.selectedJob.flights.length.toString() + " -----------", "------------------", false, "t");
                    if (Math.abs(SimCargoController.selectedJob.flights[i].origin.getLat()) > 57.5 || Math.abs(SimCargoController.selectedJob.flights[i].destination.getLat()) > 57.5) {
                        SimCargoController.addToUiList("cicewarn", "Warning: This flight may involve polar regions, take care for icy conditions.", "", "", false, "z");
                    }
                    var longPres = 5;
                    if (Math.abs(SimCargoController.selectedJob.flights[0].origin.getLong()) >= 100)
                        longPres = 6;
                    SimCargoController.addToUiList("ct" + i.toString(), "Take-off " + SimCargoController.selectedJob.flights[i].origin.getCode() + ", " + SimCargoController.selectedJob.flights[i].origin.getAlt() + "ft", "Location: " + SimCargoController.selectedJob.flights[0].origin.getLat().toPrecision(5) + ", " + SimCargoController.selectedJob.flights[0].origin.getLong().toPrecision(longPres), "Max. T-O wgt: " + SimCargoController.selectedJob.craft.getFlightConfig(SimCargoController.selectedJob.flights[i].config).weight + "lb", false, "n");
                    SimCargoController.addToUiList("cwe" + i.toString(), "Pilot Weight: " + SimCargoController.pilotWgt + "lb", "Cargo Weight: " + SimCargoController.selectedJob.cargoWgt + "lb", "Fuel Weight: " + SimCargoController.getFuelReq(SimCargoController.getDistanceBetweenPorts(SimCargoController.selectedJob.flights[i].origin, SimCargoController.selectedJob.flights[i].destination), SimCargoController.selectedJob.craft).toString() + "lb", false, "n");
                    SimCargoController.addToUiList("cwt" + i.toString(), "", "Exp T-O Wgt: " + SimCargoController.getReqWgt(SimCargoController.selectedJob.flights[i].origin, SimCargoController.selectedJob.flights[i].destination, SimCargoController.selectedJob.craft, SimCargoController.selectedJob.cargoWgt) + "lb", "", false, "n");
                    if (Math.abs(SimCargoController.selectedJob.flights[0].destination.getLong()) >= 100)
                        longPres = 6;
                    else
                        longPres = 5;
                    ilsLine = "ILS landing unavailable";
                    if (SimCargoController.selectedJob.flights[i].destination.hasIls())
                        ilsLine = "ILS landing AVAILABLE";
                    SimCargoController.addToUiList("cl" + i.toString(), "Landing " + SimCargoController.selectedJob.flights[i].destination.getCode() + ", " + SimCargoController.selectedJob.flights[i].destination.getAlt() + "ft", "Location: " + SimCargoController.selectedJob.endingAt.getLat().toPrecision(5) + ", " + SimCargoController.selectedJob.endingAt.getLong().toPrecision(longPres), ilsLine, false, "b");
                }
                SimCargoController.setBtns("Back", "Complete Job");
                SimCargoController.uiMode = "f";
                break;
            case "p":
                short.byId("scTitleConL").innerText = "Current Aiport: " + SimCargoController.currentAirport.getCode();
                short.byId("scTitleConC").innerText = "Planes";
                short.byId("scTitleConR").innerText = "Balance: $" + short.formatNumberWithCommas(SimCargoController.money);
                short.clearChildren(short.byId("scListCon"));
                for (var i = 0; i < SimCargoController.cargoCrafts.length; i++) {
                    if (SimCargoController.cargoCrafts[i].getIsOwned()) {
                        SimCargoController.addToUiList("c" + i.toString(), SimCargoController.cargoCrafts[i].getName(), "OWNED", "$" + short.formatNumberWithCommas(SimCargoController.cargoCrafts[i].getPrice()), true, "p");
                    }
                    else {
                        if (SimCargoController.cargoCrafts[i].getPrice() > SimCargoController.money) {
                            SimCargoController.addToUiList("c" + i.toString(), SimCargoController.cargoCrafts[i].getName(), "NOT OWNED", "$" + short.formatNumberWithCommas(SimCargoController.cargoCrafts[i].getPrice()), false, "f");
                        }
                        else {
                            SimCargoController.addToUiList("c" + i.toString(), SimCargoController.cargoCrafts[i].getName(), "NOT OWNED", "$" + short.formatNumberWithCommas(SimCargoController.cargoCrafts[i].getPrice()), true);
                        }
                    }
                }
                SimCargoController.setBtns("Back", "Buy/Sell Selected");
                short.byId("scRBtn").classList.add("sc--faded");
                SimCargoController.selectedPlane = null;
                SimCargoController.uiMode = "p";
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
            case "j":
                SimCargoController.selectedJob = SimCargoController.jobs[index];
                SimCargoController.updateUi("f");
                break;
            case "p":
                if (SimCargoController.cargoCrafts[index].getIsOwned() || SimCargoController.money >= SimCargoController.cargoCrafts[index].getPrice()) {
                    if (SimCargoController.cargoCrafts[index] !== SimCargoController.selectedPlane) {
                        SimCargoController.selectedPlane = SimCargoController.cargoCrafts[index];
                        var tList = short.byClass("scList__item--selected");
                        while (tList.length > 0) {
                            tList[0].classList.remove("scList__item--selected");
                        }
                        short.byId("c" + index.toString()).classList.add("scList__item--selected");
                        short.byId("scRBtn").classList.remove("sc--faded");
                    }
                    if (SimCargoController.cargoCrafts[index].getIsOwned())
                        short.byId("scRBtn").innerText = "Sell Selected Plane";
                    else
                        short.byId("scRBtn").innerText = "Buy Selected Plane";
                }
                break;
        }
    };
    SimCargoController.newGame = function (loc, startingCraft) {
        if (loc === void 0) { loc = ""; }
        if (startingCraft === void 0) { startingCraft = 0; }
        for (var i = 0; i < SimCargoController.cargoCrafts.length; i++) {
            if (i === startingCraft)
                SimCargoController.cargoCrafts[i].buy();
            else
                SimCargoController.cargoCrafts[i].sell();
        }
        SimCargoController.money = 15000;
        var startingPort = short.ranElem(SimCargoController.cargoPorts);
        while (SimCargoController.checkPortViability(startingPort, SimCargoController.cargoCrafts[startingCraft]) === -1 && Math.abs(startingPort.getLat()) > 57.5) {
            startingPort = short.ranElem(SimCargoController.cargoPorts);
        }
        SimCargoController.currentAirport = startingPort;
        if (loc.length === 4)
            SimCargoController.currentAirport = SimCargoController.getPortByCode(loc);
        console.log("Starting new game from port " + SimCargoController.currentAirport.getCode());
        while (SimCargoController.generateJobs()) {
            startingPort = short.ranElem(SimCargoController.cargoPorts);
            while (SimCargoController.checkPortViability(startingPort, SimCargoController.cargoCrafts[startingCraft]) === -1 && Math.abs(startingPort.getLat()) > 57.5) {
                startingPort = short.ranElem(SimCargoController.cargoPorts);
            }
            SimCargoController.currentAirport = startingPort;
            console.log("Retrying from port " + SimCargoController.currentAirport.getCode());
        }
        ;
    };
    SimCargoController.getNearbyPorts = function (p, c) {
        var cfg = SimCargoController.checkPortViability(p, c);
        if (cfg < 0)
            return -1;
        var rangeLimit = Math.min(180, SimCargoController.getMaxRange(c, 50, cfg));
        var minLat = p.getLat() - SimCargoController.estimateDistanceLatLimit(rangeLimit);
        var maxLat = p.getLat() + SimCargoController.estimateDistanceLatLimit(rangeLimit);
        var minLong = p.getLong() - SimCargoController.estimateDistanceLongLimit(rangeLimit, p.getLat());
        var maxLong = p.getLong() + SimCargoController.estimateDistanceLongLimit(rangeLimit, p.getLat());
        var portsNear = 0;
        for (var i = 0; i < SimCargoController.cargoPorts.length; i++) {
            if (SimCargoController.cargoPorts[i].withinLatLimits(minLat, maxLat)) {
                if (SimCargoController.cargoPorts[i].withinLongLimits(minLong, maxLong)) {
                    if (SimCargoController.getDistanceBetweenPorts(p, SimCargoController.cargoPorts[i]) < rangeLimit
                        && SimCargoController.cargoPorts[i] !== p)
                        portsNear++;
                }
            }
        }
        return portsNear;
    };
    SimCargoController.testAllPorts = function (n) {
        console.log("The following ports may have LESS than two ports visitable with " + SimCargoController.cargoCrafts[n].getName());
        for (var i = 0; i < SimCargoController.cargoPorts.length; i++) {
            var x = SimCargoController.getNearbyPorts(SimCargoController.cargoPorts[i], SimCargoController.cargoCrafts[n]);
            if (x < 2 && x > -1)
                console.log(SimCargoController.cargoPorts[i].getCode() + " @ " + SimCargoController.cargoPorts[i].getAlt() + "ft");
        }
    };
    SimCargoController.init = function () {
        SimCargoController.uiMode = "x";
        SimCargoController.cargoPorts = [];
        SimCargoController.cargoCrafts = [];
        SimCargoController.selectedPlane = null;
        SimCargoController.fudge = 1.15;
        SimCargoController.pilotWgt = 170;
        SimCargoController.portFiles = ["us"];
        SimCargoController.craftFiles = ["C152", "XCub", "C172", "BBG36", "C208", "DA62", "BKA350", "TBM"];
        SimCargoController.tempIndex = 0;
        short.byId("scListCon").addEventListener("click", SimCargoController.listHandler);
        SimCargoController.parseAirportsFile();
    };
    SimCargoController.uiMode = 'x';
    SimCargoController.jUpdateRequired = false;
    return SimCargoController;
}());
var CargoJob = (function () {
    function CargoJob(c, e, wgt) {
        this.craft = c;
        this.flights = [];
        this.endingAt = e;
        this.cargoWgt = wgt;
        this.pay = 100;
    }
    CargoJob.prototype.addFlight = function (o, d, c) {
        this.flights.push({ origin: o, destination: d, config: c });
    };
    CargoJob.prototype.getDist = function () {
        return SimCargoController.getDistanceBetweenPorts(this.flights[0].origin, this.flights[this.flights.length - 1].destination);
    };
    CargoJob.prototype.calculatePay = function () {
        this.pay = this.getDist() * 18;
        this.pay *= (1 + this.flights.length / 10);
        this.pay *= (1 + this.cargoWgt / 400);
        this.pay = this.pay + 2500 + this.cargoWgt;
        this.pay *= 4;
        this.pay = Math.floor(this.pay);
    };
    return CargoJob;
}());
var CargoPort = (function () {
    function CargoPort(port) {
        var props = port.split(",");
        this.code = props[0];
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
    CargoPort.prototype.hasIls = function () {
        return this.fullILS;
    };
    CargoPort.prototype.getCode = function () {
        return this.code;
    };
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
            case "g":
                return 2;
            case "h":
                return 3;
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
    function CargoCraft(n, t, eW, mS, cD, mA, estLbs, emergencyL, fc) {
        this.name = n;
        this.size = t;
        this.emptyWgt = eW;
        this.maxSpd = mS;
        this.costUsd = cD;
        this.maxAlt = mA;
        this.estLbsPerNM = estLbs;
        this.emergencyLbs = emergencyL;
        this.fuelCapacity = fc;
        this.cargoSlots = [];
        this.flightConfigs = [];
        this.totalCargoCapacity = 0;
        this.isOwned = false;
    }
    CargoCraft.prototype.getMaxFuel = function () {
        return this.fuelCapacity;
    };
    CargoCraft.prototype.getName = function () {
        return this.name;
    };
    CargoCraft.prototype.getMaxAlt = function () {
        return this.maxAlt;
    };
    CargoCraft.prototype.buy = function () {
        this.isOwned = true;
    };
    CargoCraft.prototype.sell = function () {
        this.isOwned = false;
    };
    CargoCraft.prototype.getIsOwned = function () {
        return this.isOwned;
    };
    CargoCraft.prototype.getPrice = function () {
        return this.costUsd;
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
            case "g":
                return 2;
            case "h":
                return 3;
        }
    };
    return CargoCraft;
}());
//# sourceMappingURL=func.js.map