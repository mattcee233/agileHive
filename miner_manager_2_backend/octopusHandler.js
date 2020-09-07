const moment = require('moment');
const axios = require('axios');
const e = require('express');

let rates=[];
module.exports.getPriceAtTime = async function getPriceAtTime(timeToGet = moment()){
  let currentRates = await getTrimmedRates();
  
  let currentPeriod = currentRates.filter(period=>{return (moment(period.valid_from).isBefore(timeToGet) && moment(period.valid_to).isAfter(timeToGet))});
  
  let currentRate = currentPeriod[0].value_inc_vat;
  // console.log(currentRate);
  return currentRate;
}

module.exports.getTimeTilProfitLoss = async function getTimeTilProfit(price,nextProfit=true,after=moment()){
  if(typeof price==="undefined"){
    throw "No Price Provided"
  }

  price = price*process.env.shutdownMultiplier;
  
  let currentRates = await getTrimmedRates(after,false);

  let nextPeriod;
  if(nextProfit){
    nextProfit = moment.min(currentRates.filter(period=>period.value_inc_vat<price).map(period=>moment(period.valid_from)));

  }
  else{
    nextProfit = moment.min(currentRates.filter(period=>period.value_inc_vat>=price).map(period=>moment(period.valid_from)));
  }

  return moment(nextProfit).diff(moment(),"seconds");

}



async function getTrimmedRates(trimTime=moment(),includeTrimTime=true){
  let trimmedRates;
  if(includeTrimTime){
    trimmedRates=rates.filter(period=>{return moment(period.valid_to).isAfter(trimTime)});
  }
  else{
    trimmedRates=rates.filter(period=>{return moment(period.valid_from).isAfter(trimTime)})
  }
  if(trimmedRates.length<1){
    await getUpcomingPrices();
    trimmedRates =  await getTrimmedRates(trimTime);
  }
  return trimmedRates;
}

async function getUpcomingPrices(){
  let rateInfo;
  try{
    rateInfo = await axios.get(process.env.octopusBaseURI+"products/AGILE-18-02-21/electricity-tariffs/E-1R-AGILE-18-02-21-E/standard-unit-rates/",{auth:{username:process.env.octopusAPIKey,password:""}});
    rates = rateInfo.data.results;
  }
  catch(err){
    console.log("Unable to get Octopus pricing...");
    console.log(err);
  }
    
    // console.log(rates);
    return rates;
}