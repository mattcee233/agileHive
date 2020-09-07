# agileHive
HIVE.OS controller for Agile Octopus tariff in the UK - stops HIVE.OS mining rigs when not profitable based on ETH price vs Agile costs*power consumption

This software is very much "under development" at this point but the basics are working!

To get it up and running you need to install Node.JS -> https://nodejs.org/

Install+Run
-------
1. Put files in any directory

2. Configure by adding data to template.env -> save file as .env when completed 

- Optional: Setup MySQL database if wanted - see below

3. Navigate to directory using command prompt/terminal

4. Run "npm install" 

5. Then run "nodemon engine.js"

MySQL Logging (Optional)
----------
If you have a MySQL server available (you can go get the community one for free from https://dev.mysql.com/downloads/mysql/) this software can also log electricity price, ETH price, approx amounts mined, electricity consumption etc on a half hourly basis - Just add your server details to the .env config file and run createTables.sql in your database before starting engine.js

Feature requests etc
-------------
Feedback and feature requests are very much encouraged, drop a comment on the github issues page -> https://github.com/mattcee233/agileHive/issues


Donations
--------
Donations always gratefully recieved!

BTC - 34PmA8aobVWF7bpcwUNnVPNoY6LjPfGWrW

BCH - qp2ac43qz3y3wc6vzdy0qauawmkkr8hrdgpf9682r4

LTC - MWLtRF1EiH2tsM8hUdNLwyZBtBENbXQhTT

ETH - 0x5CE85328758c0DA133e951535566a7f0c23759c1

ETC - 0x0E802d60B2C24451d5Eec5544170cCe46700cf42

RVN - RSsTiHsGSZ57emtddJxCJxiPxLMAkpmq1p