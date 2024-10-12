var express = require('express');
var multer = require('multer');
var path = require('path');


var app = express.Router();


var store = multer.diskStorage({
    destination:function(req,file,cb){
        cb(null, './files');
    },
    filename:function(req,file,cb){
        cb(null, Date.now()+'.'+file.originalname);
    }
});


var upload = multer({storage:store}).single('file');

app.post('/upload', function(req,res,next){
    upload(req,res,function(err){
        if(err){
            return res.status(501).json({error:err});
        }
        //do all database record saving activity
        return res.json({originalname:req.file.originalname, uploadname:req.file.filename});
    });
});


app.post('/download', function(req,res,next){
    filepath = path.join(__dirname,'../files') +'/'+ req.body.filename;
    res.sendFile(filepath);
});

module.exports = app;