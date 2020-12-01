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
    SimCargoController.init = function () {
        SimCargoController.cargoPorts = [];
        SimCargoController.cargoCrafts = [];
        SimCargoController.fudge = 1.15;
        SimCargoController.pilotWgt = 170;
        SimCargoController.portFiles = ["us"];
        SimCargoController.craftFiles = ["C208", "C172"];
        SimCargoController.tempIndex = 0;
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
    }
    CargoCraft.prototype.getEmptyWgt = function () {
        return this.emptyWgt;
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
    return CargoCraft;
}());
//# sourceMappingURL=func.js.map