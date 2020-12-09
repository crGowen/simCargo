// shorthand js function declarations

const short = {
    h: document.head,

    b: document.body,

    create: (type:string, id:string, classes:string[]) => {
        let c = document.createElement(type);

        if (id.length > 0) {
            c.id = id;
        }

        for (let i = 0; i < classes.length; i++) {
            c.classList.add(classes[i]);
        }

        return c;
    },

    byId: (name:string) => {return document.getElementById(name); },

    byClass: (clname:string) => {return document.getElementsByClassName(clname); },

    del: (elem:Element) => {if (elem) elem.parentNode.removeChild(elem); },

    formatNumberWithCommas: (num: number) => {
        let str = num.toString();
        for (let i = str.length - 3; i > 0; i-= 3) {
            str = str.substring(0, i) + "," + str.substring(i);
        }

        return str;
    },

    ranFlo: (start: number, end:number) => {
        return Math.random() * (end - start) + start;
    },

    ranInt: (start: number, end:number) => {
        return Math.floor(Math.random() * (end - start)) + start;
    },

    ranElem: (arr: any[]) => {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    clearChildren: (elem:Element) => {
        while (elem.childNodes.length > 0) {
            elem.removeChild(elem.childNodes[0]);
        }
    },

    checkForMobile: () => {
        var regex = /Mobi|Android/i;

        return regex.test(navigator.userAgent);
    }
}