var express = require('express');
var bodyParser = require('body-parser');
var fs = require('fs');
const PirateBay = require('thepiratebay');
const mongoose = require('mongoose');

var app = express();

mongoose.connect('mongodb://admin:password123@ds255451.mlab.com:55451/plexdownloader', { useNewUrlParser: true });

const torrentSchema = new mongoose.Schema({
    id: Number,
    title: String,
    magnetLink: String,
    pending: Boolean
});

const torrentModel = mongoose.model('Torrent', torrentSchema);

var urlencodedParser = bodyParser.urlencoded({ extended: false })

app.set('view engine', 'ejs');
app.use('/assets', express.static('assets'));

app.get('/', function(req, res) {
    res.render('search');
});

app.get('/search', function(req, res) {
    res.render('search');
});

app.post('/search', urlencodedParser ,function(req, res) {
    res.redirect('/search/' + req.body.searchTerm);
});

app.get('/search/:title', function(req, res) {
    PirateBay.search(req.params.title, {
        category: 207, //HD - Movies
        filter: {
            verified: true
        },
        page: 0,
        orderBy: 'seeds',
        sortBy: 'desc'
    })
      .then(results => {
        res.render('results', {data: results, searchTerm: req.params.title});
      }).catch(err => console.log(err))
});

app.get('/que', function(req, res) {
    torrentModel.find({}, function(err, data) {
        if(err) throw err;
        res.render('que', {torrents: data});
    });
});

app.get('/que/:id', function(req, res) {
    PirateBay.getTorrent(req.params.id)
        .then(results => {
            writeScript(results.magnetLink);
            //add the torrent to the DB as pending
            var newTorrent = torrentModel({
                id: results.id,
                title: results.name,
                magnetLink: results.magnetLink,
                pending: true
            }).save(function(err, data) {
                if(err) throw err;
                console.log('New torrent ' + data.title + ' sent to downloads');
            });
            res.redirect('/que');
        })
        .catch(err => console.log(err));
});

app.get('/delete/:id', function(req, res) {
    var torrentID = req.params.id;
    torrentModel.findById(torrentID).remove(function(err, data) {
        if(err) throw err;
        res.redirect('/que');
    });
});

var writeScript = function (magnetLink) {
    fs.writeFileSync( __dirname + '/download.txt', magnetLink);
};

// contact page
// app.get('/contact', function(req, res) {
//     console.log(req.query);
//     res.render('contact', {qs: req.query});
// });

// app.post('/contact', urlencodedParser, function(req, res) {
//     console.log(req.body);
//     res.render('contact-success', {data: req.body});
// });

app.listen(3000);