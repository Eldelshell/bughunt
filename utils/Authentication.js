const logger = require('winston');
const crypto = require('crypto');
const _ = require('lodash');
const Config = require('../config/Manager');

/**
 * Handle user authentication
 * @class
 * @module utils/Authentication
 */
class Authentication {

    constructor() {
        this.secret = Config.of().getSessionSecret();
    }

    encryptLoginToken(email, token) {
        if(_.isEmpty(email) || _.isEmpty(token)){
            logger.error('Invalid token or email to encrypt');
            return null;
        }

        const obj = {
            'email': email,
            'token': token,
            'time': _.now()
        };

        return encodeURIComponent(this.__encrypt(obj));
    }

    decryptLoginToken(cypher) {
        if(!cypher){
            return null;
        }
        const raw = this.__decrypt(decodeURIComponent(cypher));
        return raw;
    }

    /**
     * Encrypts the given data using AES-256-GCM
     * @param authObject
     * @returns {*}
     * @private
     */
    __encrypt(authObject) {
        try {
            const iv = crypto.randomBytes(12);
            const salt = crypto.randomBytes(64);
            const key = crypto.pbkdf2Sync(this.secret, salt, 2145, 32, 'sha512');
            const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
            const encrypted = Buffer.concat([cipher.update(JSON.stringify(authObject), 'utf8'), cipher.final()]);
            const tag = cipher.getAuthTag();
            return Buffer.concat([salt, iv, tag, encrypted]).toString('base64');
        }catch (error) {
            logger.error(error);
        }
        return null;
    }

    /**
     * Decrypts the given data using AES-256-GCM
     * @param encryptedAuthObject
     * @returns {null}
     * @private
     */
    __decrypt(encryptedAuthObject) {
        try {
            const bData = new Buffer(encryptedAuthObject, 'base64');
            const salt = bData.slice(0, 64);
            const iv = bData.slice(64, 76);
            const tag = bData.slice(76, 92);
            const text = bData.slice(92);
            const key = crypto.pbkdf2Sync(this.secret, salt, 2145, 32, 'sha512');
            const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(tag);
            const decrypted = decipher.update(text, 'binary', 'utf8') + decipher.final('utf8');
            return JSON.parse(decrypted);
        }catch (error) {
            logger.error(error);
        }
        return null;
    }

    /**
     * Checks if the session is expired
     * @param {String} session - the session from the cookie
     * @returns {Boolean} if the session is valid
     * @private
     */
    __isSessionExpired(session) {
        try {
            const currentTime = new Date().getTime();
            return currentTime > session.expirationDate;
        }
        catch (error) {
            logger.error(error);
        }
        return true;
    }

    /**
     * Gets the email from the encrypted session
     * @param {String} session - the session from the cookie
     * @returns {String} if the session is valid, returns the email or null if something fails
     */
    getEmail(session) {
        if(_.isEmpty(session)){
            return null;
        }

        const authObject = this.decryptLoginToken(session);

        if(!authObject || _.isEmpty(authObject.email)){
            //Failed to decrypt, assume cookie is invalid
            logger.warn(`Invalid authentication session: ${session}`);
            return null;
        }

        return authObject.email;
    }
}

module.exports = Authentication;
