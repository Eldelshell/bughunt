const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const index = require('./routes/index');

const app = express();

// Configure handlebars partials
const hbs = require('hbs');
hbs.registerPartials(__dirname + '/views/components');

// handlebars helpers
hbs.registerHelper ('truncate', function(str, len) {
    if(!str || str.length < len || str.length === 0){
        return str;
    }

    let neu = str + ' ';
    neu = str.substr(0, len);
    neu = str.substr(0, neu.lastIndexOf(' '));
    neu = (neu.length > 0) ? neu : str.substr(0, len);
    return new hbs.SafeString ( neu +'...' );
});

const paginate = require('handlebars-paginate');
hbs.registerHelper('paginate', paginate);

// markdown helper
const Remarkable = require('remarkable');
hbs.registerHelper('markdown', function(options) {
    md = new Remarkable('full');
    return md.render(options.fn(this));
});

hbs.registerHelper('compare', function(lvalue, rvalue, options) {
    if (arguments.length < 3)
        throw new Error('Handlerbars Helper compare needs 2 parameters');

    const operator = options.hash.operator || '==';
    const operators = {
        '==':		function(l,r) { return l == r; },
        '===':	function(l,r) { return l === r; },
        '!=':		function(l,r) { return l != r; },
        '<':		function(l,r) { return l < r; },
        '>':		function(l,r) { return l > r; },
        '<=':		function(l,r) { return l <= r; },
        '>=':		function(l,r) { return l >= r; },
        'typeof':	function(l,r) { return typeof l == r; }
    }

    if (!operators[operator])
        throw new Error(`Handlerbars Helper compare doesn't know the operator ${operator}`);

    const result = operators[operator](lvalue,rvalue);
    if( result ) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// Uncomment to log apache style access.log
// app.use(logger('combined'));
app.use(bodyParser.json({limit: '5mb'}));
app.use(bodyParser.urlencoded({ extended: true , limit: '5mb'}));
app.use(cookieParser());
app.use(require('node-sass-middleware')({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: true,
  sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// Logging configuration
const winston = require('winston');
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
    level: app.get('env') === 'development' ? 'debug' : 'info',
    handleExceptions: true,
    json: false,
    colorize: true,
    timestamp: true
});

module.exports = app;
