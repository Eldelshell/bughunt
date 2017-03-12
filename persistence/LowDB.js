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
            private: false,
            level: 'low',
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
            if(term === 'is:public'){
                results = results.filter((ticket) => ticket.private === false);
                return;
            }

            if(term === 'is:private'){
                results = results.filter((ticket) => ticket.private === true);
                return;
            }

            if(term.includes('is:')){
                const t = term.split(':');
                results = results.filter((ticket) => ticket.status === t[1] || ticket.type === t[1] || ticket.level === t[1]);
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

    editTicket(id, data) {
        return this._db.get('tickets').find({id: id}).assign(data).write();
    }

    async setTicketStatus(id, status) {
        if(['private', 'public'].includes(status)){
            await this._db.get('tickets').find({id: id}).assign({private: (status === 'private')}).write();
        }else if(['low', 'critical', 'blocker'].includes(status)){
            await this._db.get('tickets').find({id: id}).assign({level: status}).write();
        }else{
            await this._db.get('tickets').find({id: id}).assign({status: status}).write();
        }
    }

    async getStats() {
        const tickets = await this._db.get('tickets').filter({active: true}).value();
        return {
            open: tickets.filter((el) => el.status === 'open').length,
            progress: tickets.filter((el) => el.status === 'progress').length,
            closed: tickets.filter((el) => el.status === 'closed').length,
            low: tickets.filter((el) => el.level === 'low').length,
            critical: tickets.filter((el) => el.level === 'critical').length,
            blocker: tickets.filter((el) => el.level === 'blocker').length,
            public: tickets.filter((el) => !el.private).length,
            private: tickets.filter((el) => el.private).length
        }
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
