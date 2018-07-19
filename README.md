# lambda-sensuiMod
The lambda-sensuiMod repository, created by ConsenSys Social Impact (CSI), consists of a tx funding service and is based on the [lambda-sensui](https://github.com/uport-project/lambda-sensui) repository originally developed by the ConsenSys uPort team. The core difference between the two repositories is rather simple, and consists of the following: 

- uPort's lambda-sensui service (AWS Lambda API) requires a signed meta-transaction POST request from an authorized user of a DApp. In order to sign this request, the user must be using an extension or browser akin to a MetaMask or Brave. 
- CSI's lambda-sensuiMod service (AWS Lambda API) doesn't require a signed meta-transaction POST request from an authorized user of a DApp. It simply requires normal text input being processed for the user and their authorization token. 

This core difference hurdles an integral architecture obstacle for many already developed applications within the social sector - the lack of ability to assign ethereum key pairs (a public and private address) to users. Many applications within the social sector do not have the user experience flexibility to dictate the use of a MetaMask or Brave Browser, as great as those tools are. Because of this, and because of the remaining (and emphasized) fact that social sector users (1) aren't using these tools and (2) typically do not have any Ether to pay for transaction fees, it was necessary to modify the sensui service into an API that could process normal (non tx based) POST requests AND create, sign, and pay for the resulting new transaction from that POST request of data that needs to be submitted on-chain. 

More simply put, the purpose of the service is the following: 
1. To naturally integrate into traditional, social sector application architecture and not force product development teams to assign key pairs to their users
2. To provide a method (much like lambda-sensui) that shields users from transaction costs so that the use of the ethereum blockchain does not interupt the user experience with complexities like gas fees and tokens

The build leverages the [serverless framework](https://serverless.com/learn/) provided by [AWS Lambda](https://aws.amazon.com/lambda/) and AWS S3 to save tx history. AWS Lambda lets you run code without provisioning or managing servers. You pay only for the compute time you consume - there is no charge when your code is not running.)

## Repository Basics

### What is [AWS Lambda](https://aws.amazon.com/lambda/)?
AWS Lambda lets you run code without provisioning or managing servers. You pay only for the compute time you consume - there is no charge when your code is not running.

With Lambda, you can run code for virtually any type of application or backend service - all with zero administration. Just upload your code and Lambda takes care of everything required to run and scale your code with high availability. You can set up your code to automatically trigger from other AWS services or call it directly from any web or mobile app.

### What is [Serverless](https://serverless.com/learn/)?
Just like wireless internet has wires somewhere, serverless architectures still have servers somewhere. What ‘serverless’ really means is that, as a developer you don’t have to think about those servers. You just focus on code.

### Serverless Architectures with AWS Lambda
Using AWS Lambda as the logic layer of a serverless application can enable faster development speed and greater experimentation – and innovation — than in a traditional, server-based environment. Many serverless applications can be fully functional with only a few lines of code and little else.

Examples of fully-serverless-application use cases include:

- Web or mobile backends – Create fully-serverless, mobile applications or websites by creating user-facing content in a native mobile application or static web content in an S3 bucket. Then have your front-end content integrate with Amazon API Gateway as a backend service API. Lambda functions will then execute the business logic you’ve written for each of the API Gateway methods in your backend API.
- Chatbots and virtual assistants – Build new serverless ways to interact with your customers, like customer support assistants and bots ready to engage customers on your company-run social media pages. The Amazon Alexa Skills Kit (ASK) and Amazon Lex have the ability to apply natural-language understanding to user-voice and freeform-text input so that a Lambda function you write can intelligently respond and engage with them.
- Internet of Things (IoT) backends – AWS IoT has direct-integration for device messages to be routed to and processed by Lambda functions. That means you can implement serverless backends for highly secure, scalable IoT applications for uses like connected consumer appliances and intelligent manufacturing facilities.
Using AWS Lambda as the logic layer of a serverless application can enable faster development speed and greater experimentation – and innovation — than in a traditional, server-based environment.

To learn more about Serverless Architectures with AWS Lambda, check out [this publication](https://d1.awsstatic.com/whitepapers/serverless-architectures-with-aws-lambda.pdf) that goes through the whole build

### So How Does this All Come Together w/ lambda-sensuiMod?
To put it simply, this is out the Lambda Sensui Mod server helps sheild front end dapp users from paying transaction costs: 
1. User goes on application like normal and submits an action that needs to be recorded on-chain (like submitting a form)
2. Form inputs are sent to Lambda Sensui Mod service, and the user's application access is authenticated (first) and then the input is transformed into a data payload (along with the appropiate smart contract method that will be used to commit the data on chain)
3. The data payload is put into a new transaction object 
4. The transaction oobject attributes are appropiately filled in (gasPrice, Nonce, to, from, value, gasLimit)
5. The transaction object is serialized 
6. The transaction object is signed by the private key of the Lambda Sensui Mod service
7. The transaction is sent to the ethereum blockchain network (of choice) and the transaction is paid for 
8. The transaction hash is recieved upon the successful confirmation of the transaction and the transaction is complete!

### How is the Repository Organized?
The following list breakdown the folder architecture within the repository, explaining where everything is at (and what those part of the repository are responsible for). Hopefully, through this explanation, you can localize different parts of the repository that you want to change/fix/enhance: 

1. **Serverless.yml** - Serverless.yml is the configuration the CLI uses to deploy your code to your provider of choice. The file denotes the entire architecture of the server, including the provider, the plugins, and the functions. The file is the outline (or the index) of your entire API and is the best reference to determine how your API will work. Here's a description of what each part of this file means: 

- **service** - The name of your API (or your `service`)

- **provider** - The `provider` block defines where your service will be deployed. For AWS Lambda we need to be careful of which version of node.js we are running (the repo runs 6.10, but it seems that AWS Lambda can now run v8.10 as of 4/2/18). The repo sets the stage as development (as opposed to production) and sets the location of the server in the western region of the U.S. Every AWS Lambda function needs permission to interact with other AWS infrastructure resources within your account. These permissions are set via an AWS IAM Role. 

You can set permission policy statements within this role via the `provider.iamRoleStatements` property. The permissions we set in this service are allowing the operation of an S3 database instance and the use of `KMS:Decrypt`, which helps us encrypt and decrypt our service secrets (our mnemonic to our funding wallet, etc.).

The `environment` property allows you to apply an environment variable configuration to all functions in your service. Environment variables configured at the function level are merged with those at the provider level, so your function with specific environment variables will also have access to the environment variables defined at the provider level. If an environment variable with the same key is defined at both the function and provider levels, the function-specific value overrides the provider-level default value. Here, we've set `SECRETS` as our global variable across all functions within the service as an authentication method for accessing the APIs capabilities. The `serverless-kms-secrets` npm resource is what allows us to conveniently encrypt and decrypt our service and pair that value with the `SECRETS` environment variable. 

The `plugins` property includes npm resources we need for the service to function correctly. We use the `serverless-webpack`
and `serverless-kms-secrets` npm resources. 

The `customs` property allows us to account for certain configurations required by our plugin features. 

The `functions` block defines what code to deploy. These are the methods of your API - or your API calls. 

2. **src folder** - all of the logic of the repo is stored here, particularly in the api_handler.js file. We will account for special files/folders in this path below: 

- **api_handler** - central file with all of service's core functions (that result in the development of api calls for different functions)

- **src/lib folder** - contains all of the needed scripts to enable the 'handler' files to work properly. Many of these scripts take care of interacting with the ethereum blockchain. 

3. **Other Notable Files**

- **SECRETS.md** - This file provides the kms commands that you need to use to both encrypt (and set) your SECRETS for your service and decrypt those secrets when needed. The structure of the secrets provided in this service is the following: 
```
{
  PG_URL: [the postgress url associated with the service to commit data to the database, and query data from the database - REQUIRED],
  
  SEED: [12 word mnemonic used for funding wallet - note that you can derive multiple wallets from one seed. The mnemonic is    an encoding for a seed value. That seed is then converted into the master private key - REQUIRED],
  
  NISABA_PUBKEY: [the aws lambda public key for your nisaba service - REQUIRED],
  
  SLACK_URL: [Incoming Webhooks are a simple way to post messages from external sources into Slack. They make use of normal HTTP requests with a JSON payload that includes the message text and some options. Message Attachments can also be used in Incoming Webhooks to display richly-formatted messages that stand out from regular chat messages. See more at https://api.slack.com/incoming-webhooks - REQUIRED], 
  
  PRIVATE_KEY: [private key of the account that the service controls - OPTIONAL]

  PUBLIC_KEY: [public key of the account that the service controls - OPTIONAL]

  INFURA_KEY: [Infura key for service's node on all test and main networks on ethereum - REQUIRED] 
}
```

- **kms-secrets.develop.us-west-2.yml** - A file that is automatically generated once secrets are encrypted by the sls encryption command noted in the SECRETS.md file. This is for the develop stage service. Create a KMS key in AWS IAM service, under Encryption keys. Collect the key id, which is the remaining part of the key ARN. 

- **kms-secrets.master.us-west-2.yml** - A file that is automatically generated once secrets are encrypted by the sls encryption command noted in the SECRETS.md file. This is for the master stage service. Create a KMS key in AWS IAM service, under Encryption keys. Collect the key id, which is the remaining part of the key ARN.

### How do we start this up?
1. Open your terminal and choose a folder path you'd like to store the project in 

2. Use the command 'git clone [github repo url here]' to clone the project in that folder

3. Make sure that you have serverless on your computer if not, follow these steps: https://serverless.com/learn/quick-start/

4. Make sure that you have a AWS IAM account (if not follow the guide in step 3 to completion to get familiar). 

5. Go back to your terminal in the project folder and use `npm install` command make sure that `serverless-webpack` and `serverless-kms-secrets` npm resources are installed.

6. Create a KMS key in AWS IAM service, under Encryption keys. Collect the key id, which is the remaining part of the key ARN. You need to create a key for each development stage of your service. 

7. Use the encryption command (on your terminal which should be in the folder path of the project) to set and encrypt your secrets for each of your development stage services via the following (of course, you will need to make an account on all the services that these keys are acquired from as well!): 

```
sls encrypt -n SECRET_VARIABLE_NAME -v SECRET_VARIABLE_VALUE -s STAGE_YOUR_SETTING_SECRET_FOR 
```

Since you indicated which stage your encypting the secret for, it will determine which KMS key to use automatically from AWS.

8. Make sure to re-name your service in the `serverless.yml` file to something relevant that your service does 

9. Create an endpoint that points to where your service lives using the command `sls deploy`. This will generate a url to use for calling the different endpoints indicated in your API. Remember, we indicated what these endpoints were in the `serverless.yml` file in the functions sub-sections called `events`, where we define the mapping of the API functions to the http endpoints of `v1/fund`, `fund`, `v2/relay`, `relay`, and `checkPending`. 

10. [OPTIONAL] You also need to ensure that you have a NISABA like service running as well. Remember, all this is is another serverless service on AWS lambda that handles JWT token creation given a user signing up and logging in. This service should interact with an authentication challenge like a text reponse challenge or captcha challenge when the user is first signing up. Resources like [nexmo](https://www.nexmo.com/products/sms) are very helpful for this purpose and can extend usage of your application to both web and mobile. 

## API Description

### Fund address
This endpoints tries to send funds to the address on the `from` field of the transaction.
The `from` field needs to match with the `deviceKey` in the Authorization token.

Sensui, does some limit check before actually sending the funds. If sensui funds an attempt to abuse a `429 Too many connections` is returned

The endpoint is private, only valid tokens from `nisaba` are allowed.

### Endpoints

## Fund
`POST /fund`

#### Header
```
Authorization: Bearer <jwt token>
```
The authorization header needs a JWT token that is signed by the nisaba service (a build that very much resembles this one, in that it also uses the serverless framework and AWS lambda. The JWT token is generated from the following control flow (for uPort): 

1. User is signing up on uPort, which requests the users phone number and/or that the user complete a captcha challenge 
2. The user submits their phone number and recieves a text with a secret code and/or completes captcha challenge 
3. Upon successful completion, a JWT token is created and then signed by the nisaba service (becoming a 'nisaba token' as referenced in the comments in the code 
4. This token is associated with the user and allows them to use the methods of the API and make calls 

#### Body
```
{
  tx: <signedTx>,
  blockchain: <blockchain name>
}
```
#### Response

| Status |     Message    |                               |
|:------:|----------------|-------------------------------|
| 200    | Ok.            | address funded
| 400    | Bad request      | No JSON or paramter missing  |
| 401    | Forbidden      | Fuel token not granted by nisaba |               |
| 403    | Forbidden      | JWT token missing or invalid  |
| 429    | Abuse | Abusing gasPrice or funds not needed          |
| 500    | Internal Error | Internal error                |

#### Response data
```
{
  txHash: <tx hash>
}
```

## Customized Endpoints Based on Smart Contract Needs
The result of taking away the metaTx aspect of the original sensui service does have its drawbacks (ones that we are trying to better generalized via this repository). The main drawback is that the deevloper needs to now customize his endpoints to the different smart contract methods that he is trying to use (in connection to the user's front end experience). 

Here's an example of what we mean: 
Say we have a user experience that is submitting a form. We want the user to be able to immutably submit a form of information without even knowing blockchain is being used. So no metamask and no transaction fees. In order to get the sensuiMod service up and running in our application, your development team would need to take the following steps: 

1. Develop and test your smart contract that is going to store the data on chain 
2. Go to Solidity Remix, create a new file on the platform and copy and paste your smart contract in the code area
3. Compile and submit the smart contract on the network that you'd like to deploy to. Remember, to do this, you do need to have metamask installed on your browser (chrome or firefox) so that you can pay for the transaction fee of deploying your smart contract. You need to make sure that your metamask is signed in on the same network that you're deploying to on Remix. So if you are trying to deploy on Rinkeby, you need to be on the Rinkeby network on metamask and have some Rinkeby test eth to pay for the transaction.
4. Once the transaction is submitted and the smart contract is deployed, you need to find the ABI json output of your smart contract, copy and paste it into a json file named 'YourSmartContractName.json' and replace the current json file in the `src/build/contracts` folder 
5. You need to go into the `ethereumMgr` file and make sure that your code is referencing the correct ABI file (not the old one that the repo is referencing)
6. You need to go into the `serverless.yml` file and change the 'makeReport' function (this part will probably be generalized to makeTransaction, so in the future you will not need to do all of this). Change it to whatever you want - but this is the function call that will end up making the transaction that goes to your smart contract function to store your form data (given the example)
7. Go into the `api_handler.js` file and change the 'makeReport' function just as you did in the `serverless file`, you also need to make sure that the function is pointing to an aptly named Handler 
8. Go the the handler file in the `src/handlers` folder and yet again change the file name of makeReport to your new file name. You wont need to change much of this file - just the inputs that your app is submitting and the `methodName` being submitted in the rawTx variable
9. You now have your custom endpoint(s) to your own smart contract(s)!

#### Header
```
Authorization: Bearer <jwt token>
```

#### Body
```
{
  input: Input from user/service necessary for smart contract to process, 
  blockchain: <blockchain network name>, 
}
```
#### Response

| Status |     Message    |                               |
|:------:|----------------|-------------------------------|
| 200    | Ok.            | address funded
| 400    | Bad request      | No JSON or paramter missing  |
| 401    | Forbidden      | Fuel token not granted by nisaba |
| 403    | Forbidden      | Invalid metaTx signature |
| 500    | Internal Error | Internal error                |

#### Response data
```
{
  txHash: <tx hash>
}
```
