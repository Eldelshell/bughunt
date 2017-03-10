const logger = require('winston');
const parser = require('accept-language-parser');
const _ = require('lodash');
const fs = require('fs');
const Moment = require('moment');

const regExp = new RegExp(/\$\$(.*?)\$\$/);

let INSTANCE;

/**
 * Singleton to handle translations. Supports plural, date & time, numbers.
 */
class Messages {

    constructor(){
        // Set at least one default
        this.languages = ['en'];
        this.load();
    }

    /**
     * Load the translations from the _locales folder.
     * @returns {Promise} resolves when all translations files have been loaded.
     */
    load() {
        return new Promise((resolve, reject) => {
            this.loadLanguages().then((langs) => {
                this.languages = langs;
                const promises = [];
                langs.forEach((lang) => {
                    promises.push(this.loadTranslation(lang));
                });

                Promise.all(promises).then((translations) => {
                    this.translations = translations;
                    logger.info('Loaded all translations');
                    resolve();
                });
            }).catch((err) => {
                reject();
            });
        });
    }

    /**
     * Load the translations file for the given language
     * @param {String} lang - the language to load
     * @returns {Promise<Object>} the promise of an object with the lang and messages for a translation.
     */
    loadTranslation(lang) {
        return new Promise((resolve, reject) => {
            fs.readFile(`./_locales/${lang}/messages.json`, 'utf-8', function(err, data){
                if(err){
                    logger.error(`Invalid JSON file on ./_locales/${lang}/messages.json`, err);
                    return reject();
                }

                try {
                    resolve({lang: lang, messages: JSON.parse(data)});
                } catch (e) {
                    logger.error(`Invalid JSON file on ./_locales/${lang}/messages.json`);
                    reject();
                }

            });
        });
    }

    /**
     * Loads the languages available to the app by reading the _locales folder.
     * @returns {Promise<Array>} the promise of a list of languages.
     */
    loadLanguages() {
        return new Promise((resolve, reject) => {
            fs.readdir('./_locales', (err, files) => {
                if(err){
                    logger.error('Failed to read locales directory on _locales');
                    reject();
                    return;
                }
                logger.info(`Loading translation files from ${files}`);
                resolve(files);
            });
        });
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

        if(key.startsWith('write_')){
            return Messages.write(req, key);
        }

        const self = Messages.of();
        const lang = self._parseLanguageHeader(req);
        return key ? self._getText.apply(self, [lang, key, a, b, c]) : '???' + key + '???';
    }

    /**
     * Parses write commands.
     * @param {Object} req - Request object
     * @param {String} command - Command to retrieve its message and the value in a format like write_xxx:foo
     * @return  {String} Value or ???key??? if empty or invalid
     */
    static write(req, command) {
        const keyValue = command.split(':');
        switch (keyValue[0]) {
            case 'write_date_time':
                return Messages.dateTime(req, new Moment(parseInt(keyValue[1])));
                break;
            case 'write_date':
                return Messages.date(req, new Moment(parseInt(keyValue[1])));
                break;
            case 'write_time':
                return Messages.time(req, new Moment(parseInt(keyValue[1])));
                break;
            case 'write_number':
                return Messages.number(req, parseInt(keyValue[1]));
                break;
            case 'write_plural':
                const value = keyValue[2] ? parseInt(keyValue[2]) : 0;
                return Messages.plural(req, keyValue[1], value);
                break;
            default:
                return `???${command}???`;
        }
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

    /**
     * Formats a given JavaScript Date or Moment object to the locale date
     * @param {Object} req - Request object
     * @param {Date|String|Moment} time - a JavaScript Date or Moment object. Check http://momentjs.com/docs/#/parsing/
     * @returns {String} the date formatted for the locale.
     */
    static date(req, time) {
        const format = Messages.get(req, 'format_date');
        return Messages.formatTime(time, format);
    }

    /**
     * Formats a given JavaScript Date or Moment object to the locale time
     * @param {Object} req - Request object
     * @param {Date|String|Moment} time - a JavaScript Date or Moment object. Check http://momentjs.com/docs/#/parsing/
     * @returns {String} the time formatted for the locale.
     */
    static time(req, time) {
        const format = Messages.get(req, 'format_time');
        return Messages.formatTime(time, format);
    }

    /**
     * Formats a given JavaScript Date or Moment object to the locale date & time
     * @param {Object} req - Request object
     * @param {Date|String|Moment} time - a JavaScript Date or Moment object. Check http://momentjs.com/docs/#/parsing/
     * @returns {String} the date & time formatted for the locale.
     */
    static dateTime(req, time) {
        const format = Messages.get(req, 'format_date_time');
        return Messages.formatTime(time, format);
    }

    /**
     * Formats a given number to its locale.
     * If we fall short on this, we can always rely on http://numeraljs.com/
     * @param {Object} req - Request object
     * @param {Number} value - the value to format
     * @returns {String} the value formatted for the locale.
     * @example
     * Messages.number(1000) -> 1,000 or 1.000
     */
    static number(req, value) {
        const separator = Messages.get(req, 'format_thousands');
        const parts = Math.round(value).toString().split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
        return parts.join('.');
    }

    /**
     * Formats a given JavaScript Date or Moment object to the locale date & time
     * @private
     * @param {Date|String|Moment} time - a JavaScript Date or Moment object. Check http://momentjs.com/docs/#/parsing/
     * @param {String} format - the date format from either format_date, format_time or format_date_time
     * @returns {String} the date & time formatted for the format.
     */
    static formatTime(time, format) {
        if(format.startsWith('???')){
            return format;
        }

        if(Moment.isMoment(time)){
            return time.format(format);
        }

        try {
            return Moment(time).format(format);
        } catch (e) {
            return '???invalid_date???';
        }
    }

    /**
     * Obtains the template text for a given language. The template is loaded once from
     * a template.md file on the folder of the locale. Then it's used from the memory.
     * @param {Object} req - Request object.
     * @returns {Promise<String>} the promise of a text from a template file.
     */
    static getTemplate(req) {
        return new Promise((resolve, reject) => {
            const self = Messages.of();
            let lang = self._parseLanguageHeader(req);

            // Set default lang
            if(!_.includes(self.languages, lang)){
                lang = 'en';
            }

            // Check if we already have the template for this language.
            const current = self.translations.find((t) => t.lang === lang).template;

            if(current && !_.isEmpty(current)){
                resolve(current);
                return;
            }

            logger.info(`Reading template from _locales/${lang}/template.md for the first time.`);
            fs.readFile(`./_locales/${lang}/template.md`, 'utf-8', function(err, data){
                if(err){
                    return reject();
                }
                self.translations.find((t) => t.lang === lang).template = data;
                resolve(data);
            });
        });
    }

    /**
     * Get the value for the key and  the current language or the key name
     * @returns {String} Value or ???key??? if key doesn't exists
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

    /**
     * Get the value for the key and the current language or the key name
     * @param {String} lang - the language of the Request
     * @param {String} key - the key to obtain its message
     * @returns {String} the value or null
     */
    _getMessage(lang, key){
        let translation = this.translations.find((t) => t.lang === lang);

        if(!translation){
            logger.warn(`No translation for language ${lang}`);
            translation = this.translations.find((t) => t.lang === 'en');
            return null;
        }

        const messages = translation.messages;

        if(messages && messages[key]){
            return messages[key].message;
        }else{
            return null;
        }
    }

    /**
     * Parses the accept-language header from an HTTP request and obtains the language code.
     * @param {Object} req - Request object.
     * @returns {String} the language code from the header or the default language of the app.
     */
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
        return lang;
    }
}

Messages.of();

module.exports = Messages;
