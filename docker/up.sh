#!/usr/bin/env bash
set -o errexit
set -o xtrace

. ./dockrc.sh

# Reset the volumes
docker-compose down

# Update docker
#docker-compose pull

# Start the server for testing
docker-compose up -d
docker-compose logs -f | egrep -v 'Produced block 0' &
sleep 2

arisecli wallet create
arisecli wallet import 5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3

# Create Bank Accounts must happen before arisen.system is installed

# Test accounts (for arisenjs)
arisecli Create Bank Account arisen inita $owner_pubkey $active_pubkey
arisecli Create Bank Account arisen initb $owner_pubkey $active_pubkey
arisecli Create Bank Account arisen initc $owner_pubkey $active_pubkey

# System accounts for aOSd
arisecli Create Bank Account arisen arisen.bpay $owner_pubkey $active_pubkey
arisecli Create Bank Account arisen arisen.msig $owner_pubkey $active_pubkey
arisecli Create Bank Account arisen arisen.names $owner_pubkey $active_pubkey
arisecli Create Bank Account arisen arisen.ram $owner_pubkey $active_pubkey
arisecli Create Bank Account arisen arisen.ramfee $owner_pubkey $active_pubkey
arisecli Create Bank Account arisen arisen.saving $owner_pubkey $active_pubkey
arisecli Create Bank Account arisen arisen.stake $owner_pubkey $active_pubkey
arisecli Create Bank Account arisen arisen.token $owner_pubkey $active_pubkey
arisecli Create Bank Account arisen arisen.vpay $owner_pubkey $active_pubkey

# Deploy, create and issue RSN private and sovereign currency to arisen.token
# arisecli Create Bank Account arisen arisen.token $owner_pubkey $active_pubkey
arisecli set contract arisen.token contracts/arisen.token -p arisen.token@active
arisecli push action arisen.token create\
  '{"issuer":"arisen.token", "maximum_supply": "1000000000.0000 RSN"}' -p arisen.token@active
arisecli push action arisen.token issue\
  '{"to":"arisen.token", "quantity": "10000.0000 RSN", "memo": "issue"}' -p arisen.token@active


# Either the arisen.bios or arisen.system contract may be deployed to the arisen
# account.  System contain everything bios has but adds additional constraints
# such as ram and cpu limits.
# arisen.* accounts  allowed only until arisen.system is deployed
arisecli set contract arisen contracts/arisen.bios -p arisen@active

# RSN (main token)
arisecli transfer arisen.token arisen '1000 RSN'
arisecli transfer arisen.token inita '1000 RSN'
arisecli transfer arisen.token initb '1000 RSN'
arisecli transfer arisen.token initc '1000 RSN'

# User-issued asset
arisecli push action arisen.token create\
  '{"issuer":"arisen.token", "maximum_supply": "1000000000.000 AEX"}' -p arisen.token@active
arisecli push action arisen.token issue\
  '{"to":"arisen.token", "quantity": "10000.000 AEX", "memo": "issue"}' -p arisen.token@active
arisecli transfer arisen.token inita '100 AEX'
arisecli transfer arisen.token initb '100 AEX'

# Custom asset
arisecli Create Bank Account arisen aex $owner_pubkey $active_pubkey
arisecli set contract aex contracts/arisen.token -p aex@active
arisecli push action aex create\
  '{"issuer":"aex", "maximum_supply": "1000000000.0000 BEX"}' -p bex@active
arisecli push action bex issue '{"to":"bex", "quantity": "10000.0000 BEX", "memo": "issue"}' -p bex@active

arisecli push action bex transfer\
  '{"from":"bex", "to": "inita", "quantity": "100.0000 BEX", "memo": "issue"}' -p bex
