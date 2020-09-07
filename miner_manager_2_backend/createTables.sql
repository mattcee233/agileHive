CREATE TABLE `historyrecords` (
  `recordID` int NOT NULL AUTO_INCREMENT,
  `startTime` datetime DEFAULT NULL,
  `electricityPrice` float DEFAULT NULL,
  `powerConsumption` float DEFAULT NULL,
  `minedAmount` float DEFAULT NULL,
  `coinPrice` float DEFAULT NULL,
  `coin` varchar(45) DEFAULT NULL,
  `minersRunning` tinyint DEFAULT NULL,
  `electricityPaid` tinyint DEFAULT '0',
  PRIMARY KEY (`recordID`),
  UNIQUE KEY `recordID_UNIQUE` (`recordID`)
) ENGINE=InnoDB;

CREATE TABLE `config` (
  `idconfig` int NOT NULL AUTO_INCREMENT,
  `hiveToken` varchar(255) DEFAULT NULL,
  `hiveTokenDies` datetime DEFAULT NULL,
  PRIMARY KEY (`idconfig`)
) ENGINE=InnoDB;

