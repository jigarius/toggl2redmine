# Toggle 2 Redmine

This dandy Redmine plugin imports time entries from Toggl to Redmine using
REST API service calls for both Toggl and Redmine.

Additionally, the plugin groups similar Toggl time entries into a single Redmine
entry. So, even if you start and stop your Toggl timer for a particular task
multiple times, at the end of day, when you import the time entries to Redmine,
they are grouped by the issue ID and the description.

## Disclaimer

This plugin has been made and tested with love and care. However, the makers
of this plugin are in no way responsible for any damages - direct or indirect -
caused by the use of this plugin. In short, use it at your own risk.

## Installation

* Copy the plugin directory into the `plugins` directory of Redmine.
* Run database migrations
  * You can read more about
[plugin installation](http://www.redmine.org/projects/redmine/wiki/Plugins) on redmine.org
```bash
    RAILS_ENV=production bundle exec rake redmine:plugins:migrate
```
  * This creates a Toggl API Key field on the user profile
* Your database **must** support [transactions](https://en.wikipedia.org/wiki/Database_transaction).
  * Without transaction support, users might end up importing duplicate
    time entries.

## Usage

### One-time Setup

* Go to the _My Account_ page on Redmine (`/my/account`).
* Paste in your Toggl API Key and save your profile.
  * You can find this in your Toggl _profile settings_ page.
* Select your time zone - this makes your time reports show correctly.

### Regular Usage

* Login to Toggl and log your time when you're working
* Make sure your task description is in one of the following formats:
```
#1919 Feed the bunny wabbit.
Tracker #1919 Feed the bunny wabbit.
```
  * You can use the Toggl browser extension to make this easier.
  * `#1919` is the Redmine issue ID
  * `Feed the bunny wabbit` is the comment
* When you're done working for the day, visit the _My Timesheet_ page and click
  on the _Toggl_ tab on Redmine (`/toggl2redmine`)
  * You should see the time you've already logged on Redmine (if any)
  * You should see the time you've logged on Toggl
* Check the entries you want to import into Redmine
* Once you've reviewed everything, click on _Import to Redmine_
  * Once you import the data, you cannot undo it, so BE CAREFUL
* You will see a success (or failure) message
  * Entries which imported successfully will be marked in green.
  * Entries which failed to import will be marked in red.

# Acknowledgements

* Thanks [Evolving Web](https://evolvingweb.ca/) for funding the initial
  development of this plugin.
* Thanks [Jigar Mehta](https://github.com/jigarius) (that's me) for spending
  many evenings and weekends to make this plugin possible.
