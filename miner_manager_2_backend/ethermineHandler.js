const moment = require('moment');
const axios = require('axios');
const coinbaseHandler = require('./coinbaseHandler');
const hiveHandler = require('./hiveHandler');

let currentEarnRate;
let currentCoinRate,estimatedCoinRate;
let currentETHExchangeRate;

module.exports.getCurrentEarnRate = async function getCurrentEarnRate(){
    if(global.minersOffline!==true && global.recoveryPeriod!==true){
        let ethRate = await this.getCurrentCoinRate();
        // console.log(etherStats.data.data.coinsPerMin);
        let ethExhangeRate = await coinbaseHandler.getCryptoPrice("ETH");
        // console.log(ethExhangeRate);
        currentETHExchangeRate=ethExhangeRate;
        currentEarnRate = ethRate*currentETHExchangeRate*100; // £/h
    }
    return currentEarnRate;
    
}


module.exports.getCurrentCoinRate = async function getCurrentCoinRate(){
    let estimate = await this.estimateCurrentCoinRate();
    let calculated = 0;

    // let etherStats,ethMineStats,mostRecentBlocks;
    if(global.minersOffline!==true && global.recoveryPeriod!==true){
        try{
            let etherStats = await axios.get(process.env.etherMineBaseUrl+process.env.etherMineBaseMiner+"/rounds");
            etherStats=etherStats.data.data;
            etherStats=etherStats.slice(0,process.env.calculateBlockRewardOverXBlocks*3);
            // console.log(etherStats);
            let blockDistTotal=0;
            let roundsTotalEarnings;
            // blockDistTotal=etherStats[0].block-etherStats[etherStats.length-1].block;
            let blockDistTimeStart=await axios.get("https://api.etherscan.io/api?module=block&action=getblockreward&blockno="+etherStats[etherStats.length-1].block+"&apikey="+process.env.etherScanAPIKey);;
            let blockDistTimeEnd=await axios.get("https://api.etherscan.io/api?module=block&action=getblockreward&blockno="+etherStats[0].block+"&apikey="+process.env.etherScanAPIKey);
            // console.log(blockDistTimeStart.data.result.timeStamp);
            // console.log(blockDistTimeEnd.data.result.timeStamp);
            blockDistTimeStart=moment.unix(blockDistTimeStart.data.result.timeStamp);
            blockDistTimeEnd=moment.unix(blockDistTimeEnd.data.result.timeStamp);
            // console.log(blockDistTimeStart);
            // console.log(blockDistTimeEnd);

            let blockDistTime = blockDistTimeEnd.diff(blockDistTimeStart,"seconds");
            // let timeDiff=moment.duration(blockDistTimeStart.data.result.timeStamp-blockDistTimeEnd.data.result.timeStamp,"second");
            // console.log(blockDistTime);
            
            roundsTotalEarnings=etherStats.map(block=>(Number(block.amount)/1000000000000000000)).reduce((sum,current)=>sum+current,0);

            let ethMineStats = await axios.get(process.env.etherMineBaseUrl+"poolStats");
            ethMineStats = ethMineStats.data.data.poolStats.blocksPerHour;

            calculated = (roundsTotalEarnings/(blockDistTime/3600));
            calculated=calculated*process.env.blockRewardScaleFactor;
            console.log("calculated eth rate per hour = "+calculated+" vs estimated = "+estimate);



        }
        catch(err){
            console.log("unable to get ethermine data...");
            console.log(err);
        }
        // return currentCoinRate;
    }
    let returnValue;
    if(calculated<estimate*process.env.estimateToCalculatedSwitchover){
        console.log("using estimated value")
        returnValue=estimate;
    }
    else{
        console.log("using calculated value")
        currentCoinRate=calculated;
        returnValue=calculated;
    }
    
    if(global.minersOffline===true){
        return 0;
    }
    else{
        return returnValue;
    }
    
    
    // return currentCoinRate;
}

module.exports.estimateCurrentCoinRate = async function estimateCurrentCoinRate(){
    let etherStats,ethMineStats,mostRecentBlocks;
    if(global.minersOffline!==true && global.recoveryPeriod!==true){
        try{
            // etherStats = await axios.get(process.env.etherMineBaseUrl+process.env.etherMineBaseMiner+"/currentStats");
            // if(typeof etherStats.data.data.coinsPerMin!=="undefined"){
            //     currentCoinRate=etherStats.data.data.coinsPerMin*60; // coins per hour
            // }
            ethMineStats = await axios.get(process.env.etherMineBaseUrl+"poolStats");
            // console.log(ethMineStats.data);
            mostRecentBlocks = ethMineStats.data.data.minedBlocks;
            ethMineStats = ethMineStats.data.data.poolStats;
            // console.log(ethMineStats);
            // console.log(ethMineStats.hashRate/1000000);
            let currentHashRate = await hiveHandler.currentHashRate();
            let blockReward = await this.getBlockReward(mostRecentBlocks);
            // console.log(currentHashRate);
            let calculatedCoinRate = ((ethMineStats.blocksPerHour*blockReward)/ethMineStats.hashRate)*(currentHashRate)*1000000;
            if(!isNaN(calculatedCoinRate)){
                if(calculatedCoinRate>0){
                    // console.log(calculatedCoinRate);
                    estimatedCoinRate = calculatedCoinRate;
                }
                else{
                    calculatedCoinRate=1;
                }
            }
            // console.log(currentCoinRate*24);
        }
        catch(err){
            console.log("unable to get ethermine data...");
            console.log(err);
        }
        // return currentCoinRate;
    }
    
    if(global.minersOffline===true){
        return 0;
    }
    else{
        return estimatedCoinRate;
    }
    
    
    // return currentCoinRate;
}


let currentBlockReward;
module.exports.getBlockReward = async function getBlockReward(blocks){
    if(typeof blocks==="undefined"){
        ethMineStats = await axios.get(process.env.etherMineBaseUrl+"poolStats");
        blocks=ethMineStats.data.data.minedBlocks[0].number;
    }
    // console.log(block);
    blocks=blocks.slice(0,Number(process.env.calculateBlockRewardOverXBlocks));
    let blockRewards=0;
    let blockCount=0;
    for(let block of blocks){
        let blockRewardData = await axios.get("https://api.etherscan.io/api?module=block&action=getblockreward&blockno="+block.number+"&apikey="+process.env.etherScanAPIKey);
        while(blockRewardData.data.message==="NOTOK"){
            await new Promise(resolve => setTimeout(resolve, 200));
            blockRewardData = await axios.get("https://api.etherscan.io/api?module=block&action=getblockreward&blockno="+block.number+"&apikey="+process.env.etherScanAPIKey);
        }
        if(!isNaN(blockRewardData.data.result.blockReward)){
            blockRewards+=blockRewardData.data.result.blockReward/1000000000000000000;
            blockCount++;
        }
        
    }

    if(blockCount>0){
        currentBlockReward=blockRewards/blockCount;
    }
    return currentBlockReward*process.env.blockRewardScaleFactor;
}