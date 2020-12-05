class SimCargoController {
    private static cargoPorts: CargoPort[];
    private static cargoCrafts: CargoCraft[];
    private static fudge: number;
    private static pilotWgt: number;
    private static portFiles: string[];
    private static craftFiles: string[];
    private static tempIndex: number;
    private static uiMode: string;

    private static currentAirport: CargoPort; // numbers to represent indexes
    private static money: number;


    static getFile(file:string, ports:boolean) {
        var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = () => {
            if (xhr.readyState == 4) {
                if (xhr.status!=200) {
                    console.error("Request status = " + xhr.status);
                } else {
                    if (ports) {
                        SimCargoController.appendNewPorts(SimCargoController.cleanInput(xhr.responseText));
                    } else {
                        SimCargoController.appendNewCraft(SimCargoController.cleanInput(xhr.responseText));
                    }
                }                
            }
        }
        xhr.overrideMimeType("text/plain");

        xhr.open("GET", file, true);

        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

        xhr.send(null);
    }

    static cleanInput(str:string) {
        let newStr = "";

        for (let i = 0; i < str.length; i++) {
            switch(str.charAt(i)) {
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
    }

    static parseAirportsFile() {
        if (SimCargoController.tempIndex === SimCargoController.portFiles.length) {
            SimCargoController.tempIndex = 0;
            SimCargoController.parseCraftFile();
            return;
        };
        SimCargoController.getFile("/fs/ports/" + SimCargoController.portFiles[SimCargoController.tempIndex] + ".dat", true);
        SimCargoController.tempIndex++;
    }

    static parseCraftFile() {
        if (SimCargoController.tempIndex === SimCargoController.craftFiles.length) {
            SimCargoController.tempIndex = 0;
            SimCargoController.finishDataLoad();
            return;
        };

        SimCargoController.getFile("/fs/craft/" + SimCargoController.craftFiles[SimCargoController.tempIndex] + ".dat", false);
        SimCargoController.tempIndex++;
    }   

    static appendNewPorts(ports:string) {
        var portList = ports.split(" ");
        
        for (let i = 1; i < portList.length; i++) {
            SimCargoController.cargoPorts.push(new CargoPort(portList[i]));
        }

        SimCargoController.parseAirportsFile();
    }

    static appendNewCraft(craft:string) {
        var index = SimCargoController.cargoCrafts.length;
        craft = craft.split("+")[1];
        var props = craft.split(",");

        SimCargoController.cargoCrafts.push(new CargoCraft(
            props[0],
            props[1],
            parseInt(props[2]),
            parseInt(props[3]),
            parseInt(props[4]),
            parseInt(props[5]),
            parseFloat(props[6]),
            parseInt(props[7])
        ));
        
        let numSlots = parseInt(props[8]);

        for (let i = 0; i < numSlots; i++) {
            SimCargoController.cargoCrafts[index].addCargoSlot(props[9 + i*2], parseInt(props[10 + i*2]));
        }

        let offset = 9 + numSlots*2;
        numSlots = parseInt(props[offset]);
        offset++;

        for (let i = 0; i < numSlots; i++) {
            SimCargoController.cargoCrafts[index].addFlightConfig(parseInt(props[offset + i*4]), parseInt(props[offset + i*4 + 1]), parseInt(props[offset + i*4 + 2]), (props[offset + i*4 + 3]==="y"));
        }
        
        SimCargoController.parseCraftFile();
    }

    static estimateDistanceLatLimit(dist:number){
        dist = dist / 3440.1;
        dist = dist / 2;
        dist = Math.tan(dist);
        dist = dist * dist;
        // find LAT movement
        let maxLat = 2 * Math.atan(Math.sqrt(dist));
        return maxLat * 180 / Math.PI;

    }

    static estimateDistanceLongLimit(dist:number, lat:number){
        dist = dist / 3440.1;
        dist = dist / 2;
        dist = Math.tan(dist);
        dist = dist * dist;
        // find LONG movement
        dist = dist / (dist + 1);
        dist = dist / Math.pow(Math.cos(lat * Math.PI / 180), 2);        
        let maxLong = 2 * Math.asin(Math.sqrt(dist));
        return maxLong * 180 / Math.PI;

    }

    static getDistanceBetweenPorts(portA:CargoPort, portB:CargoPort) {
        var deltaLat = Math.abs(portA.getLat() - portB.getLat());
        var deltaLong = Math.abs(portA.getLong() - portB.getLong());

        if (deltaLong===0) deltaLong = 0.1;

        // Haversine
        let a = Math.pow(Math.sin(deltaLat / 360 * Math.PI), 2);
        a += Math.cos(portA.getLat()/180 * Math.PI) * Math.cos(portB.getLat()/180 * Math.PI) * Math.pow(Math.sin(deltaLong / 360 * Math.PI), 2);

        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return c * 3440.1 * SimCargoController.fudge;
    }

    static generateDistancesList(port:CargoPort) {
        var dList:{distance: number, cargoPort: CargoPort}[] = [];

        for (let i = 0; i < SimCargoController.cargoPorts.length; i++) {
            if (SimCargoController.cargoPorts[i] !== port) {
                dList.push({
                    distance: SimCargoController.getDistanceBetweenPorts(port, SimCargoController.cargoPorts[i]),
                    cargoPort: SimCargoController.cargoPorts[i]
                });
            }
        }

        console.log(dList);
    }

    static getFuelReq(dist:number, craft:CargoCraft) {
        return dist*craft.getFuelRate() + craft.getEmergencyFuelReq();
    }

    static getReqWgt(portA:CargoPort, portB:CargoPort, craft:CargoCraft, cargoWgt: number) {
        let totalWgt = craft.getEmptyWgt() + cargoWgt + SimCargoController.pilotWgt;
        totalWgt+= SimCargoController.getFuelReq(SimCargoController.getDistanceBetweenPorts(portA, portB), craft);
        return totalWgt;
    }

    static finishDataLoad() {
        SimCargoController.newGame();
        SimCargoController.updateUi("j");
    }

    static lBtnClick(){
        switch (SimCargoController.uiMode) {
            case 'j':
                break;
        }
    }

    static rBtnClick(){
        switch (SimCargoController.uiMode) {
            case 'j':
                break;
        }
    }

    static addToUiList(id:string, l:string, c:string, r:string, selectable: boolean) {
        // populate list
        let elemHandle = short.create("div", id, ["scList__item"]);
        if (selectable) elemHandle.classList.add("scList__item--hl");

        let textHandle = short.create("div", "", ["scList__text", "scList__text--left"]);
        textHandle.innerText = l;
        elemHandle.appendChild(textHandle);

        textHandle = short.create("div", "", ["scList__text", "scList__text--center"]);
        textHandle.innerText = c;
        elemHandle.appendChild(textHandle);

        textHandle = short.create("div", "", ["scList__text", "scList__text--right"]);
        textHandle.innerText = r;
        elemHandle.appendChild(textHandle);

        short.byId("scListCon").appendChild(elemHandle);
    }

    static setBtns(leftBtn: string, rightBtn: string){
        if (leftBtn) short.byId("scLBtn").innerText = leftBtn;
        if (rightBtn) short.byId("scRBtn").innerText = rightBtn;
    }

    static generateCargoWeight() {
        let maxWeight = 0;
        for (let i = 0; i < SimCargoController.cargoCrafts.length; i++) {
            if (SimCargoController.cargoCrafts[i].getIsOwned()) {
                if (SimCargoController.cargoCrafts[i].getCargoCapacity() > maxWeight) maxWeight = SimCargoController.cargoCrafts[i].getCargoCapacity();
            }
        }

        let wgtClass = "s";
        if (maxWeight >= 600) wgtClass = "h";
        if (maxWeight >= 1000) wgtClass = "m";

        let lowerBoundWgt = 0;
        switch(wgtClass) {
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

        let cargoWgt = Math.floor(Math.random() * Math.min(lowerBoundWgt, maxWeight) / 50);
        cargoWgt = cargoWgt * 50;
        return cargoWgt;
    }

    static getMaxRange(craft:CargoCraft) {
        let wgt = craft.getEmptyWgt() + SimCargoController.pilotWgt;

        wgt = craft.getMaxTakeoffWgt() - wgt;

        wgt -= craft.getEmergencyFuelReq();

        wgt /= craft.getFuelRate();

        return wgt;

    }

    static getMaxRangeFromCurrentPort() {
        let maxRange = 0;
        for (let i = 0; i < SimCargoController.cargoCrafts.length; i++) {
            if (SimCargoController.cargoCrafts[i].getIsOwned() && SimCargoController.checkPortViability(SimCargoController.currentAirport, SimCargoController.cargoCrafts[i]) > -1) {
                if (SimCargoController.getMaxRange(SimCargoController.cargoCrafts[i]) > maxRange) maxRange = SimCargoController.getMaxRange(SimCargoController.cargoCrafts[i]);
            }
        }

        return maxRange;
    }

    static generateJobs(){
        let jobRangeLimit = SimCargoController.getMaxRangeFromCurrentPort() * 2.5;
        let minLat = SimCargoController.currentAirport.getLat() - SimCargoController.estimateDistanceLatLimit(jobRangeLimit);
        let maxLat = SimCargoController.currentAirport.getLat() + SimCargoController.estimateDistanceLatLimit(jobRangeLimit);

        let minLong = SimCargoController.currentAirport.getLong() - SimCargoController.estimateDistanceLongLimit(jobRangeLimit, SimCargoController.currentAirport.getLat());
        let maxLong = SimCargoController.currentAirport.getLong() + SimCargoController.estimateDistanceLongLimit(jobRangeLimit, SimCargoController.currentAirport.getLat());

        var nearbyAirports:CargoPort[] = [];
        for (let i = 0; i < SimCargoController.cargoPorts.length; i++) {
            if (SimCargoController.cargoPorts[i].withinLatLimits(minLat, maxLat))  {
                if (SimCargoController.cargoPorts[i].withinLongLimits(minLong, maxLong)) {
                    if (SimCargoController.getDistanceBetweenPorts(SimCargoController.currentAirport, SimCargoController.cargoPorts[i]) < jobRangeLimit
                    && SimCargoController.cargoPorts[i] !== SimCargoController.currentAirport) nearbyAirports.push(SimCargoController.cargoPorts[i]);
                }                
            }
        }

        console.log(jobRangeLimit);
        console.log(SimCargoController.currentAirport);
        console.log(nearbyAirports);

        console.log(SimCargoController.generateCargoWeight());
    }

    static checkPortViability(port:CargoPort, craft:CargoCraft) {
        let config = -1;
        let valid = true;

        if (craft.getSizeAsNum() > port.getSupportedSizeAsNum()) return -1;

        for (let i = 0; i < craft.getNumFlightConfigs(); i++) {
            valid = true;
            if (craft.getFlightConfig(i).altitude < port.getAlt()) valid = false;
            if (craft.getFlightConfig(i).rwyLength > port.getRwyLength()) valid = false;
            if (craft.getFlightConfig(i).firmSurface && !port.hasFirmSurface()) valid = false;

            if (valid && config < 0) {
                config = i;
            } else if (valid && (craft.getFlightConfig(i).weight > craft.getFlightConfig(config).weight)) {
                config = i;
            }
        }

        return config;
    }

    static updateUi(mode:string) {
        switch(mode) {
            case "j":
            case "J":
            case "jobs":
                // title
                short.byId("scTitleCon").innerText = "Job List";

                short.clearChildren(short.byId("scListCon"));

                // populate list
                for (let i = 0; i < 10; i++) {
                    SimCargoController.addToUiList("c" + i.toString(), "left", "mid", "right", true);
                }

                // add buttons
                SimCargoController.setBtns("leftONE", "rightTWO");

                SimCargoController.uiMode = "j";
                break;
        }
    }

    static listHandler(event:Event) {
        let elem = event.target as Element;
        let index: number = -1;
        if(elem.id[0] === "c") {
            index = parseInt(elem.id.substring(1));
        } else if (elem.parentElement.id[0] === "c") {
            index = parseInt(elem.parentElement.id.substring(1));
        }

        if (index < 0) return;

        switch (SimCargoController.uiMode) {
            case 'j':
                console.log("Job index = " + index.toString());
                break;
        }

    }

    static newGame(loc: string = "", craft: string = "") {
        SimCargoController.cargoCrafts[2].buy();

        SimCargoController.money = 30000;

        let startingPort = Math.floor(Math.random() * SimCargoController.cargoPorts.length);

        while (SimCargoController.checkPortViability(SimCargoController.cargoPorts[startingPort], SimCargoController.cargoCrafts[2]) === -1) {
            startingPort = Math.floor(Math.random() * SimCargoController.cargoPorts.length);
        }
        
        SimCargoController.currentAirport = SimCargoController.cargoPorts[startingPort];
        
        SimCargoController.generateJobs();
    }

    static init() {
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
    }
}

class CargoPort {
    private name: string;
    private alt: number;
    private minRwyLength: number;
    private fullILS: boolean;
    private location: {lat: number, long: number};
    private firmSurface: boolean;
    private accomodatesAircraftUptoSize: string;

    constructor(port: string) {
        var props = port.split(",");

        this.name = props[0];
        this.alt = parseInt(props[1]);
        this.minRwyLength = parseInt(props[2]);
        this.fullILS = (props[3]==="y");
        this.location = {
            lat: parseFloat(props[4]),
            long: parseFloat(props[5])
        };
        this.firmSurface = (props[6]==="y");
        this.accomodatesAircraftUptoSize = props[7];
    }

    public getLat() {
        return this.location.lat;
    }

    public getLong() {
        return this.location.long;
    }

    public getAlt() {
        return this.alt;
    }

    public getRwyLength() {
        return this.minRwyLength;
    }

    public hasFirmSurface() {
        return this.firmSurface;
    }

    public getSupportedSizeAsNum() {
        switch(this.accomodatesAircraftUptoSize) {
            case "s":
                return 0;
            case "m":
                return 1;
            case "b":
                return 2;
        }
    }

    public withinLatLimits(lowerLat:number, upperLat:number) {
        if (this.location.lat > upperLat) return false;
        if (this.location.lat < lowerLat) return false;

        return true;
    }

    public withinLongLimits(lowerLong:number, upperLong:number) {
        if (this.location.long <= upperLong && this.location.long >= lowerLong) return true;

        if (upperLong >= 180) {
            upperLong = upperLong - 360;
            console.log("new upper = " + upperLong);
            if (this.location.long <= upperLong) return true;
        }

        if (lowerLong <= -180) {
            lowerLong = 360 + lowerLong;
            console.log("new lower = " + lowerLong);
            if (this.location.long >= lowerLong) return true;
        }

        return false;
    }
}

class CargoCraft {
    private isOwned: boolean;
    private name: string;
    private size: string;
    private emptyWgt: number;
    private maxSpd: number;
    private costUsd: number; 
    private maxAlt: number; 
    private estLbsPerNM: number; 
    private emergencyLbs: number; 
    private totalCargoCapacity: number;
    private cargoSlots: {name: string, capacity: number}[];
    private flightConfigs: {weight: number, altitude: number, rwyLength: number, firmSurface: boolean}[];

    constructor(n: string,
        t:string,
        eW: number,
        mS: number,
        cD: number,
        mA: number,
        estLbs: number,
        emergencyL: number) {

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

    public buy() {
        this.isOwned = true;
    }

    public sell() {
        this.isOwned = false;
    }

    public getIsOwned(){
        return this.isOwned;
    }

    public getEmptyWgt(){
        return this.emptyWgt;
    }

    public getCargoCapacity() {
        return this.totalCargoCapacity;
    }

    public getFuelRate() {
        return this.estLbsPerNM;
    }

    public getEmergencyFuelReq() {
        return this.emergencyLbs;
    }

    public addCargoSlot(n:string, c: number) {
        this.cargoSlots.push({name: n, capacity: c});
        this.totalCargoCapacity += c;
    }

    public addFlightConfig(w:number, a: number, l: number, f: boolean) {
        this.flightConfigs.push({weight: w, altitude: a, rwyLength: l, firmSurface: f});
    }

    public getFlightConfig(index: number) {
        return this.flightConfigs[index];
    }

    public getMaxTakeoffWgt() {
        let weight = 0;
        for (let i = 0; i < this.flightConfigs.length; i++) {
            if (this.flightConfigs[i].weight > weight) weight = this.flightConfigs[i].weight;
        }

        return weight;
    }

    public getNumFlightConfigs() {
        return this.flightConfigs.length;
    }

    public getSizeAsNum() {
        switch(this.size) {
            case "s":
                return 0;
            case "m":
                return 1;
            case "b":
                return 2;
        }
    }
}