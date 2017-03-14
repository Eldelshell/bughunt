const _ = require('lodash');
const express = require('express');
const router = express.Router();
const logger = require('winston');
const Middleware = require('../utils/Middleware');
const Persistence = require('../persistence/Manager');
const Config = require('../config/Manager');
const Messages = require('../utils/Messages');
const Authentication = require('../utils/Authentication');

const cookie = Config.of().getCookieName();
const authentication = new Authentication();
const messagesMiddleware = Middleware.messages;
const isAdmin = Middleware.isAdmin;
const isSessionValid = Middleware.isSessionValid;
const isSessionPresent = Middleware.isSessionPresent;

/**
 * Render the home page
 */
router.get('/', messagesMiddleware, function(req, res, next) {
    res.render('index');
});

/**
 * Render the form for users to create a new ticket
 */
router.get('/bug', isSessionValid, messagesMiddleware, async function(req, res, next) {

    if(!Config.of().allowAnonymousTickets() && !req.params.email){
        logger.info(`Anonymous tickets are disabled`);
        res.redirect('/login');
        return;
    }

    const {appId, appVersion, errors} = req.query;
    const template = await Messages.getTemplate(req);
    const app = await Persistence.getApp(appId);

    const data = {
        appVersion: appVersion,
        versions: app.versions,
        errors: errors ? errors.split(',') : null,
        template: template
    };

    res.render('ticket', data);
});

/**
 * POST receiver for /bug form to create a new ticket.
 * @param {String} appId - the ID of the app
 * @param {String} appVersion - the version of the app
 * @param {String} [email] - the email of the user
 * @param {String} title - the title of the ticket
 * @param {String} description - the description of the ticket
 * @param {String} type - the type of ticket
 */
router.post('/bug', messagesMiddleware, async function(req, res, next) {
    const {appId, appVersion, email, title, description, type} = req.body;

    if(_.isEmpty(appId)){
        return res.redirect(`/bug?errors=error_invalid_app`);
    }

    if(_.isEmpty(appVersion)){
        return res.redirect(`/bug?errors=error_invalid_version`);
    }

    const app = await Persistence.getApp(appId);

    if(!app){
        return res.redirect(`/bug?errors=error_invalid_app`);
    }

    try {
        logger.debug(`[index] Create new ticket with ${req.body.title}`);
        const ticket = await Persistence.createTicket(req.body);
        res.render('greeting', {name: app.name, ticket: ticket});
    } catch (e) {
        next(e);
    }
});

/**
 * Render the login page
 */
router.get('/login', messagesMiddleware, isSessionPresent, function(req, res, next) {
    res.render('login');
});

/**
 * POST receiver for the login form
 * @param {String} email - the email of the user
 * @param {String} password - the password of the user
 */
router.post('/login', async function(req, res, next) {
    const {email, password} = req.body;
    const pwd = authentication.hash(password);
    const user = await Persistence.login(email, pwd);
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

/**
 * Logout the user
 */
router.get('/logout', function(req, res, next) {
    res.clearCookie(cookie).redirect('/');
});

/**
 * Renders the dashboard
 * @param {String} [search] - the search string
 * @param {String} [page] - the page to display
 */
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

/**
 * Renders the details page of a ticket
 * @param {String} id - the ID of the ticket
 */
router.get('/ticket/:id', messagesMiddleware, isSessionValid, async function(req, res, next) {
    const ticket = await Persistence.getTicket(req.params.id);

    if(!ticket){
        return res.status(404).render('error', {status: 404, message: `Invalid id ${req.params.id}`});
    }

    const app = await Persistence.getApp(ticket.appId, ticket.appVersion);
    res.render('detail', {
        email: req.params.email,
        isAdmin: !_.isEmpty(req.params.email),
        appName: app.name,
        versions: app.versions,
        ticket: ticket
    });
});

/**
 * POST receiver for /ticket modal form to edit a ticket.
 * @param {String} id - the ID of the ticket
 * @param {String} appVersion - the version of the app
 * @param {String} title - the title of the ticket
 * @param {String} description - the description of the ticket
 * @param {String} type - the type of ticket
 * @param {String} level - the level of the ticket
 * @param {String} private - the privacy of the ticket
 */
router.post('/ticket/:id', isSessionValid, async function(req, res, next) {
    const ticket = await Persistence.getTicket(req.params.id);

    if(!ticket){
        return res.status(404).render('error', {message: `Invalid id ${req.params.id}`});
    }

    const {title, description, type, level, private} = req.body;

    const data = {
        title: req.body.title,
        description: req.body.description,
        appVersion: req.body.appVersion,
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

/**
 * PUT receiver for a ticket. Allows to edit the type, level or status of a ticket without a form (with AJAX)
 * @param {String} id - the ID of the ticket
 * @param {String} status - the new status to set
 */
router.put('/ticket/:id', messagesMiddleware, isAdmin, async function(req, res, next) {
    await Persistence.setTicketStatus(req.params.id, req.body.status);
    res.sendStatus(200);
});

/**
 * POST receiver to add a new comment to a ticket
 * @param {String} id - the ID of the ticket
 * @param {String} [email] - the email of the user adding the comment
 * @param {String} comment - the new comment
 */
router.post('/ticket/:id/comment', isSessionValid, async function(req, res, next) {
    const { id, email } = req.params;
    await Persistence.addComment(id, email, req.body.comment);
    res.redirect('/ticket/' + id);
});

/**
 * DELETE receiver to delete a comment from a ticket
 * @param {String} id - the ID of the ticket
 * @param {String} cid - the ID of the comment
 */
router.delete('/ticket/:id/comment/:cid', isAdmin, async function(req, res, next) {
    const { id, cid } = req.params;
    await Persistence.deleteComment(id, cid);
    res.sendStatus(200);
});

module.exports = router;
