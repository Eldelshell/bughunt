const logger = require('winston');

let INSTANCE;

class Manager {

    constructor(config){
        this._config = config;
    }

    static of(){
        if(!this[INSTANCE]){
            logger.info('[ConfigManager] Loading configuration from config/config.json');
            const config = require('./config.json');
            this[INSTANCE] = new Manager(config);
        }
        return this[INSTANCE];
    }

    getDatabase(){
        return this._config.database;
    }

    login(email, password){
        // For now, since we don't have a DB for authentication, we use the configuration.
        return new Promise((resolve, reject) => {
            const user = this._config.users.find((el) => el.email === email && el.password === password);
            resolve(user);
        });
    }

    getApp(id){
        // For now, since we don't have a DB for this, we use the configuration.
        return new Promise((resolve, reject) => {
            const app = this._config.apps.find((el) => el.id === id);
            resolve(app);
        });
    }

    getPageSize() {
        return this._config.ui.pageSize;
    }

    getSessionSecret() {
        return this._config.security.sessionSecret;
    }

    allowAnonymousTickets() {
        return this._config.security.anonymousTickets;
    }

    getTemplateFile() {
        return this._config.ui.template;
    }

    getTheme() {
        return this._config.ui.theme;
    }

    getCookieName() {
        return this._config.security.cookieName;
    }

}

Manager.of();

module.exports = Manager;
