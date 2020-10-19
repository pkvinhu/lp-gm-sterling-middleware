# GM / Sterling Middleware
[![N|Solid](https://cdn2.downdetector.com/static/uploads/logo/liveperson-logo.png)](https://liveperson.com/)  
  
[![Build Status](https://travis-ci.org/joemccann/dillinger.svg?branch=master)]()  
  
## Getting Started
The GM / Sterling Middleware includes a series of APIs used to authenticate against the Google Sheets API to read and write data to a designated spreadsheet.  
  
## Setting up your environment
1. Install [node.js 14.0](https://nodejs.org/en/download/)
2. `git clone` the repo and `cd gm-sterling-middleware`
2. Run `npm i --save` to install all node dependencies
3. Run `npm run start-dev` to start in development environment
4. Run `npm run start-prod` or simply `npm run start` to start in production environment  
  
## Environment Variables
* `ss_id`=spreadsheet id
* `username`=basic auth user
* `password`=basic auth pw
* `type`=service_account
* `project_id`=project id
* `private_key_id`=private key id
* `private_key`=your private key
* `client_email`=client email
* `client_id`=client id
* `auth_uri`=auth uri
* `token_uri`=token uri
* `auth_provider_x509_cert_url`=auth cert url
* `client_x509_cert_url`=client cert url  
  
## Gitignore
* `/node_modules/`
* `.env`
* `credentials.json`  
  
## Setting up Google Service Account
1. **Create a service sccount on google cloud console**  
![Create a service sccount on google cloud console](./static/create-service-acct.png)  
  
2. **Create a private key associated to your newly create service account**  
![Create a private key associated to your newly create service account](./static/create-service-acct-2.png)  
  
3. **Confirm the format of key file to be downloaded in JSON**  
![Confirm the format of key file to be downloaded in JSON and save the information in the proper environment variables](./static/create-service-acct-3.png)  

4. **If you're just using in dev, create a `credentials.json` file and copy and paste private key JSON into it, otherwise save the information in the proper environment variables**  

5. **Enable Google Sheets API under the newly created service account in the `APIs & Services` tab**  
![Enable Google Sheets API under the newly created service account in the APIs & Services tab](./static/create-service-acct-4.png)  
  
6. **Grab the spreadsheet id you want to interface with from the URL of the google spreadsheet and assign it to `ss_id` env var and share with the `client email` from the private key**  

7. **You should be all set to go!**

## APIs
* Each API uses Basic Authentication and the user/pw info is saved in the `.env` file
* POST `/append-order-number` - takes two strings, an `orderNumber` and `phoneNumber` (required), and checks SS; if no order number, it'll verify if phone number exists and spit out the corresponding order number, else it will check for order number in payload and update phone number if different from listed 
* POST `/opt-in-yes` - takes a string, `orderNumber`, and logs the opt-in information in SS
* GET `/get-push-notifications` - gets all push notifications from from SS
* GET `/get-push-notifications-by-phone` - takes an array of `phoneNumbers` and retrieves the push notifications for each
* POST `/log-proactive-campaigns` - takes an payload with a string, `proactiveCampaignId`, and an array of objects `acceptedConsumers` w/ string `id` and `phoneNumber` which should return from proactive API and logs results into the SS
* GET `/get-proactive-campaign-status` - gets the recently scheduled proactive campaign info saved into SS and clears the SS of the info
* GET `/healthcheck` - checks that the application is up and running