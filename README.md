# Overview

This is an open source version of the now-defunct time tracker named Maesure, that used to live at https://maesure.com.

It was a side-prodject of mine for two years, until I moved on to other things and could no longer put time, effort, and money into keeping it running.

If anyone else would like to set up Maesure, go for it. 

# Project overview

Maesure consists of the following components, all located in `/src`:

* `TaposcopeWindows`: the main server (the folder is misnamed for historical reasons). The server is written in C#, with ASP.NET Core 3.1. It's been written to run on Google Cloud Platform, specifically on the [App Engine](https://cloud.google.com/appengine/docs/flexible/dotnet), though 99% of the code isn't tied to the platform. 
* `db`: schema for the postgres database. I tried to keep it up-to-date, though there's a chance that it's missing something.
* `dashboard`: web front-end, written with React, Typescript, and Webpack. 
* `client-desktop`: Windows desktop app, written using Electron, React, and Typescript. 
* `shared`: Typescript code that's common to `dashboard` and `client-desktop`
* `e2e-tests`: End-to-end tests that check the functionality of the server, DB, and web front-end.
* `infra`: Minor GCP setup - very incomplete.

# Deploying

Maesure was built to run on Google Cloud Platform at a cost of around $150/month. Though 99% of the code is generic enough that a capable full-stack developer should be able to get it running on any other platform.

When it was running, Maesure was depoloyed as follows:

* Server: [Google App Engine](https://cloud.google.com/appengine/docs/flexible/dotnet). It was the main entry point at https://maesure.com/.
* Front-end: [GCP storage bucket](https://cloud.google.com/storage/docs/introduction) served through [GCP load balancer](https://cloud.google.com/load-balancing) at https://static.maesure.com/dashboard/. The storage bucket needs to be configured to act as a website, and must have CORS configuration (see `/src/infra`).
* Authentication is managed by [Auth0](https://auth0.com/), via OAuth2. Free tier was enogh for me.
* The server sends first-party analytics to [Google BigQuery](https://cloud.google.com/bigquery/docs)
* Server logs and error reporting go to [Stackdriver](https://cloud.google.com/stackdriver/docs)
* The server uses [GCP IAM](https://cloud.google.com/iam) configuration to access various GCP services. 
* The desktop app installer was hosted in a separate GCP storage bucket, and was served at https://static.maesure.com/downloads/.
* For monetization, I was going to use [Paddle](https://paddle.com/), and you'll see some of it mentioned in the code. It tested end-to-end successfully, but I didn't end up using it. The server can run well without Paddle.

# Various fine details and gotchas

I won't mention every detail of the system (you'll need to read the code), but I will mention some points that you need to be aware of if you'll try to get Maesure to run.

## Dev environment setup

Download and set up GCP CLI utils locally, including `gsutil` (it comes separately).

When doing development, I'd usually have the following open:

* `src/TaposcopeWindows` (the server) opened in Visual Studio
* `src` opened in VS Code. The individual sub-folders of `src` aren't really designed to be opened successfully in VS Code - the main typescript and Jest config live at the top level of `src`.
* That said, to run e.g. `dashboard`, you'd need to `cd` into dashboard, run `npm install` and `npm start`. You won't be able to run anything successfully in NPM from top-level `src` folder.

## Server

* The server uses ASP.NET Core [Data Protection](https://docs.microsoft.com/en-us/aspnet/core/security/data-protection/introduction?view=aspnetcore-5.0) to encode some things, like contents of the cookies. It's a surprisingly capable system, and Google also has docs on [how to adapt it to GCP](https://cloud.google.com/appengine/docs/flexible/dotnet/application-security).
* The secrets aren't managed very well. Search for "=====" throughout the code to see where various secrets go. Do a better job at managing them than me. ASP.NET [has some features](https://docs.microsoft.com/en-us/aspnet/core/security/app-secrets?view=aspnetcore-5.0&tabs=windows) built in to help with that.

## Desktop client

* Desktop client is built to log into the server using Auth0. If you try to set that up, you'll need to create a separate Auth0 app of type "Native".
* It has a two-stage release process: Preview and Stable. Preview is for testing the app in production-line conditions, and Stable is deployed to all users. The script `src/client-desktop/publish.ps1` publishes the preview installer, as well as preps the stable installer for release by publishing it to a hidden storage bucket directory. `src/client-desktop/push_preveiw_client_to_stable.ps1` pushes the prepped stable installer to the GCP storage bucket location where it's available to all users.
* Desktop client silently auto-updates in the background using [Electron auto-updater](https://www.electronjs.org/docs/api/auto-updater), which under the hood uses [Squirrel.Windows](https://www.electron.build/configuration/squirrel-windows).
* Windows will show a scary warning every time someone tries to install Maesure unless you sign the installer with an EV Code Signing Certificate. It takes effort, time, and money to get one.




