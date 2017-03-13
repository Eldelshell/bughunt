# bughunt

Simple, open source, bug/issue/idea ticket system with anonymous user reporting. Specially designed for side projects,
freelancers or indie shops that want to give a flexible channel of voice for their users.

This project in no way tries to compete with larger systems like JIRA, Bugzilla or Trac. It meets my expectations
for tracking issues with clients and users cheaply.

No database is required. bughunt uses [lowdb](https://github.com/typicode/lowdb)

## Goals

1. Anonymous: allow anonymous users to create tickets.
2. SaaS: allow different companies, apps and versions.
3. Open Source: deploy on your own server.
4. Administration access: allow admins to manage the tickets.
5. Email Notifications: send email notifications when a new report is created.
6. Responsive: easy to use for mobile users.
7. Integration: automatically send approved tickets to real system (JIRA).
8. Reports: generate reports.
9. API: allow apps to integrate.
10. Public or private tickets.
11. Multiple languages.
12. Branding.

## Specification

The basic idea is to have a simple form for users or testers of an app to provide feedback in a very simple manner.
Other systems require users to register and commit on a long term. With this application, the users don’t have
to commit to anything, just to provide feedback. If this feedback is good or not it will depend on the
developers. If the user provides an email, it means a little more commitment is in place and they care
enough about the app.

For owners of the apps, we provide an easy to use console so they can manage the tickets issued by users and testers.

## Tickets

Each ticket has the following fields:

1. Email (optional)
2. App ID
3. App version
4. Description (with Markdown suppport)
5. Type (error, problem, improvement, idea)
6. Status (open, progress, duplicate, migrated, closed)
7. Level (blocker, critical, low)
8. Public/private
9. Comments

### Public or private

When a ticket is created, by default it's open for anyone to see. The user who reports the ticket can bookmark or link
to this ticket and communicate with the developers.

If the developers find that the ticket should only be accesible by team members, it can be marked as private.

## Setup

All that is required is an installation of NodeJS and a web server running on your server.

### Configuration

The file `config/config.json` provides the following options

* path: the path to the database file (defaults to `/tmp/bughunt.json`)
* pageSize: number of tickets to show on the dashbard (defaults to 50)
* template: template file to use for new tickets. Provide one for each language
* sessionSecret: random string used for session protection. Use any random string which is at least 20 characters long.
* anonymousTickets: allow anonymous tickets (defaults to true)
* apps: list of apps/versions
* users: users with admin access

#### About users & passwords

To generate a new password for a new admin user, use the script `bin/password`:

```
$ npm bin/add_user foo@foo.com 123456
```

### Download and run bughunt

```
$ git clone ...
$ cd bughunt
$ npm install
$ npm install -g forever
```

Configure the `bin/daemon` file with the correct paths and start bughunt.

```
$ bash bin/daemon
```

### Web server configuration

For example, for nginx, create a new `sites-available/bughunt` file with the following:

```
server {
    listen 80;
    listen [::]:80;
    server_name bugs.myproject.com;

    location / {
        proxy_pass http://localhost:4000/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Additional languages

Bughunt ships with support for English and Spanish. If you want to add a new localizacion, create it on `_locales`

```
cd _locales
cp -R en zh
```

Modify the files under zh with the new translations and restart the server.

## Branding

You can customize the following parts so they match your branding requirements:

1. Bootstrap theme (with Bootswatch)
2. One 512x100 logo
3. Favicon
4. Translation files

### Bootstrap theme (with Bootswatch)

You can use any Bootswatch theme found on [Bootstrap CDN](https://www.bootstrapcdn.com/bootswatch/). Simply set the
name of the theme you want to use on the `config/config.json` file.
