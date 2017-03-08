const logger = require('winston');
const _ = require('lodash');
const Config = require('../config/Manager');

let db = null;

module.exports = {

    /**
     * Loads the database
     * @returns {Object} the database access object
     * @example
     * const Persistence = require('services/Persistence');
     * const db = Persistence.getDB();
     */
    getDB: function() {
        if(db){
            return db;
        }

        const Persistence = require('./LowDB');
        db = new Persistence(Config.of());
        return db;
    },

    /**
     * Creates a ticket
     * @param {Object} data - the data for the ticket
     */
    createTicket: function(data) {
        return this.getDB().createTicket(data);
    },

    getApp: function(id, version){
        // For now, since we don't have a DB for this, we use the configuration but it
        // should go to the DB in the future
        return Config.of().getApp(id, version);
    },

    login: function(email, password){
        // For now, since we don't have a DB for authentication, we use the configuration but it
        // should go to the DB in the future
        return Config.of().login(email, password);
    },

    getTickets: function(search) {
        return this.getDB().getTickets(search);
    },

    getTicket: function(id) {
        return this.getDB().getTicket(id);
    },

    setTicketStatus: function(id, status) {
        return this.getDB().setTicketStatus(id, status);
    },

    addComment: function(id, user, comment) {
        return this.getDB().addComment(id, user, comment);
    },

    deleteComment: function(ticketId, commentId) {
        return this.getDB().deleteComment(ticketId, commentId);
    }

};
