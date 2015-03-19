#!/usr/bin/python
import requests
import sqlite3

API_ENDPOINT = 'http://apis.is/weather/observations/en?stations=1'
SNOW_KEYWORDS = ['sleet', 'snow', 'hail']
DB_NAME = 'snow.db'

def get_weather():
    response = requests.get(API_ENDPOINT)
    if response.ok:
        result = response.json()['results'][0]
        weather = {
            'time': result['time'],
            'description': result['W'],
            'snow': any(x in result['W'].lower() for x in SNOW_KEYWORDS)
        }

        if len(weather['description']):
            # Don't bother if the weather description is missing
            return weather

def write_to_db(entry):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    # Create the table if it doesn't exist
    c.execute('''CREATE TABLE IF NOT EXISTS weather
                 (date text, desc text, snow boolean)''')

    c.execute('SELECT * FROM weather WHERE date=\'{}\''.format(entry['time']))
    if not c.fetchone():
        # Only insert if the date hasn't already been inserted
        c.execute('''INSERT INTO weather VALUES 
                     ('{date}', '{desc}', '{snow}')'''.format(
            date=entry['time'], desc=entry['description'], snow=entry['snow']))
    conn.commit()
    conn.close()

weather = get_weather()
if weather:
    write_to_db(weather)
