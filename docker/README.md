Dockerized arisen instance for development and testing.  This container
is designed to reset its blockchain and wallet state upon shutdown.

# Start aosd

Starting and stopping an arisen instance:

```js
./up.sh
docker-compose down
```

# Load commands like `arisecli`

```bash
. ./dockrc.sh
```

# Unit Test

Run all unit test in a temporary instance.  Note, this script will run
`npm install` in the arisenjs directory.

`./run_tests.sh`

# Running container

After ./up.sh

```bash
docker exec docker_aosd_1 ls /opt/arisen/bin
docker exec docker_aosd_1 ls /contracts
docker cp docker_aosd_1:/opt/arisen/bin/aos .

# Or setup an environment:
. ./dockerc.sh
awalletd ls /opt/arisen/bin
arisecli --help
```

# Stopped container

```bash
# Note, update release
docker run --rm -it arisen/arisen:latest ls /opt/arisen/bin
docker run -v "$(pwd):/share" --rm -it arisen/arisen:latest cp /opt/arisen/bin/aos /share
```
