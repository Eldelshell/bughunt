const _ = require('lodash');
const Messages = require('../utils/Messages');
const Authentication = require('../utils/Authentication');


const authentication = new Authentication();
const cookie = 'jnjSession';
const regExp = new RegExp(/\$\$(.*?)\$\$/gi);

module.exports = {

    /**
    * Middleware for translations. Finds all $$key$$ on a generated body
    * and translates them.
    */
    messages: function (req, res, next) {
        const send = res.send;
        res.send = function (string) {
            let body = string instanceof Buffer ? string.toString() : string;
            const match = body.match(regExp);
            if(match){
                match.forEach((m) => body = body.replace(m, Messages.get(req, m)));
            }
            send.call(this, body);
        };
        next();
    },

    /**
     * Middleware that verifies the session and sets the email as a request parameter.
     */
    isSessionValid: function(req, res, next) {
        const session = req.cookies[cookie];
        const email = authentication.getEmail(session);
        req.params.email = email;
        next();
    },

    /**
     * Middleware that verifies the session and sets the email as a request parameter.
     */
    isAdmin: function(req, res, next) {
        const session = req.cookies[cookie];
        const email = authentication.getEmail(session);

        if(!email){
            // Invalid session
            res.clearCookie(cookie).redirect('/login');
            return;
        }

        req.params.email = email;
        next();
    },

    /**
     * Middleware that verifies the session is present and redirects logged in users to the app.
     */
    isSessionPresent: function(req, res, next) {
        const session = req.cookies[cookie];

        if(!_.isEmpty(session)){
            res.redirect('/dashboard');
            return;
        }

        next();
    }
};
