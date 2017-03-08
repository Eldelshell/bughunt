const logger = require('winston');
const parser = require('accept-language-parser');
const _ = require('lodash');
const fs = require('fs');

const regExp = new RegExp(/\$\$(.*?)\$\$/);
// const esESTranslations = require('../_locales/es/messages.json');
const enUSTranslations = require('../_locales/en/messages.json');

let INSTANCE;

class Messages {

    constructor(){
        this.languages = ['en'];
    }

    static of(){
        if(!this[INSTANCE]){
            this[INSTANCE] = new Messages();
        }
        return this[INSTANCE];
    }

    /**
     * Simple name for getText method
     * @param {Object} req - Request object
     * @param {String} key - Key to retrieve its value
     * @param {String|Number} a - First value to replace
     * @param {String|Number} b - Second value to replace
     * @param {String|Number} c - Third value to replace
     * @return  {String} Value or ???key??? if empty
     */
    static get(req, key, a, b, c) {
        if(regExp.test(key)){
            key = key.replace(/\$/g,'');
        }
        const self = Messages.of();
        const lang = self._parseLanguageHeader(req);
        return key ? self._getText.apply(self, [lang, key, a, b, c]) : '???' + key + '???';
    }

    /**
     * Simple name for getText method
     * @param {String} lang - The language to use
     * @param {String} key - Key to retrieve its value
     * @param {String|Number} a - First value to replace
     * @param {String|Number} b - Second value to replace
     * @param {String|Number} c - Third value to replace
     * @return  {String} Value or ???key??? if empty
     */
    static getByLang(lang, key, a, b, c) {
        if(regExp.test(key)){
            key = key.replace(/\$/g,'');
        }
        const self = Messages.of();
        return key ? self._getText.apply(self, [lang, key, a, b, c]) : '???' + key + '???';
    }

    /**
     * Wrapper for _getText that, depending on the given number value, returns the .single or .plural
     * text. Used for counters like 1 Element (.single) or 2 Elements (.plural)
     * @param {Object} req - Request object
     * @param {String} key - Key to retrieve its value
     * @param {Number} value - Value to replace
     * @return {String} Value or ???key??? if empty
     */
    static plural(req, key, value) {
        const self = Messages.of();
        const lang = self._parseLanguageHeader(req);
        if(key && _.isInteger(value)){
            if(value === 1){
                key += '.single';
            }else if(value === 0){
                key += '.zero';
            }else{
                key += '.plural';
            }

            return self._getText.apply(self, [lang, key, value]);
        }

        return '???' + key + '???';
    }

    static getTranslations(req) {
        const self = Messages.of();
        const lang = self._parseLanguageHeader(req);
        if(!_.includes(self.languages, lang)){
            return enUSTranslations;
        }

        switch (lang) {
            // case 'es':  return esESTranslations;
            default:    return enUSTranslations;
        }
    }

    static getTemplate(req) {
        return new Promise(function(resolve, reject){
            const self = Messages.of();
            let lang = self._parseLanguageHeader(req);

            // Set default lang
            if(!_.includes(self.languages, lang)){
                lang = 'en';
            }

            fs.readFile(`./_locales/${lang}/template.md`, 'utf-8', function(err, data){
                if(err){
                    return reject();
                }

                resolve(data);
            });
        });
    }

    /*
     * Get the value for the key and  the current language or the key name
     * @return {String} Value or ???key??? if key doesn't exists
     */
    _getText() {
        const lang = arguments[0];
        const key = arguments[1];

        let text = this._getMessage(lang, key);
        if(!_.isString(text) || _.isEmpty(text)){
            return '???' + key + '???';
        }

        if(arguments.length > 1){
            for(let i = 1; i < arguments.length; i++) {
                if (arguments[i] !== undefined) {
                    const arg = arguments[i];
                    text = text.replace('%s', arg);
                }
            }
        }

        return text;
    }

    _getMessage(lang, key){
        let messages;
        switch (lang) {
            // case 'es':  messages = esESTranslations; break;
            default:    messages = enUSTranslations; break;
        }
        if(messages && messages[key]){
            return messages[key].message;
        }else{
            return null;
        }
    }

    _parseLanguageHeader(req) {
        // This is the default language
        let lang = this.languages[0];
        try {
            // Langs contains an array where the first element is the language with the highest priority
            // i.e. [{code: es, region: GB, quality: 1.0}]
            const langs = parser.parse(req.headers['accept-language']);
            lang = langs[0].code;
            // logger.debug(`Got accept-language ${lang}`);
        } catch (e) {
            logger.error('Failed to parse accept-language');
        }
        req.params.language = lang;
        return lang;
    }
}

Messages.of();

module.exports = Messages;
