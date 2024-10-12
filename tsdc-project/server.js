var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var app = express();

require('console-stamp')(console, '[HH:MM:ss.l]');



app.use(logger('dev'));
app.use(logger(':date[Asia/Bangkok] ":method :url"'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname,'web')));



app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PATCH, DELETE, OPTIONS');
    next();
});

app.use('/api',require('./server/api.js'));
/* app.use('/api99',require('./server/aum.js'));
app.use('/api123',require('./server/wan.js'));
app.use('/api000',require('./server/boat.js'));*/
app.use('/file',require('./server/file.js')); 

app.use('*',function(req,res){
    res.sendFile(path.join(__dirname,'web/index.html'));
}); 

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    res.render('index');
});

var server = app.listen(1661,function(){
    var port = server.address().port;
   console.log("TSDC Project api server running at port 1661"); 
});