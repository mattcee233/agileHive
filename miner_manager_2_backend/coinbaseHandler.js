const axios = require('axios');
const moment = require('moment');

const coinbasePro = require('coinbase-pro');
const publicClient = new coinbasePro.PublicClient();
const authedClient = new coinbasePro.AuthenticatedClient(
    process.env.coinbaseAPIKey,
    process.env.coinbaseAPISecret,
    process.env.coinbaseAPIPassphrase
);

let pricesLastUpdated=moment().subtract(20,"minutes");
let currentPrices={};
let coinList=process.env.coinList;
// console.log(coinList);
coinList=coinList.split(",").map(coin=>coin.toUpperCase()); // take .env coin list, split it and ensure all coins in upper case
let updateTimer;
let gettingCoins = false;
module.exports.updateCryptoPrices = async function updateCryptoPrices(){
    if(gettingCoins===false){
        gettingCoins=true;
        let coinData;
        let newPrices={}; // save existing prices just in case anything below breaks, that way we can revert if required;
        try{
            if(pricesLastUpdated.isBefore(moment().subtract(9,"minutes"),"minute")){
                for(let coin of coinList){
                    coinData = await publicClient.getProductTicker(coin+"-GBP");
                    if(typeof coinData.price!=="undefined"){
                        newPrices[coin]=Number(coinData.price);
                    }
                }
                pricesLastUpdated = moment();
                currentPrices=newPrices;
            }
            // console.log(newPrices);
            
        }     
        catch(err){
            console.log(err);
        }

        if(typeof updateTimer==="undefined"){
            updateTimer = setInterval(updateCryptoPrices,10*60*1000); // re-run in 10 mins
        }
        gettingCoins=false;
    }
   
}
// updateCryptoPrices(); // start the loop running immediately


module.exports.getCryptoPrice = async function getCryptoPrice(coin){
    while(gettingCoins===true){
        // currently getting coin prices, wait a bit...
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    coin=coin.toUpperCase();
    if(typeof currentPrices[coin] !== "undefined" && coinList.includes(coin)){
        return currentPrices[coin];
    }
    else{
        console.log(coin);
        console.log(currentPrices);
        console.log(currentPrices[coin]);
        console.log(coinList);
        throw "Coin price not found in array..."
    }
}

