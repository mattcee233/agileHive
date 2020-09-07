const axios = require('axios');
const moment = require('moment');
const authenticator = require('authenticator');
const mysqlHandler = require("./mysqlHandler");


let hiveToken;
let workerList=[];

module.exports.init = async function init(forceNewToken=false){

    let mysqlToken = await mysqlHandler.hiveToken();
    // console.log(mysqlToken);
    if(moment(mysqlToken.hiveTokenDies).isAfter(moment()) && forceNewToken===false){
        console.log("Got HIVE token from DB");
        
        try{
            hiveToken = mysqlToken.hiveToken;
            await getData("/farms")
            console.log("HIVE Token still good!");
            setTimeout(refreshHiveToken,moment(mysqlToken.hiveTokenDies).diff(moment(),"milliseconds"));
        }
        catch(err){
            // console.log(err);
            console.log("Token doesn't appear to work, getting a new one...");
            await init(true);
        }

        

    }
    else{


        
        let authCode = authenticator.generateToken(process.env.hiveAuthenticatorKey);
        // console.log(authCode);
        let bodyMessage = JSON.stringify({login:process.env.hiveMasterUser, password:process.env.hiveMasterPass,twofa_code:authCode,remember:true});
        // console.log(bodyMessage);
        let hiveResponse;
        try{
            hiveResponse = await axios.post(process.env.hiveBaseURI+"/auth/login",bodyMessage,{
                headers: {
                    'Content-Type': 'application/json',
                }
                
            });
        }
        catch(err){
            console.log(err);
            console.log(err.response.data)
        }
        if (!hiveResponse.status===200) {
                
            console.error(hiveResponse.statusText || 'Response error');
            // throw new Error(responseData.message || 'Response error');
        }
        else {
            // hiveToken = responseData.access_token;
            // console.log(hiveResponse.data.access_token);
            console.log("HIVE API Connection Established... - Token dies in "+moment.duration({seconds:hiveResponse.data.expires_in}).humanize() + "...");
            hiveToken = hiveResponse.data.access_token;
            await mysqlHandler.hiveToken(hiveToken,moment().add(14,"days"));
            setTimeout(refreshHiveToken,(hiveResponse.data.expires_in-30)*1000);
            // return hiveResponse.data.data;
        }

    }
}

async function refreshHiveToken(){
    try{
        console.log("Refreshing API token...")
        let newToken = await axios.post(process.env.hiveBaseURI+"/auth/refresh",{
        headers: {
            'Authorization': `Bearer ${hiveToken}`,
        }
        });
        console.log("Got new token! - Token dies in "+moment.duration({seconds:newToken.data.expires_in}).humanize() + "...");
        hiveToken = newToken.data.access_token;
        await mysqlHandler.hiveToken(hiveToken,moment().add(14,"days"));
        setTimeout(refreshHiveToken,(newToken.data.expires_in-30)*1000);
    }
    catch(err){
        console.log(err.response.data)
        console.log("Token refresh failed, trying to get a new token...");
        await getHiveToken();
    }
}




async function getData(endpoint){
    // await checkToken();
    let hiveResponse = await axios.get(process.env.hiveBaseURI+endpoint, {
        
        headers: {
            'Authorization': `Bearer ${hiveToken}`,
        }
    });
    // console.log(farmResponse.data.data);

    // let responseData = await farmResponse.json();

    if (!hiveResponse.status===200) {
            
        console.error(hiveResponse.statusText || 'Response error');
        // throw new Error(responseData.message || 'Response error');
    }
    else {
        // hiveToken = responseData.access_token;
        // console.log(hiveResponse);
        return hiveResponse.data;
    }
}

