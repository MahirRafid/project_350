#!/usr/bin/env bash
# exit on error
#set -o errexit

pip install --upgrade pip
#pip install --ignore-installed --upgrade tensorflow
pip install --upgrade tensorflow
#pip install -r requirements.txt
docker build --tag python-docker .