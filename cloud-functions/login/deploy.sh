#!/usr/bin/env bash
gcloud functions deploy timetabler_login --env-vars-file .env.yaml --runtime nodejs8 --trigger-http --project hackathon-justice