async function sendCommand(endpoint,command,payload){
    // await checkToken();
    // console.log("sending "+command+" command with data "+JSON.stringify(payload)+" to " + endpoint + " endpoint...")
    let hiveResponse;
    if(command){
        try{
            // console.log(JSON.stringify({command:command,data:{...payload}}));
            hiveResponse = await axios.post(
                process.env.hiveBaseURI+endpoint,
                JSON.stringify({
                    command:command,
                    data:{...payload}
                }),
                {            
                    headers: {
                        'Authorization': `Bearer ${hiveToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
        }
        catch(err){
            console.log("unable to send command...")
            console.log(err);
            console.log(err.response.data)
        }
    }
    else{
        hiveResponse = await axios.post(hiveBaseURI+endpoint, {
        
            headers: {
                'Authorization': `Bearer ${hiveToken}`,
             
            }
        });

    }
    // console.log(farmResponse.data.data);

    // let responseData = await farmResponse.json();

    if (!hiveResponse.status===200) {
            
        console.error(hiveResponse.statusText || 'Response error');
        // throw new Error(responseData.message || 'Response error');
    }
    else {
        // hiveToken = responseData.access_token;
        // console.log("Success!");
        return hiveResponse.data.data;
    }

}

module.exports.stopMiners = async function stopMiners(duration=1800){

    // let farmData = await getData("/farms");
    // farmData = farmData.data;

    if(workerList.length<1){
        await this.minerData();
    }
    
    for (let worker of workerList){
        if(process.env.shutdownType==="hard"){
        // loop through workers and shutdown with a restart timer of {duration} length       
            await sendCommand(worker+"/command","exec",{cmd:"sreboot wakealarm "+duration});
        }
        else{
            await sendCommand(worker+"/command","miner", {"action":"stop","miner_index":0});
            setTimeout((worker)=>{sendCommand(worker+"/command","miner", {"action":"restart","miner_index":0})},duration*1000,worker);
        }
        // await sendCommand(worker+"/command","miner stop");
    }

    global.minersOffline=true;
    global.recoveryPeriod=true;
    setTimeout(()=>{global.recoveryPeriod=false},(duration*1000)+7200000);
    

}


module.exports.minerData = async function minerData(){
    let returnData=[];
    let farmData = await getData("/farms");
    farmData = farmData.data;
    let farmPoint={};
    workerList=[];

    for (let farm of farmData){
        farmPoint.farm=farm;
        // console.log("--- Data for farm '"+farm.name+"' ---")
        // farmPoint = "/farms/"+farm.id;
        let farmWorkers = await getData("/farms/"+farm.id+"/workers");
        farmPoint.workers = farmWorkers.data;
        for(let worker of farmWorkers.data){
            workerList.push("/farms/"+farm.id+"/workers/"+worker.id);
        }
        // console.log(workerList);
        returnData.push(farmPoint);
        farmPoint={};
    }
    return returnData;
}

module.exports.electricityConsumption = async function electricityConsumption(){
    let tempMinerDataStore = await this.minerData();
    // console.log(tempMinerDataStore);
    let powerConsumption=0;
    for(let farm of tempMinerDataStore){
        for(let worker of farm.workers){
            // console.log(worker.stats.power_draw);
            if(typeof worker.stats.power_draw!=="undefined"){
                powerConsumption+=worker.stats.power_draw;
            }
        }
    }
    if(isNaN(powerConsumption)){
        powerConsumption=1200;

    }

    
    
    // let workerFullData=[];
    // for(let miner of tempMinerDataStore.workers){
    //     let workerTempData = await getData(miner);
    //     console.log(workerTempData);
    // }
    return (powerConsumption+150)/1000;
}



module.exports.currentHashRate = async function currentHashRate(){
    let tempMinerDataStore = await this.minerData();
    // console.log(tempMinerDataStore);
    let hashrate=0;
    for(let farm of tempMinerDataStore){
        for(let worker of farm.workers){
            // console.log(worker.miners_summary.hashrates);
            if(typeof worker.miners_summary.hashrates[0].hash!=="undefined"){
                
                hashrate+=worker.miners_summary.hashrates[0].hash;
                // console.log(hashrate);
            }
            
        }
    }
    return hashrate/1000; // comes in as kH/s, convert to MH/s
    // if(isNaN(powerConsumption)){
    //     powerConsumption=1200;
    // }
    // let workerFullData=[];
    // for(let miner of tempMinerDataStore.workers){
    //     let workerTempData = await getData(miner);
    //     console.log(workerTempData);
    // }
    // return powerConsumption/1000;
}


module.exports.areMinersOnline = async function areMinersOnline(){
    let tempMinerDataStore = await this.minerData();
    // let minerStatus=false;
    // console.log(tempMinerDataStore);
    // let powerConsumption=0;
    for(let farm of tempMinerDataStore){
        for(let worker of farm.workers){
            
            if(worker.stats.online===true){
                // minerStatus=true;
                global.minersOffline=false;
                return true;
            }
        }
    }
    global.minersOffline=true;
    return false;
}