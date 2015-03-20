# Snowbet tracker
## Description
A super simple application that crawls the icelandic weather API for the weather in Reykjavik Iceland and logs what the weather is. The reason for this is simply because a few of us made a bet on when it'd stop snowing and decided that a period of 3 weeks (21 days) of no reported snowing would be accepted as "winter is over".

The first issue was, how the hell do we track 21 consecutive days of weather? Obviosuly a by writing some program and voila, here it is.

## Hot it works
The `fetch_weather.py` is run once every hour by a cron job. It logs to a sqlite3 database. Then there's a nodejs application that exposes the data through an api and finally a [full calendar](http://fullcalendar.io) on top of it to display the info.

## Demo
An example can be seen running [here](http://frozen.absalon.is) at least while the bet is on (up until may 2015 ish)
