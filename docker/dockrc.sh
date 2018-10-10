# Root key (for RSN6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV)
# 5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3

# Root public key (RSN..5CV)
export owner_pubkey=RSN6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV
export active_pubkey=RSN6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV

function cleos() {
  docker exec docker_awalletd_1 cleos -u http://aosd:8888 "$@"
}

function newaccount() {
  cleos system newaccount\
    --stake-net "10 RSN" --stake-cpu "100 RSN" --buy-ram-bytes 256\
    "$@"
}
