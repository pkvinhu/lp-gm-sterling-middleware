# GM / Sterling Middleware
[![N|Solid](https://cdn2.downdetector.com/static/uploads/logo/liveperson-logo.png)](https://liveperson.com/)
[![Build Status](https://travis-ci.org/joemccann/dillinger.svg?branch=master)]()
***
## Getting Started
---
The GM / Sterling Middleware includes a series of APIs used to authenticate against the Google Sheets API to read and write data to a designated spreadsheet.

## Setting up your environment
---
1. Install [node.js 14.0](https://nodejs.org/en/download/)
2. `git clone` the repo and `cd gm-sterling-middleware`
2. Run `npm i --save` to install all node dependencies
3. Run `npm run start-dev` to start in development environment
4. Run `npm run start-prod` or simply `npm run start` to start in production environment

## Environment Variables
---
* `ss_id`=<spreadsheet id>
* `username`=<basic auth user>
* `password`=<basic auth pw>

* `type`=service_account
* `project_id`=<project id>
* `private_key_id`=<private key id>
* `private_key`=<your private key>
* `client_email`=<client email>
* `client_id`=<client id>
* `auth_uri`=<auth uri>
* `token_uri`=<token uri>
* `auth_provider_x509_cert_url`=<auth cert url>
* `client_x509_cert_url`=<client cert url>

## Setting up Google Service Account
---
![Create a Service Account on Google Cloud Console](./static/crete-service-acct.png)