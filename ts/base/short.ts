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