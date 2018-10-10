set -o errexit
set -o xtrace

function process() {
  docker cp docker_aosd_1:/contracts/${1}/${1}.abi .
  node ./arisen-abi-update.js $1 $2
  mv ./$2 ../src/schema
}

process arisen.token arisen_token.json
process arisen.system arisen_system.json
