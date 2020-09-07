require("dotenv").config();
const express = require('express')
const app = express()
const port = 4000;
global.moment=require("moment");
global.axios=require("axios");






global.pricesUpdated=moment().subtract(20,"minutes");
global.costsUpdated=moment().subtract(18,"hours");



app.get("/currentRate",async (req,res)=>{
  
  res.json({currentRate:currentRate});
});

app.get("/cryptoPrice",async (req,res)=>{
  
  
  // console.log(global);
  res.json(responseObject);
});

app.get("/cryptoHoldings",async (req,res)=>{
  let accountData = await authedClient.getAccounts();
  let nonZeroAccounts = accountData.filter(acct=>Number(acct.balance)>0);
  res.json(nonZeroAccounts);
});

app.get("/currentEarnRate",async (req,res)=>{
  let etherStats = await axios.get(process.env.etherMineBaseURI+"/currentStats");
  let currentRate = etherStats.data.data.coinsPerMin;
  // console.log(etherStats);
  currentEarnRate = currentRate * global.ethPrice;
})


app.get("/minerData",async (req,res)=>{
  let dataResponse = await hiveHandler.minerData();
  res.json(dataResponse);
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
