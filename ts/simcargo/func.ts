class SimCargoController {
    private static cargoPorts: CargoPort[];
    private static cargoCrafts: CargoCraft[];
    private static fudge: number;
    private static pilotWgt: number;
    private static portFiles: string[];
    private static craftFiles: string[];
    private static tempIndex: number;
    private static uiMode: string = 'x';

    private static currentAirport: CargoPort;
    private static money: number;
    private static jobs: CargoJob[];
    private static validAircraft: CargoCraft[];
    private static nearbyAirports: CargoPort[];
    private static selectedJob:CargoJob;


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

        console.log("loading /fs/ports/" + SimCargoController.portFiles[SimCargoController.tempIndex] + ".dat ...");
        SimCargoController.getFile("/fs/ports/" + SimCargoController.portFiles[SimCargoController.tempIndex] + ".dat", true);
        SimCargoController.tempIndex++;
    }

    static parseCraftFile() {
        if (SimCargoController.tempIndex === SimCargoController.craftFiles.length) {
            SimCargoController.tempIndex = 0;
            SimCargoController.finishDataLoad();
            return;
        };

        console.log("loading /fs/craft/" + SimCargoController.craftFiles[SimCargoController.tempIndex] + ".dat ...")
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
            parseInt(props[7]),
            parseInt(props[8])
        ));
        
        let numSlots = parseInt(props[9]);

        for (let i = 0; i < numSlots; i++) {
            SimCargoController.cargoCrafts[index].addCargoSlot(props[10 + i*2], parseInt(props[11 + i*2]));
        }

        let offset = 10 + numSlots*2;
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

        return Math.floor(c * 3440.1 * SimCargoController.fudge);
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
        return Math.floor(dist*craft.getFuelRate() + craft.getEmergencyFuelReq());
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

    static addToUiList(id:string, l:string, c:string, r:string, selectable: boolean, margins:string = "a") {
        // populate list
        let elemHandle = short.create("div", id, ["scList__item"]);
        if (selectable) elemHandle.classList.add("scList__item--hl");
        switch(margins) {
            case "b":
                elemHandle.classList.add("scList__item--bottomMarginsOnly");
                break;
            case "n":
                elemHandle.classList.add("scList__item--noMargins");
                break;
            case "t":
                elemHandle.classList.add("scList__item--topMarginsOnly");
                break;
        }

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

    static generateCargoWeight(craft: CargoCraft) {
        let lowerBoundWgt = 0;
        if (craft.getCargoCapacity() >= 1000) lowerBoundWgt = 600;
        else if (craft.getCargoCapacity() >= 600) lowerBoundWgt = 400;
        else lowerBoundWgt = 250;

        let cargoWgt = Math.floor(Math.random() * Math.min(lowerBoundWgt + 1, craft.getCargoCapacity() + 1) / 50);
        cargoWgt = cargoWgt * 50;
        return Math.max(20, cargoWgt);
    }

    static getMaxRange(craft:CargoCraft, cargoWgt:number = 0, config:number = -5) {
        let wgt = craft.getEmptyWgt() + SimCargoController.pilotWgt + cargoWgt;

        if (config > -5) {
            wgt = craft.getFlightConfig(config).weight - wgt;
        } else {
            wgt = craft.getMaxTakeoffWgt() - wgt;
        }

        wgt = Math.min(wgt, craft.getMaxFuel());

        wgt -= craft.getEmergencyFuelReq();

        wgt /= craft.getFuelRate();

        return Math.floor(wgt);

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

    static buildValidAircraft(port: CargoPort) {
        for (let i = 0; i < SimCargoController.cargoCrafts.length; i++) {
            if (SimCargoController.cargoCrafts[i].getIsOwned() && SimCargoController.checkPortViability(port, SimCargoController.cargoCrafts[i]) > -1 && SimCargoController.checkPortViability(SimCargoController.currentAirport, SimCargoController.cargoCrafts[i]) > -1) {
                if (SimCargoController.getMaxRange(SimCargoController.cargoCrafts[i]) * 2.8 > SimCargoController.getDistanceBetweenPorts(port, SimCargoController.currentAirport)) SimCargoController.validAircraft.push(SimCargoController.cargoCrafts[i]);
            }

        }
    }

    static plotRoute(craft:CargoCraft, wgt: number, job:CargoJob, portA: CargoPort = SimCargoController.currentAirport, portB:CargoPort = job.endingAt):boolean {
        if (job.flights.length >= 3) return false;

        let via = SimCargoController.checkPortViability(portA, craft);

        if (SimCargoController.getDistanceBetweenPorts(portA, portB) <= SimCargoController.getMaxRange(craft, wgt, via)) {
            job.addFlight(portA, portB, via);
            return true;
        }
        else {
            let distanceToTarget = 0;
            let bestIndex = -1;

            for (let i = 0; i < SimCargoController.nearbyAirports.length; i++) {
                if (SimCargoController.checkPortViability(SimCargoController.nearbyAirports[i], craft) > -1
                && SimCargoController.getDistanceBetweenPorts(portA, SimCargoController.nearbyAirports[i]) <= SimCargoController.getMaxRange(craft, wgt, via)
                && SimCargoController.nearbyAirports[i] !== portB
                && SimCargoController.nearbyAirports[i] !== portA) {

                    let tempDist = SimCargoController.getDistanceBetweenPorts(portB, SimCargoController.nearbyAirports[i]);
                    if (distanceToTarget === 0 || tempDist < distanceToTarget) {
                        distanceToTarget = tempDist;
                        bestIndex = i;
                    } 

                }
            }

            if (bestIndex<0) {
                return false;
            }

            job.addFlight(portA, SimCargoController.nearbyAirports[bestIndex], via);

            return SimCargoController.plotRoute(craft, wgt, job, SimCargoController.nearbyAirports[bestIndex], portB);
        }
    }

    static generateJobs(){
        SimCargoController.jobs = [];

        let jobRangeLimit = SimCargoController.getMaxRangeFromCurrentPort() * 2.8;

        let minLat = SimCargoController.currentAirport.getLat() - SimCargoController.estimateDistanceLatLimit(jobRangeLimit);
        let maxLat = SimCargoController.currentAirport.getLat() + SimCargoController.estimateDistanceLatLimit(jobRangeLimit);

        let minLong = SimCargoController.currentAirport.getLong() - SimCargoController.estimateDistanceLongLimit(jobRangeLimit, SimCargoController.currentAirport.getLat());
        let maxLong = SimCargoController.currentAirport.getLong() + SimCargoController.estimateDistanceLongLimit(jobRangeLimit, SimCargoController.currentAirport.getLat());

        SimCargoController.nearbyAirports = [];

        for (let i = 0; i < SimCargoController.cargoPorts.length; i++) {
            if (SimCargoController.cargoPorts[i].withinLatLimits(minLat, maxLat))  {
                if (SimCargoController.cargoPorts[i].withinLongLimits(minLong, maxLong)) {
                    if (SimCargoController.getDistanceBetweenPorts(SimCargoController.currentAirport, SimCargoController.cargoPorts[i]) < jobRangeLimit
                    && SimCargoController.cargoPorts[i] !== SimCargoController.currentAirport) SimCargoController.nearbyAirports.push(SimCargoController.cargoPorts[i]);
                }                
            }
        }

        let abort = false;
        let counter = 0;
        for (let i = 0; i < 12 && !abort; i++) {
            if (counter > 20 || SimCargoController.nearbyAirports.length<1) {
                console.log("Could not begin from " + SimCargoController.currentAirport.getCode() + ", going retry from another port...");
                abort = true;
            } else {
            counter++;

            SimCargoController.validAircraft = [];
            // generate job
            let valid = true;

            let target = short.ranElem(SimCargoController.nearbyAirports);
            while (SimCargoController.getDistanceBetweenPorts(SimCargoController.currentAirport, target) < 50) {
                target = short.ranElem(SimCargoController.nearbyAirports);
            }

            SimCargoController.buildValidAircraft(target);
            if (SimCargoController.validAircraft.length > 0) {
                let tCraft = short.ranElem(SimCargoController.validAircraft);

                let cargoWgt = SimCargoController.generateCargoWeight(tCraft); // generate cargo weight after choosing the aircraft, using valid aircraft

                SimCargoController.jobs.push(new CargoJob(tCraft, target, cargoWgt));

                if (!SimCargoController.plotRoute(tCraft, cargoWgt, SimCargoController.jobs[i])) {
                    SimCargoController.jobs.pop();
                    valid = false;
                }else {
                    SimCargoController.jobs[i].calculatePay();
                }
            } else {
                valid = false;
            }

            if (!valid) {
                i--;
            } else {
                counter = 0;
            }
        }
        }
        
        return abort;
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
                short.byId("scTitleConL").innerText = "Current Aiport: " + SimCargoController.currentAirport.getCode();
                short.byId("scTitleConC").innerText = "Available Jobs";
                short.byId("scTitleConR").innerText = "Balance: $" + short.formatNumberWithCommas(SimCargoController.money);

                short.clearChildren(short.byId("scListCon"));

                // populate list
                for (let i = 0; i < SimCargoController.jobs.length; i++) {
                    SimCargoController.addToUiList("c" + i.toString(), "Deliver " + SimCargoController.jobs[i].cargoWgt + "lb to " + SimCargoController.jobs[i].endingAt.getCode(), "Distance: " + short.formatNumberWithCommas(SimCargoController.jobs[i].getDist()) + "NM", "pays $" + short.formatNumberWithCommas(SimCargoController.jobs[i].pay), true);
                }

                // add buttons
                SimCargoController.setBtns("leftONE", "rightTWO");

                SimCargoController.uiMode = "j";
                break;

            case "f":
                short.byId("scTitleConL").innerText = "Current Aiport: " + SimCargoController.currentAirport.getCode();
                short.byId("scTitleConC").innerText = "View Job";
                short.byId("scTitleConR").innerText = "Balance: $" + short.formatNumberWithCommas(SimCargoController.money);

                short.clearChildren(short.byId("scListCon"));

                SimCargoController.addToUiList("ctitle", "Deliver " + SimCargoController.selectedJob.cargoWgt + "lb to " + SimCargoController.selectedJob.endingAt.getCode(), "Distance: " + short.formatNumberWithCommas(SimCargoController.selectedJob.getDist()) + "NM", "pays $" + short.formatNumberWithCommas(SimCargoController.selectedJob.pay), false);

                SimCargoController.addToUiList("ccraft", SimCargoController.selectedJob.craft.getName(), "Max. altitude: " + short.formatNumberWithCommas(SimCargoController.selectedJob.craft.getMaxAlt()) + "ft", "Empty Weight: " + SimCargoController.selectedJob.craft.getEmptyWgt(), false);

                for (let i = 0; i < SimCargoController.selectedJob.flights.length; i++) {
                    SimCargoController.addToUiList("cf" + i.toString(), "------------------", "----------- FLIGHT " + (i+1).toString() + "/" + SimCargoController.selectedJob.flights.length.toString() + " -----------", "------------------", false, "t");
                    SimCargoController.addToUiList("ct" + i.toString(), "Take-off from " + SimCargoController.selectedJob.flights[i].origin.getCode(), "Location: " + SimCargoController.selectedJob.flights[0].origin.getLat().toPrecision(3) + ", " + SimCargoController.selectedJob.flights[0].origin.getLong().toPrecision(4), "Max. safe T-O weight: " + SimCargoController.selectedJob.craft.getFlightConfig(SimCargoController.selectedJob.flights[i].config).weight + "lb", false, "n");
                    SimCargoController.addToUiList("cwe" + i.toString(), "Pilot Weight: " + SimCargoController.pilotWgt +"lb", "Cargo Weight: " + SimCargoController.selectedJob.cargoWgt+"lb", "Fuel Weight: " + SimCargoController.getFuelReq(SimCargoController.getDistanceBetweenPorts(
                        SimCargoController.selectedJob.flights[i].origin, SimCargoController.selectedJob.flights[i].destination), SimCargoController.selectedJob.craft).toString() +"lb", false, "n");

                    SimCargoController.addToUiList("cwt" + i.toString(), "", "Expected T-O Weight: " + SimCargoController.getReqWgt(SimCargoController.selectedJob.flights[i].origin, SimCargoController.selectedJob.flights[i].destination, SimCargoController.selectedJob.craft, SimCargoController.selectedJob.cargoWgt)+"lb", "", false, "n");

                    SimCargoController.addToUiList("cl" + i.toString(), "Land at " + SimCargoController.selectedJob.flights[i].destination.getCode(), "Location: " + SimCargoController.selectedJob.endingAt.getLat().toPrecision(3) + ", " + SimCargoController.selectedJob.endingAt.getLong().toPrecision(4), "", false, "b");
                }
                SimCargoController.uiMode = "f";
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
            case "j":
                SimCargoController.selectedJob = SimCargoController.jobs[index];
                SimCargoController.updateUi("f");
                break;
        }

    }

    static newGame(loc: string = "", craft: string = "") {
        let startingCraft = 2; //Cessna 152
        SimCargoController.cargoCrafts[startingCraft].buy();

        SimCargoController.money = 15000;

        let startingPort = short.ranElem(SimCargoController.cargoPorts);

        //here
        while (SimCargoController.checkPortViability(startingPort, SimCargoController.cargoCrafts[startingCraft]) === -1) {
            startingPort = short.ranElem(SimCargoController.cargoPorts);
        }
        
        SimCargoController.currentAirport = startingPort;
        console.log("Starting new game from port " + SimCargoController.currentAirport.getCode());
        
        while(SimCargoController.generateJobs()){
            startingPort = short.ranElem(SimCargoController.cargoPorts);

            //here
            while (SimCargoController.checkPortViability(startingPort, SimCargoController.cargoCrafts[startingCraft]) === -1) {
                startingPort = short.ranElem(SimCargoController.cargoPorts);
            }

            SimCargoController.currentAirport = startingPort;
            console.log("Retrying from port " + SimCargoController.currentAirport.getCode());

        };
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

class CargoJob {
    public craft: CargoCraft;
    public flights: {origin:CargoPort, destination: CargoPort, config: number}[];
    public endingAt: CargoPort;
    public cargoWgt: number;
    public pay: number;

    constructor(c: CargoCraft, e: CargoPort, wgt: number) {
        this.craft = c;
        this.flights = [];

        this.endingAt = e;

        this.cargoWgt = wgt;

        // need to some code here to generate a type of cargo based on weight (e.g. 0 = rand{documents, the plane itself, etc}, 50 = rand{bananas, apples, etc.})

        // work out algorithm for pay/reward using current airport, endingAt, cargoWgt, etc...
        this.pay = 100;
    }

    addFlight(o: CargoPort, d: CargoPort, c: number) {
        this.flights.push({origin: o, destination:d, config: c});
    }

    getDist() {
        return SimCargoController.getDistanceBetweenPorts(this.flights[0].origin, this.flights[this.flights.length-1].destination);
    }

    calculatePay() {
        this.pay = this.getDist() * 18;
        this.pay *= (1 + this.flights.length/10);
        this.pay *= (1 + this.cargoWgt / 400);
        this.pay = this.pay + 1000 + this.cargoWgt;
        this.pay *= 4; // total balance modifier
        this.pay = Math.floor(this.pay);
    }
}

class CargoPort {
    private code: string;
    private alt: number;
    private minRwyLength: number;
    private fullILS: boolean;
    private location: {lat: number, long: number};
    private firmSurface: boolean;
    private accomodatesAircraftUptoSize: string;

    constructor(port: string) {
        var props = port.split(",");

        this.code = props[0];
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

    public getCode() {
        return this.code;
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
    private fuelCapacity: number;
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
        emergencyL: number, fc: number) {

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

    public getMaxFuel(){
        return this.fuelCapacity;
    }
    public getName() {
        return this.name;
    }

    public getMaxAlt() {
        return this.maxAlt;
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