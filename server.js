'use strict';

var express     = require('express');
var bodyParser  = require('body-parser');
var expect      = require('chai').expect;
var cors        = require('cors');
var helmet        = require('helmet');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectID;
const CONNECTION_STRING = process.env.DB;
const mongo = new MongoClient(CONNECTION_STRING, { useUnifiedTopology: true });

var apiRoutes         = require('./routes/api.js');
var fccTestingRoutes  = require('./routes/fcctesting.js');
var runner            = require('./test-runner');

var app = express();

app.use('/public', express.static(process.cwd() + '/public'));
app.use(helmet());
app.use(helmet.frameguard({ action: 'sameorigin' }));
app.use(helmet.referrerPolicy({ policy: 'same-origin' }))
app.use(cors({origin: '*'})); //For FCC testing purposes only

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

mongo.connect((err, client) => {
    if (err) {
        console.error('connection error to db');
    } else {
        console.log('db connection successful');
        //Sample front-end
        app.route('/b/:board/')
        .get(function (req, res) {
            res.sendFile(process.cwd() + '/views/board.html');
        });
        app.route('/b/:board/:threadid')
        .get(function (req, res) {
            res.sendFile(process.cwd() + '/views/thread.html');
        });

        //Index page (static HTML)
        app.route('/')
        .get(function (req, res) {
            res.sendFile(process.cwd() + '/views/index.html');
        });

        //For FCC testing purposes
        fccTestingRoutes(app);

        //Routing for API
        apiRoutes(app, client);

        //Sample Front-end


        //404 Not Found Middleware
        app.use(function(req, res, next) {
        res.status(404)
            .type('text')
            .send('Not Found');
        });

        //Start our server and tests!
        //
        const port = process.env.PORT || 3000;
        app.listen(port, function () {
            console.log("Listening on port " + port);
            if(process.env.NODE_ENV==='test') {
                console.log('Running Tests...');
                setTimeout(function () {
                    try {
                        runner.run();
                    } catch(e) {
                        var error = e;
                        console.log('Tests are not valid:');
                        console.log(error);
                    }
                }, 1500);
            }
        });
    }
});

module.exports = app; //for testing
