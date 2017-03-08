const _ = require('lodash');
const logger = require('winston');
const Config = require('../config/Manager');
const Random = require('../utils/Random');
const low = require('lowdb');

/**
 * Interface for the warehouse database storage.
 */
class LowDB {

    constructor(config){
        this._db = low(config.getDatabase().path);
        this._db.defaults({ tickets: [] }).write();
    }

    async createTicket(data){
        logger.debug(`[warehouse] Create new ticket with ${data.title}`);

        const obj = {
            id: Random.guid(),
            created: Date.now(),
            active: true,
            appId: data.appId,
            appVersion: data.appVersion,
            email: data.email,
            title: data.title,
            description: data.description,

            /*
             * Any of bug, problem, idea, improvement
             */
            type: data.type,

            /*
             * Any of open, closed, duplicate, migrated, progress
             */
            status: 'open'
        };

        await this._db.get('tickets').push(obj).write();
        return obj;
    }

    async getTickets(search) {
        const tickets = await this._db.get('tickets').filter({active: true}).sortBy('created').value();

        if(!search){
            return tickets;
        }

        const terms = search.split(' ');
        let results = tickets;
        terms.forEach((term) => {
            if(term.includes('is:')){
                const t = term.split(':');
                results = results.filter((ticket) => ticket.status === t[1] || ticket.type === t[1]);
            }else{
                const r = tickets.filter((ticket) => ticket.title.includes(term) || ticket.description.includes(term));
                results.push(...r);
            }
        });

        return results;
    }

    async getTicket(id) {
        const ticket = await this._db.get('tickets').find({id: id}).value();
        return ticket;
    }

    async setTicketStatus(id, status) {
        await this._db.get('tickets').find({id: id}).assign({status: status}).write();
    }

    async addComment(id, user, comment) {
        const ticket = await this.getTicket(id);

        if(!ticket){
            return false;
        }

        const comments = _.defaultTo(ticket.comments, []);
        comments.push({
            id: Random.guid(),
            created: Date.now(),
            owner: user,
            text: comment
        });
        await this._db.get('tickets').find({id: id}).assign({comments: comments}).write();
        return true;
    }

    async deleteComment(id, commentId) {
        const ticket = await this.getTicket(id);

        if(!ticket){
            logger.info(`[LowDB] Cannot delete. Didn't find ticket ${id}`);
            return false;
        }

        logger.info(`[LowDB] Delete comment ${commentId} from ticket ${id}`);
        const comments = _.defaultTo(ticket.comments, []).filter((comment) => commentId !== comment.id);
        await this._db.get('tickets').find({id: id}).assign({comments: comments}).write();
        return true;
    }

}

module.exports = LowDB;
