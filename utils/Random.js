'use strict';

const _ = require('lodash');

class Random {

    static guid() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
        }
        return s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4();
    }

    static string(len, bits) {
        bits = bits || 36;
        let outStr = '';
        let newStr;
        while (outStr.length < len){
            newStr = Math.random().toString(bits).slice(2);
            outStr += newStr.slice(0, Math.min(newStr.length, (len - outStr.length)));
        }
        return outStr.toUpperCase();
    }

    static bool() {
        return Math.round(Math.random());
    }

}

module.exports = Random;
