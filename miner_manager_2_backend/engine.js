let dotenv = require('dotenv').config();
let moment=require('moment');

let ethermineHandler=require("./ethermineHandler");
let coinbaseHandler=require("./coinbaseHandler");
let hiveHandler=require("./hiveHandler");
let octopusHandler=require("./octopusHandler");
let mysqlHandler=require("./mysqlHandler");
mysqlHandler.init();

let updateTimes={};

let shutdownTimer;
let nextScheduledShutdownTime;
let nextShutdownDuration;

async function main(){
    try{
        await coinbaseHandler.updateCryptoPrices();
        await hiveHandler.init();
    }
    catch(err){
        console.log("FAILURE DURING STARTUP!!!");
        console.log(err);
        process.exit();
    }
    await statusUpdate();
}
async function statusUpdate(){
    // await octopusHandler.getPriceAtTime();
    
    try{
        let halfHourEarnRate = await ethermineHandler.getCurrentEarnRate();
        halfHourEarnRate=halfHourEarnRate/2;
        
        let electricityBurnRate = await hiveHandler.electricityConsumption();
        // console.log(halfHourEarnRate);
        // console.log(electricityBurnRate);
        let currentProfitPerKwh=halfHourEarnRate/(electricityBurnRate/2);
        let currentElectricityPrice = await octopusHandler.getPriceAtTime();
        let profitableStatus = currentElectricityPrice<currentProfitPerKwh;

        
        let secondsToNextShutdown = await octopusHandler.getTimeTilProfitLoss(currentProfitPerKwh,false);
        let nextShutdown = moment().add(secondsToNextShutdown+1,"seconds");
        
        
        let secondsToNextStartup = await octopusHandler.getTimeTilProfitLoss(currentProfitPerKwh,true);
        if(secondsToNextStartup<secondsToNextShutdown){
            secondsToNextStartup= await octopusHandler.getTimeTilProfitLoss(currentProfitPerKwh,true,moment().add(secondsToNextShutdown,"seconds"));
        }
        let nextStartup = moment().add(secondsToNextStartup+1,"seconds");

        await hiveHandler.areMinersOnline();

        console.log("--- STATUS REPORT : "+moment().format("DD/MM/YY HH:mm")+" ---");
        
        
        console.log("\tElectricity Consumption Rate: %s kW",electricityBurnRate);
        console.log("\tCurrent Electricity Price: %s p/kWh",currentElectricityPrice);
        console.log("\tCurrent Half Hourly Costs: %s p",(electricityBurnRate*currentElectricityPrice)/2);
        console.log("\tCurrent Half Hourly Income: %s p",halfHourEarnRate);
        console.log("\tProfit/Half Hour: %s p",halfHourEarnRate-((electricityBurnRate/2)*currentElectricityPrice));
        console.log("\tCurrently Profitable?: %s - cutoff is %s p",profitableStatus,currentProfitPerKwh);
        console.log("---")
        console.log("\tMiners Offline?: %s",global.minersOffline);
        if(secondsToNextShutdown>0){
            console.log("\tNext Shutdown at "+nextShutdown.format("DD/MM/YYYY HH:mm")+" (%s secs)",secondsToNextShutdown);
            console.log("\tNext Startup at "+nextStartup.format("DD/MM/YYYY HH:mm")+" (%s secs)",secondsToNextStartup);
            let shutdownDuration = secondsToNextStartup-secondsToNextShutdown;
            if(typeof shutdownTimer==="undefined" && global.minersOffline===false){
                
                console.error("\tSetting next shutdown duration for %s seconds (start "+nextShutdown.format("HH:mm:ss")+", end "+nextStartup.format("HH:mm")+")" ,shutdownDuration);
                shutdownTimer=setTimeout(()=>{hiveHandler.stopMiners(shutdownDuration+180)},nextShutdown.subtract(1,"minute").diff(moment(),"milliseconds"));
                nextScheduledShutdownTime=nextShutdown;
                nextShutdownDuration=shutdownDuration;
            }
            else if(!(nextScheduledShutdownTime.isSame(nextShutdown.clone().subtract(1,"minute"),"minute")&&shutdownDuration===nextShutdownDuration)){
                console.log("Shutdown time calculated is different from time scheduled... moving schedule...");
                console.log(nextScheduledShutdownTime.format());
                console.log(nextShutdown.format());
                console.error("\tSetting next shutdown duration for %s seconds (start "+nextShutdown.format("HH:mm:ss")+", end "+nextStartup.format("HH:mm")+")" ,shutdownDuration);
                clearTimeout(shutdownTimer);
                shutdownTimer=setTimeout(()=>{hiveHandler.stopMiners(shutdownDuration+180)},nextShutdown.subtract(1,"minute").diff(moment(),"milliseconds"));
                nextScheduledShutdownTime=nextShutdown;
                nextShutdownDuration=shutdownDuration;
            }

            else{
                console.log("\tNext shutdown is already scheduled...");
            }
            
        }
        else{
            console.log("\tLooks like it's always profitable at the moment... not shutting down for forseeable future...");
            if(typeof shutdownTimer!=="undefined"){
                clearTimeout(shutdownTimer);
            }
        }

        
        if(process.env.mysqlHost!==""){
            await mysqlHandler.writeRecord(moment(),currentElectricityPrice,electricityBurnRate,await ethermineHandler.getCurrentCoinRate()/2,await coinbaseHandler.getCryptoPrice("ETH"),"ETH",global.minersOffline);
        }
        

        console.log("---------------------");
        setTimeout(statusUpdate,process.env.updateInterval*60000);
    }
    catch(err){
        console.log("------- FAIL ERROR DURING UPDATE PERIOD ------");
        console.log(err);
        setTimeout(statusUpdate,30000);
    }
    
    // console.log(await octopusHandler.getTimeTilProfitLoss(currentProfitPerKwh,"profit"));
    // console.log(await octopusHandler.getPriceAtTime(moment().add(await octopusHandler.getTimeTilProfitLoss(currentProfitPerKwh),"seconds")));
    // console.log(await octopusHandler.getTimeTilProfitLoss(currentProfitPerKwh,"loss"));
    // console.log(await octopusHandler.getPriceAtTime(moment().add(await octopusHandler.getTimeTilProfitLoss(currentProfitPerKwh,"loss"),"seconds")));
}

main();

