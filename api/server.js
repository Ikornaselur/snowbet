var cacheManager = require('cache-manager'),
    sqlite3 = require('sqlite3'),
    express = require('express');


var app = express();
app.set('port', process.env.PORT || 9999);

var cache = cacheManager.caching({
    store: 'memory',
    max: 100,
    ttl: 60*5 /* 5 minutes */
});
var id = 1;

app.get('/', function (req, res) {
    cache.get(id, function (err, result) {
        if (err) {return;}
        if (result) {
            res.json(result);
            return;
        }

        var db = new sqlite3.Database('../snow.db');
        var result = [];
        db.each('SELECT * FROM weather', function (err, row) {
            result.push(row);
        }, function () {
            db.close();
            cache.set(id, result);
            res.json(result);
        });
    });
});

app.listen(app.get('port'), function () {
    console.log('Listening on port %d', app.get('port'));
});
