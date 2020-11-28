class SimCargoController {
    private static cargoPorts: CargoPort[];
    private static cargoCrafts: CargoCraft[];
    private static fudge: number;
    private static portFiles: string[];
    private static craftFiles: string[];


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
                    newStr += str.charAt(i);
                    break;
                case '_':
                    newStr += " ";
                    break;
            }
        }

        return newStr;
    }

    static parseAirportsFile(file:string) {
            SimCargoController.getFile(file, true);
    }

    static parseCraftFile(file:string) {
        SimCargoController.getFile(file, false);
}

    static appendNewPorts(ports:string) {
        var portList = ports.split(".");
        
        for (let i = 0; i < portList.length; i++) {
            if (portList[i].length === 13) SimCargoController.cargoPorts.push(new CargoPort(portList[i]));
        }
    }

    static appendNewCraft(craft:string) {
        var index = SimCargoController.cargoCrafts.length;
        var props = craft.split(".");

        SimCargoController.cargoCrafts.push(new CargoCraft(
            props[1],
            props[3],
            parseInt(props[2]),
            parseInt(props[4]),
            parseInt(props[5]),
            parseInt(props[6]),
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
            SimCargoController.cargoCrafts[index].addFlightConfig(parseInt(props[offset + i*3]), props[offset + i*3 + 1], props[offset + i*3 + 2]);
        }        
    }

    static getDistanceBetweenPorts(portA:CargoPort, portB:CargoPort) {
        var deltaLat = Math.abs(portA.getLat() - portB.getLat());
        var deltaLong = Math.abs(portA.getLong() - portB.getLong());

        if (deltaLong===0) deltaLong = 1;

        // Haversine
        let a = Math.pow(Math.sin(deltaLat / 360 * Math.PI), 2);
        a += Math.cos(portA.getLat()/180 * Math.PI) * Math.cos(portB.getLat()/180 * Math.PI) * Math.pow(Math.sin(deltaLong / 360 * Math.PI), 2);

        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return c * 3440.1 * SimCargoController.fudge;
    }

    static init() {
        SimCargoController.cargoPorts = [];
        SimCargoController.cargoCrafts = [];

        SimCargoController.fudge = 1.15;
        
        SimCargoController.portFiles = ["us"];
        SimCargoController.craftFiles = ["C208", "C172"];
        
        for (let i = 0; i < this.portFiles.length; i++) {
            SimCargoController.parseAirportsFile("/fs/ports/" + SimCargoController.portFiles[i] + ".dat");
        }

        for (let i = 0; i < this.craftFiles.length; i++) {
            SimCargoController.parseCraftFile("/fs/craft/" + SimCargoController.craftFiles[i] + ".dat");
        }
    }
}

class CargoPort {
    private name: string;
    private type: string;
    private alt: string;
    private position: {lat: number, long: number};

    constructor(raw: string) {
        this.name = raw.substr(0,4);
        this.type = raw.substr(4,1);
        this.alt = raw.substr(5,1);
        this.position = {
            lat: parseInt(raw.substr(6,3)),
            long: parseInt(raw.substr(9, 4))
        };
    }

    public displayInfo() {
        let size = "undef";
        let aRating = "undef";

        switch(this.type) {
            case 'h':
                size = "heavy";
                break;
            case 'r':
                size = "regional";
                break;
            case 's':
                size = "small";
                break;
            case 't':
                size = "tiny";
                break;
        }

        switch(this.alt) {
            case 'h':
                aRating = "high";
                break;
            case 'm':
                aRating = "medium";
                break;
            case 's':
                aRating = "near sea-level";
                break;
        }

        let buildStr = `${this.name}: ${size} sized aiport, at ${aRating} altitude, located at [${this.position.lat}, ${this.position.long}].`;
        console.log(buildStr);
    }

    public getLat() {
        return this.position.lat;
    }

    public getLong() {
        return this.position.long;
    }
}

class CargoCraft {
    private name: string;
    private type: string;
    private emptyWgt: number; // TENS of lb
    private maxSpd: number; // knots
    private costUsd: number; // THOUSANDS of dollars
    private maxAlt: number; // THOUSANDS of feet
    private estLbsPer100NM: number; // TENS of lb
    private emergencyLbs: number; // TENS of lb
    private cargoSlots: {name: string, capacity: number}[]; // capacity in lb
    private flightConfigs: {weight: number, port: string, alt: string}[]; // weight in TENS of lb

    constructor(n: string,
        t:string,
        eW: number,
        mS: number,
        cD: number,
        mA: number,
        estLbs: number,
        emergencyL: number) {

        this.name = n;
        this.type = t;
        this.emptyWgt = eW;
        this.maxSpd = mS;
        this.costUsd = cD;
        this.maxAlt = mA;
        this.estLbsPer100NM = estLbs;
        this.emergencyLbs = emergencyL;
        this.cargoSlots = [];
        this.flightConfigs = [];
    }

    public displayInfo() {
        let fType = "undef";

        switch(this.type) {
            case 'p':
                fType = "propeller";
                break;
            case 't':
                fType = "turboprop";
                break;
            case 's':
                fType = "small jet";
                break;
            case 'a':
                fType = "airliner";
                break;
        }

        let buildStr = `${this.name}: ${fType} craft\nEmpty Weight: ${this.emptyWgt}0lb\nMax Speed: ${this.maxSpd}kt\nMax Alt: ${this.maxAlt},000ft\nValue: ${this.costUsd},000USD\nFuel per 100NM: ${this.estLbsPer100NM}0lb\nEmergency Fuel: ${this.emergencyLbs}0lb`;
        console.log(buildStr);
        console.log("--- cargo slots ---")
        for (let i = 0; i < this.cargoSlots.length; i++) {
            console.log(this.cargoSlots[i].name + ": " + this.cargoSlots[i].capacity + "lb");
        }
        console.log("--- flight configs ---")
        for (let i = 0; i < this.flightConfigs.length; i++) {
            console.log("Max take off: " + this.flightConfigs[i].weight + "0lb ::: Airport Type: " + this.flightConfigs[i].port + " ::: Altitude: " + this.flightConfigs[i].alt);
        }
    }

    public addCargoSlot(n:string, c: number) {
        this.cargoSlots.push({name: n, capacity: c});
    }

    public addFlightConfig(w:number, portType: string, altRating: string) {
        this.flightConfigs.push({weight: w, port: portType, alt: altRating});
    }
}