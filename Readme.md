## What is Mailik?

Mailik is small library for sending emails via yours websites whch via simple SDK provide a easy way for managing projects, apps, landigpages forms in yours organization. No server code required.

&nbsp;
&nbsp;

## Usage

### 1. Installation & usage

Instal Mailik via npm
```sh
$ npm i @mailik/sdk
```
Import Mailik to yours file
```ts
import Mailik from "@mailik/sdk";
```
Usage
```ts
const result = await Mailik("yours-project-public-key").send({
    subject: "Mail subject",
    body: "Mail body",
    replyTo: "To who recipient should reply",
});
```

### 2. Create account
Go to [https://mailik.dev](https://mailik.dev/) and create an account.

### 3. Create yours first project group

Project groups are simple way for organizing yours work. You can have multiple projects in one group where each project is setup for diffrent environment (development, production, etc.).

![Project group](/images/group.png "Project group")


### 4. Creating first project

Each project must have:

- name
- for which project group belongs
- at least one e-mail address for sending messages
  
Project can have multiple email adresses where emails from your website will be send.
You can add URLs from which sending emails for a specific project will be allowed, you will be notified if someone will try to send emails with yours project public key from not allowed websites

![Project](/images/projects.png "Projects")



