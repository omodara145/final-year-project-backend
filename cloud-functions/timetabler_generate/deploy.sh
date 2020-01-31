#!/usr/bin/env bash
gcloud functions deploy timetabler_generate --env-vars-file .env.yaml --runtime nodejs8 --trigger-http --project hackathon-justice
