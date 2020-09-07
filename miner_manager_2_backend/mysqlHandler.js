const mysql = require('mysql2');
const moment = require('moment');

module.exports.init = async function init(){
    let pool = mysql.createPool({
        host:process.env.mysqlHost,
        user:process.env.mysqlUser,
        password:process.env.mysqlPass,
        database:process.env.mysqlTable
    });
    global.mysqlConnection = pool.promise();
}

module.exports.hiveToken = async function hiveToken(setTokenTo,setTokenDies=moment().add(14,"days")){
    if(typeof setTokenTo==="undefined"){
        let [token] = await global.mysqlConnection.query("SELECT hiveToken,hiveTokenDies FROM config;");
        // console.log(token);
        return token[0];
    }
    else{
        console.log("setting db hive token to %s",setTokenTo);
        await global.mysqlConnection.query("UPDATE config SET ?;",[{hiveToken:setTokenTo,hiveTokenDies:moment(setTokenDies).toDate()}]);
    }
}

module.exports.writeRecord = async function writeRecord(startTime,electricityPrice,powerConsumption,minedAmount,coinPrice,coin,minersRunning){
    let minute = startTime.minutes();

    if(minute>=0 && minute<30){
        startTime.minutes(0);
    }
    else{
        startTime.minutes(30);
    }

    startTime.seconds(0);
    

    let data = {
        startTime:startTime.toDate(),
        electricityPrice:electricityPrice,
        powerConsumption:powerConsumption,
        minedAmount:minedAmount,
        coinPrice:coinPrice,
        coin:coin,
        minersRunning:!minersRunning
    }

    // console.log(data);

    let [existing] = await global.mysqlConnection.query("SELECT * FROM historyrecords WHERE startTime between ? and ?;",[startTime.clone().subtract(1,"second").toDate(),startTime.clone().add(29,"minutes").toDate()]);
    // console.log(existing);
    if(existing.length>1){
        await global.mysqlConnection.query("DELETE FROM historyrecords WHERE startTime between ? and ?;",[startTime.clone().subtract(1,"second").toDate(),startTime.clone().add(29,"minutes").toDate()]);
        existing.length=0;
    }

    if(existing.length===0){
        console.log("Writing History Record");
        await global.mysqlConnection.query("INSERT INTO historyrecords SET ?;",[data]);
        
    }
    else{
        console.log("Updating History Record");
        // console.log(existing[0])
        await global.mysqlConnection.query("UPDATE historyrecords SET ? WHERE recordID=?;",[data,existing[0].recordID]);
    }
    
}

