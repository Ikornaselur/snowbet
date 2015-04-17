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
        // The results are cached on `id`, so it makese sense to 
        // set the cache id to start + end
        id = start + end; 
    }
    cache.get(id, function (err, res) {
        if (err) {return;}
        if (res) {
            console.log('%s: Hit from cache', new Date().toGMTString());
            res.json(result);
            return;
        }

        console.log('%s: Reading from db', new Date().toGMTString());
        var db = new sqlite3.Database('../snow.db');
        var result = [];
        var query = 'SELECT * FROM weather';
        if (id !== 1) { //id is 1 if no start and end query params
            // Start one day earlier for the snow depth check.
            // Since I am coloring the cell orange if the last snow depth
            // check was more than 0 I need to be able to check 24 hours 
            // in the past
            query += ' WHERE date BETWEEN "' + subtractDays(start, 1) + '" AND "' + end + '"';
        }

        var lastSnow = 0;
        var lastTemp = 0;
        var numberOfChecksSinceSnow = 0;
        db.each(query, function (err, row) {
            var colors = {
                'safe': '#350AFF',
                'snow': '#FC4646',
                'warning': '#FF752D'
            };
            var color = colors.safe;
            if (row.snow === 'True' || row.snowdepth > 0) {
                color = colors.snow;
            }
            else if (numberOfChecksSinceSnow <= 7) {
                color = colors.warning;
            }
            else if (lastSnow > 0) {
                lastSnow = 0;
                // Clear the warnings since last snowdepth was encountered
                for (var i = 0; i <= 7; i++) {
                    var index = result.length - i - 1;
                    if (result[index].color === colors.snow) {
                        // Break when we hit a snow colored event
                        break;   
                    }
                    result[index].color = colors.safe;
                }
            }

            // Snow/Temp change icon
            var increase = '▲';
            var decrease = '▼';
            var snowChangeIcon = '';
            var tempChangeIcon = '';

            if (row.snowdepth > lastSnow) {
                snowChangeIcon = increase;
            }
            else if (row.snowdepth < lastSnow) {
                snowChangeIcon = decrease;
            }

            if (row.temp > lastTemp) {
                tempChangeIcon = increase;
            }
            else if (row.temp < lastTemp) {
                tempChangeIcon = decrease;
            }

            lastTemp = row.temp;

            var snowDepth = row.snowdepth;
            if (typeof snowDepth == 'number') {
                snowDepth = '\n Snowdepth: ' + snowDepth + 'cm ' + snowChangeIcon;
                lastSnow = row.snowdepth; 
                numberOfChecksSinceSnow = 0;
            }
            else {
                numberOfChecksSinceSnow += 1;
            }
            var obj = {
                'date': row.date,
                'title': row.desc + 
                    snowDepth +
                    '\n Temperature: ' + row.temp + '°C ' + tempChangeIcon,
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
    getSnowFreePeriod(function (list) {
        var lastDate = new Date(list[list.length-1].start);
        for (var i = 0; i < people.length; i++) {
            var personDate = new Date(people[i].date);
            if (personDate < lastDate) {
                people[i].color = 'red';
            }
        }
        res.json(people);
    });
});

app.get('/api/snowfreeperiod', function (req, res) {
    getSnowFreePeriod(function (x) {
        res.json(x);
    });
});

function getSnowFreePeriod(cb) {
    var snowFreePeriodID = 'snowfreeperiod';
    cache.get('snowfreeperiod', function (err, result) {
        if (err) {return;}
        if (result) {
            cb(result);
            return;
        }
        var lastSnowQuery = 'SELECT * FROM weather WHERE snow="True" OR snowdepth!="" ORDER BY date DESC LIMIT 1';
        var db = new sqlite3.Database('../snow.db');

        db.get(lastSnowQuery, function (err, row) {
            var date = row.date.split(' ')[0];
            var periodList = generatePeriod(date, 21);
            cb(periodList);
            cache.set('snowfreeperiod', periodList);
        });
        db.close();
    });
}

function generatePeriod(startDate, days) {
    var date = new Date(startDate);
    var result = [];
    for (var i = 1; i < days + 1; i++) {
        var newDate = new Date(date).setDate(date.getDate() + i);
        // setDate seems to return a string in unix time...
        // So turn into a json string in the format of yyyy-mm-ddThh:mm:ss
        newDate = new Date(newDate).toJSON();
        // And return the date in an 'allDay' calendar object
        result.push({
            'title': 'Potential 21 days of no snow',
            'start': newDate,
            'end': newDate,
            'allDay': true,
            'color': '#3CFF37'
        });
    }
    return result;
}

/*
 *  Takes in date in any form supported by the Date object constructer
 *  but will return the date in the form 'yyyy-mm-dd'
 */
function subtractDays(date, days) {
    var obj = new Date(date);
    obj.setDate(obj.getDate() - days);
    obj = new Date(obj);
    var month = obj.getMonth() + 1;
    if (month < 10) {
        month = '0' + month;
    }
    var day = obj.getDate();
    if (day < 10) {
        day = '0' + day;
    }
    return obj.getFullYear() + '-' + month + '-' + day;
}


app.listen(app.get('port'), function () {
    console.log('Listening on port %d', app.get('port'));
});
