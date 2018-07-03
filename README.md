# Toggle 2 Redmine

This dandy Redmine plugin imports time entries from Toggl to Redmine using
REST API service calls for both Toggl and Redmine.

Additionally, the plugin groups similar Toggl time entries into a single Redmine
entry. So, even if you start and stop your Toggl timer for a particular task
multiple times, at the end of day, when you import the time entries to Redmine,
they are grouped by the issue ID and the description. 

## Installation

* Copy the plugin directory into the `plugins` directory of Redmine.
* Run database migrations (read more about
[plugin installation](http://www.redmine.org/projects/redmine/wiki/Plugins)):
```bash
    RAILS_ENV=production bundle exec rake redmine:plugins:migrate
```
  * This creates a Toggl API Key field on the user profile

## Usage

### One-time Setup

* Go to the _My Account_ page on Redmine (`/my/account`).
* Paste in your Toggl API Key and save your profile.
  * You can find this in your Toggl _profile settings_ page.

### Regular Usage

* Login to Toggl and log your time when you're working
* Make sure your task description is in the following format:
```
#1919 Feed the bunny wabbit.
``` 
  * `#1919` is the Redmine issue ID
  * `Feed the bunny wabbit` is the comment
* When you're done working for the day, visit the _Toggle 2 Redmine_ page on
  Redmine (`/toggl2redmine`)
  * You should see the time you've already logged on Redmine (if any)
  * You should see the time you've logged on Toggl
* Check the entries you want to import into Redmine
* Once you've reviewed everything, click on _Import to Redmine_
  * Once you import the data, you cannot undo it, so be careful.
* You will see a success (or failure) message
  * Entries which imported successfully will be marked in green.
  * Entries which failed to import will be marked in red.
