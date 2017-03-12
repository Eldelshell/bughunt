const _ = require('lodash');
const express = require('express');
const router = express.Router();
const logger = require('winston');
const Middleware = require('../utils/Middleware');
const Persistence = require('../persistence/Manager');
const Config = require('../config/Manager');
const Messages = require('../utils/Messages');
const Authentication = require('../utils/Authentication');

const cookie = 'jnjSession';
const authentication = new Authentication();
const messagesMiddleware = Middleware.messages;
const isAdmin = Middleware.isAdmin;
const isSessionValid = Middleware.isSessionValid;
const isSessionPresent = Middleware.isSessionPresent;

router.get('/', messagesMiddleware, function(req, res, next) {
    res.render('index');
});

router.get('/bug', messagesMiddleware, async function(req, res, next) {
    const {appId, appVersion, errors} = req.query;
    const template = await Messages.getTemplate(req);
    res.render('ticket', {appId: '1ae9b29e292058c9058e489b', appVersion: '1.0.0', errors: errors, template: template});

});

router.post('/bug', messagesMiddleware, async function(req, res, next) {
    const {appId, appVersion, email, title, description, type} = req.body;

    if(_.isEmpty(appId) || _.isEmpty(appVersion)){
        return res.redirect(`/bug?errors=error_invalid_app`);
    }

    const app = await Persistence.getApp(appId, appVersion);

    if(!app){
        return res.redirect(`/bug?errors=error_invalid_app`);
    }


    try {
        logger.debug(`[index] Create new report with ${req.body.title}`);
        const ticket = await Persistence.createTicket(req.body);
        res.render('greeting', {name: app.name, ticket: ticket});
    } catch (e) {
        next(e);
    }
});

router.get('/login', messagesMiddleware, isSessionPresent, function(req, res, next) {
    res.render('login');
});

router.post('/login', async function(req, res, next) {
    const {email, password} = req.body;

    const user = await Persistence.login(email, password);
    if(!user){
        logger.warn(`[index] Invalid login for user ${email}`);
        res.clearCookie(cookie).redirect('/login');
        return;
    }

    const encrypted = authentication.encryptLoginToken(email, 'dfac5be1ee95');

    // Create the cookie and redirect to the app
    res.cookie(cookie, encrypted, { maxAge: 99999999999 }).redirect('/dashboard');
    res.redirect('/dashboard');
});

router.get('/logout', function(req, res, next) {
    res.clearCookie(cookie).redirect('/');
});

router.get('/dashboard', messagesMiddleware, isAdmin, async function(req, res, next) {
    const tickets = await Persistence.getTickets(req.query.search);
    const stats = await Persistence.getStats();
    const page = _.defaultTo(req.query.page, 1);
    const pageSize = Config.of().getPageSize();
    const pages = Math.ceil(tickets.length / pageSize);

    res.render('dashboard', {
        email: req.params.email,
        open: tickets.filter((el) => el.status === 'open').length,
        stats: stats,
        tickets: tickets.slice(pageSize * (page - 1), pageSize * (page)),
        search: req.query.search,
        pagination: {
            show: pages > 1,
            page: page,
            pageCount: pages
        }
    });
});

router.get('/ticket/:id', messagesMiddleware, isSessionValid, async function(req, res, next) {
    const ticket = await Persistence.getTicket(req.params.id);

    if(!ticket){
        return res.status(404).render('error', {message: `Invalid id ${req.params.id}`});
    }

    const app = await Persistence.getApp(ticket.appId, ticket.appVersion);
    res.render('detail', {
        email: req.params.email,
        isAdmin: !_.isEmpty(req.params.email),
        appName: app.name,
        ticket: ticket
    });
});

router.post('/ticket/:id', isSessionValid, async function(req, res, next) {
    const ticket = await Persistence.getTicket(req.params.id);

    if(!ticket){
        return res.status(404).render('error', {message: `Invalid id ${req.params.id}`});
    }

    const {title, description, type, level, private} = req.body;

    const data = {
        title: req.body.title,
        description: req.body.description,
        type: req.body.type,
        level: req.body.level,
        private: req.body.private === 'true'
    };

    try {
        await Persistence.editTicket(req.params.id, data);
    } catch (e) {
        logger.error(`Failed to save ticket data for ${req.params.id}`);
        console.log(data);
    }
    res.redirect('/ticket/' + req.params.id);
});

router.put('/ticket/:id', messagesMiddleware, isAdmin, async function(req, res, next) {
    await Persistence.setTicketStatus(req.params.id, req.body.status);
    res.sendStatus(200);
});

router.post('/ticket/:id/comment', isSessionValid, async function(req, res, next) {
    const { id, email } = req.params;
    await Persistence.addComment(id, email, req.body.comment);
    res.redirect('/ticket/' + id);
});

router.delete('/ticket/:id/comment/:cid', isAdmin, async function(req, res, next) {
    const { id, cid } = req.params;
    await Persistence.deleteComment(id, cid);
    res.sendStatus(200);
});

module.exports = router;
