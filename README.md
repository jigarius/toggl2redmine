# Toggle 2 Redmine

Imports time entries from Toggl to Redmine over REST API.

## To-do

* Change "Config Form" into "Filter Form"
  * Date is not a config - it is a filter
  * Have filter for Toggl Workspace
* Add comments to the code
* Disable sync for entries where issue subject cannot be fetched from Redmine
  * Use `record.valid = false` to achieve this?
* Add documentation
