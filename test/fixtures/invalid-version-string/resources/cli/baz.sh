#!/bin/bash

SCRIPT=$(readlink -f "$0")
SCRIPT_PATH=$(dirname "$SCRIPT")

BAZ_APP_PATH=$(readlink -f "$SCRIPT_PATH/../..")

"$BAZ_APP_PATH/baztest" $@
