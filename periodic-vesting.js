/***
 *  Script that adds periodic vesting account to genesis, see help for usage
 *  Settings
 * ***/

const ADDRESS_PREFIX = "juno";
const GENESIS_TIME = "1633100400"; // string
const DENOM = "ujuno";

const { bech32 } = require("bech32");
const fs = require("fs");
const neatCsv = require("neat-csv");

var printHelp = () => {
  console.log("=====");

  console.log(
    "Usage: npm run add-vesting-account <address> <periods csv> <genesis file>"
  );
  console.log(
    "Example: npm run add-vesting-account juno190g5j8aszqhvtg7cprmev8xcxs6csra7xnk3n3 /tmp/periods.csv ~/.juno/config/genesis.json"
  );
  console.log("=====\n");
};

var checkArgs = () => {
  var [node, path, address, periodsFile, genesisFile] = process.argv;

  if (process.argv.length !== 5) {
    printHelp();

    console.log("Missing arguments");
    return false;
  }

  try {
    var decoded = bech32.decode(address);
    if (decoded.prefix !== ADDRESS_PREFIX) {
      printHelp();

      console.log("Address not valid");
      return false;
    }
  } catch (e) {
    printHelp();

    console.log("Address not valid");
    return false;
  }

  return [address, periodsFile, genesisFile];
};

var formatPeriodicVestingAccount = (address) => {
  return {
    "@type": "/cosmos.vesting.v1beta1.PeriodicVestingAccount",
    base_vesting_account: {
      base_account: {
        address: address,
        pub_key: null,
        account_number: "0",
        sequence: "0",
      },
      original_vesting: [
        {
          amount: "0",
          denom: DENOM,
        },
      ],
      delegated_free: [],
      delegated_vesting: [],
      end_time: "",
    },
    start_time: GENESIS_TIME,
    vesting_periods: [],
  };
};

var main = async () => {
  var [address, periodsFile, genesisFile] = checkArgs();

  // Open periods file
  var csv = fs.readFileSync(periodsFile, "utf8");
  var periods = await neatCsv(csv, { separator: ";" });

  // Open genesis file
  var genesis = require(genesisFile);

  // find account
  const accounts = genesis.app_state.auth.accounts;
  var vestingAccount = formatPeriodicVestingAccount(address);

  // Format periods
  var totalVestingTime = 0;
  var totalVested = 0;
  for (const period of periods) {
    const tokenAmount = parseInt(period.amount) * 1000000;

    totalVestingTime += parseInt(period.length);
    totalVested += tokenAmount;
    vestingAccount.vesting_periods.push({
      length: period.length,
      amount: [
        {
          amount: tokenAmount.toString(),
          denom: DENOM,
        },
      ],
    });
  }
  vestingAccount.base_vesting_account.end_time = (
    parseInt(GENESIS_TIME) + totalVestingTime
  ).toString();

  vestingAccount.base_vesting_account.original_vesting[0].amount =
    totalVested.toString();

  // Add bank balance
  const balances = genesis.app_state.bank.balances;

  // find balance
  var balance = balances.find((e) => e.address === address);

  // if we have balance, sum, otherwise add new
  if (balance !== undefined) {
    // Find juno
    var junoBalance = balance.coins.find((e) => e.denom === DENOM);

    // We need to add also a period with lenght 0 on top of the others with the unlocked amount
    vestingAccount.vesting_periods.unshift({
      length: 0,
      amount: [
        {
          amount: junoBalance.amount.toString(),
          denom: DENOM,
        },
      ],
    });

    var newAmount = parseInt(junoBalance.amount) + totalVested;

    junoBalance.amount = newAmount.toString();
    vestingAccount.base_vesting_account.original_vesting[0].amount =
      newAmount.toString();
  } else {
    balances.push({
      address: address,
      coins: [
        {
          amount: totalVested.toString(),
          denom: DENOM,
        },
      ],
    });
  }

  // Add or replace account to genesis
  var accountIndex = accounts.findIndex((e) => e.address == address);
  if (accountIndex === -1) {
    accounts.push(vestingAccount);
  } else {
    accounts[accountIndex] = vestingAccount;
  }

  // Recalculate total supply
  var curSupply = parseInt(genesis.app_state.bank.supply[0].amount);
  genesis.app_state.bank.supply[0].amount = (
    curSupply + totalVested
  ).toString();

  // write genesis file
  fs.writeFileSync(genesisFile, JSON.stringify(genesis, null, 2));
};

main();
