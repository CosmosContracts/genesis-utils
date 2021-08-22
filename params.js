/** Script that sets geensis parameters for Juno Mainnet */
const fs = require("fs");

const DENOM = "ujuno";
const GENESIS_TIME = "2021-10-01T15:00:00.000000Z";

var printHelp = () => {
  console.log("=====");

  console.log("Usage: npm run set-params <genesis file>");
  console.log("Example: npm run set-params ~/.juno/config/genesis.json");
  console.log("=====\n");
};

var checkArgs = () => {
  var [node, path, genesisFile] = process.argv;

  if (process.argv.length !== 3) {
    printHelp();

    console.log("Missing arguments");
    return false;
  }

  return [genesisFile];
};

var main = async () => {
  var [genesisFile] = checkArgs();

  var genesis = require(genesisFile);

  // Set genesis time
  genesis.genesis_time = GENESIS_TIME;

  // Set proper token denom
  genesis.app_state.crisis.constant_fee.denom = DENOM;
  genesis.app_state.gov.deposit_params.min_deposit[0].denom = DENOM;
  genesis.app_state.mint.params.mint_denom = DENOM;
  genesis.app_state.staking.params.bond_denom = DENOM;

  // Set slashing params
  genesis.app_state.slashing.params.signed_blocks_window = "10000";
  genesis.app_state.slashing.params.min_signed_per_window = "0.05";
  genesis.app_state.slashing.params.slash_fraction_downtime = "0.0001";

  // Set gov params
  genesis.app_state.gov.deposit_params.min_deposit[0].amount = "500000000";
  genesis.app_state.gov.deposit_params.max_deposit_period = "864000s";
  genesis.app_state.gov.voting_params.voting_period = "864000s";
  genesis.app_state.gov.tally_params.quorum.quorum = "0.30";

  // Set validator params
  genesis.app_state.staking.params.unbonding_time = "2419200s";

  fs.writeFileSync(genesisFile, JSON.stringify(genesis, null, 2));
};

main();
