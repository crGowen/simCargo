var short = {
    h: document.head,
    b: document.body,
    create: function (type, id, classes) {
        var c = document.createElement(type);
        if (id.length > 0) {
            c.id = id;
        }
        for (var i = 0; i < classes.length; i++) {
            c.classList.add(classes[i]);
        }
        return c;
    },
    byId: function (name) { return document.getElementById(name); },
    byClass: function (clname) { return document.getElementsByClassName(clname); },
    del: function (elem) { if (elem)
        elem.parentNode.removeChild(elem); },
    formatNumberWithCommas: function (num) {
        var str = num.toString();
        for (var i = str.length - 3; i > 0; i -= 3) {
            str = str.substring(0, i) + "," + str.substring(i);
        }
        return str;
    },
    ranFlo: function (start, end) {
        return Math.random() * (end - start) + start;
    },
    ranInt: function (start, end) {
        return Math.floor(Math.random() * (end - start)) + start;
    },
    ranElem: function (arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },
    clearChildren: function (elem) {
        while (elem.childNodes.length > 0) {
            elem.removeChild(elem.childNodes[0]);
        }
    },
    checkForMobile: function () {
        var regex = /Mobi|Android/i;
        return regex.test(navigator.userAgent);
    }
};
//# sourceMappingURL=short.js.map