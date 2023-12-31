# Veil Architecture

The Veil Nebula is a cloud of heated and ionized red and blue gas to appear purple

Veil consists of the front end architecture for a static web app hosted in S3, terraform AWS infrastructure-as-code (IAC), an API gateway backend, and Docker build pipeline

[Skip to table of contents](#table-of-contents)

![Veil](https://github.com/ricardolx/veil/assets/37557051/3091e67d-43fb-4b00-8260-c02d831a5da3)

### Table of Contents

1. [Front end](#front-end-webapp)
2. [Back end](#back-end)
3. [Terraform](#terraform)
   1. [Authenticate with the CLI](#assume-role-and-set-environment-variables)
   2. [Run terraform](#run-terraform)
   3. [Useful AWS CLI Commands](#useful-aws-cli-commands)
4. [Deploy Steps](#deploy)
   1. [Docker](#docker)

## Front End Webapp

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.0.8.

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

#### Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

#### Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

#### Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

##### Karma

To run headless browser for unit tests, chrome uses CHROME_BIN environment variable, set to location of your chrome executable

#### Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

#### Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

## Back end

### Authorization 

#### Lambda

`Node v20.10.0`

[Lambda Authorizer](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html) performs authentication for the API gateway and CloudFront with Lambda@Edge. 

##### Common 

There are two methods with which lambda can perform validation of the token:

1. If the secret is available, validate the token
2. If the secret is not available: call the back-end authentication api which issued the token
   1. for Identity Server: validate with `/connect/introspect`

#### Authorization@Edge

See [Authorization@Edge](https://aws.amazon.com/blogs/networking-and-content-delivery/authorizationedge-how-to-use-lambdaedge-and-json-web-tokens-to-enhance-web-application-security/)

For the CloudFront authentication, lambda will also check the token claims to ensure they are authorized to access the resource. 

CloudFront expects a request. If the authentication and authorization succeeds, the request should be returned unmodified. If it fails, the response can be a request modified with a redirect such as an error page, or login page.

#### API Gateway Lambda authorizor 

See [Gateway Authorizor](#https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html)

If authentication succeeds, API Gateway expects a callback with a policy to access the underlying resource

## Terraform

[Install AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

[Install Terraform CLI](https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli)

#### Assume role and set environment variables

##### Authenticate with the CLI

In order to execute terraform, the user/machine must assume a role with the AWS CLI. In order to assume a role, you must be authenticated with AWS CLI:

run  

    aws configure

Enter your access key and secret access key. You can run `aws sts get-caller-identity` to see that it worked

##### Assume the role and set variables

Replace {rolearn} with the role arn - it will look like: arn:aws:iam::999999999999:role/OrgAccountAccessRole

##### Mac

If you don't have jq installed already:

    brew install jq
    
Then assume with:

    eval $(aws sts assume-role --role-arn {rolearn} --role-session-name trfrm | jq -r '.Credentials | "export AWS_ACCESS_KEY_ID=\(.AccessKeyId)\nexport AWS_SECRET_ACCESS_KEY=\(.SecretAccessKey)\nexport AWS_SESSION_TOKEN=\(.SessionToken)"')

##### Windows

    $credentials = aws sts assume-role --role-arn {rolearn} --role-session-name trfrm | ConvertFrom-Json

    [Environment]::SetEnvironmentVariable("AWS_ACCESS_KEY_ID", $credentials.Credentials.AccessKeyId, [System.EnvironmentVariableTarget]::Process)
    [Environment]::SetEnvironmentVariable("AWS_SECRET_ACCESS_KEY", $credentials.Credentials.SecretAccessKey, [System.EnvironmentVariableTarget]::Process)
    [Environment]::SetEnvironmentVariable("AWS_SESSION_TOKEN", $credentials.Credentials.SessionToken, [System.EnvironmentVariableTarget]::Process)`

This will map the role access keys and token to your environment variables. Now run `aws sts get-caller-identity` again to see that you are authenticated as the role. 

*Note*: in your CLI config, you are still configured in as your user. With the keys and tokens set, the CLI will use the session token to authenticate as the role. Once the role token expires, you will get authentication errors until the token is removed. You can [unset the environment variables](#remove-role-session) to interact with the CLI as your user and run the [assume role](#assume-role-and-map-env-vars) command to re-assume the role if needed

##### run terraform

*From the /tf directory,* view the change details: 

    terraform plan
    
To submit changs:

    terraform apply

##### tear it all down 

    terraform destroy

#### useful aws cli commands

##### view user/role session info: 

    aws sts get-caller-identity

##### remove role session:  

mac

    unset AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN

windows

    Remove-Item Env:AWS_ACCESS_KEY_ID
    Remove-Item Env:AWS_SECRET_ACCESS_KEY
    Remove-Item Env:AWS_SESSION_TOKEN

## Deploy

### Docker

[Install Docker](https://docs.docker.com/get-docker/)

To build and deploy 

    docker build -t my-angular-app
    docker cp <container_id>:/app/dist/<your-app-name> .

Deploy steps to be executed in the following order

1. Build lambda .zip
2. Docker
     1. Build front-end production app static files
     2. Run unit tests
     3. Run component tests
4. Run terraform to diff and provision services, and deploy lambda
5. Copy static production front end app to s3
6. Run CloudFront/WAF terraform
7. Invalidate cached CloudFront files
8. Run Integration Tests in develop
9. Run E2E smoke tests in develop
10. Deploy to QA
11. Invalidate CloudFront cache
12. Run smoke test in QA
