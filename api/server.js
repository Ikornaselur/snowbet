var cacheManager = require('cache-manager'),
    sqlite3 = require('sqlite3'),
    path = require('path'),
    express = require('express');


var app = express();
app.set('port', process.env.PORT || 9999);
app.use(express.static(path.join(__dirname, 'public')));

var cache = cacheManager.caching({
    store: 'memory',
    max: 100,
    ttl: 60*30 /* 30 minutes */
});

app.get('/', function (req, res) {
    res.sendfile('index.html');
});

app.get('/api/weather', function (req, res) {
    var start = req.query.start;
    var end = req.query.end;
    var id = 1;
    if (typeof start !== 'undefined' && typeof end !== 'undefined') {
       id = start + end; 
    }
    cache.get(id, function (err, result) {
        if (err) {return;}
        if (result) {
            console.log('%s: Hit from cache', new Date().toGMTString());
            res.json(result);
            return;
        }

        console.log('%s: Reading from db', new Date().toGMTString());
        var db = new sqlite3.Database('../snow.db');
        var result = [];
        var query = 'SELECT * FROM weather';
        if (id !== 1) { //id is 1 if no start and end query params
            query += ' WHERE date BETWEEN "' + start + '" AND "' + end + '"';
        }

        console.log(query);
        db.each(query, function (err, row) {
            var color = 'blue';
            if (row.snow === 'True') {
                color = 'red';
            }

            var obj = {
                'date': row.date,
                'title': row.desc,
                'color': color
            };
            result.push(obj);
        }, function () {
            db.close();
            cache.set(id, result);
            res.json(result);
        });
    });
});

app.get('/api/people', function (req, res) {
    var people = [
        {
            'title': 'Jón Arnar',
            'date': '2015-05-10'
        },
        {
            'title': 'Alex Couper',
            'date': '2015-04-30'
        },
        {
            'title': 'Áslaug',
            'date': '2015-05-15'
        },
        {
            'title': 'Axel Örn',
            'date': '2015-05-20'
        },
        {
            'title': 'Helgi Möller',
            'date': '2015-05-25'
        }
    ];
    res.json(people);
});

app.listen(app.get('port'), function () {
    console.log('Listening on port %d', app.get('port'));
});
