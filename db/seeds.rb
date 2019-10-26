# Dummy data for testing Toggl 2 Redmine.
#
# To use this file, copy it to "redmine/db/seeds.rb" (or symlink) and execute
# the command "rake db:seed". I looked around a lot, but couldn't find a better
# way to do it. Since time is precious, I decided to use this method for the
# until I stumble upon a better way to do it in the future.
#
# To reset the Redmine database and create this test data, run these commands:
# rake db:drop # Drops existing database.
# rake db:create # Creates redmine database.
# rake db:migrate # Runs rails migrations.
# rake redmine:plugins:migrate # Runs redmine plugin migrations.
# rake db:seed # Imports these test records.
#
# You can also do it all in one line:
# rake db:drop; rake db:create; rake db:migrate; rake redmine:plugins:migrate; rake db:seed;

# Enable Rest API.
setting = Setting.where name: :rest_api_enabled
setting.value = 1
setting.save!

# Create users.
user_admin = User.where login: 'admin'

user_test = User.create!({
  login: 'john.doe',
  mail: 'john.doe@example.com',
  firstname: 'John',
  lastname: 'Doe',
  password: 'toggl2redmine'
})

# Create roles.
role_manager = Role.create!({
  name: 'Manager',
  permissions: [
    :view_issues,
    :view_time_entries,
    :log_time,
    :edit_time_entries,
    :edit_own_time_entries
  ]
})

# Create issue trackers.
issue_status_open = IssueStatus.create!({
  name: 'Open',
  is_closed: false
})

issue_status_closed = IssueStatus.create!({
  name: 'Closed',
  is_closed: true
})

# Create trackers.
tracker_task = Tracker.create!({
  name: 'Task',
  default_status: issue_status_open
})

# Time tracking activities.
time_entry_activity_development = TimeEntryActivity.create!({
  name: 'Development',
  position: 1,
  is_default: true
})

time_entry_activity_other = TimeEntryActivity.create!({
  name: 'Other',
  position: 2
})

# Create issue priorities.
issue_priority_normal = IssuePriority.create!({
  name: 'Normal',
  position: 1,
  is_default: true
})

# Create projects.
project_alpha = Project.create!({
  identifier: 'alpha',
  name: 'Project alpha',
  description: 'Dummy project for testing Toggl 2 Redmine.'
})

project_bravo = Project.create!({
  identifier: 'bravo',
  name: 'Project bravo',
  description: 'Dummy project for testing Toggl 2 Redmine.'
})

project_charlie = Project.create!({
  identifier: 'charlie',
  name: 'Project charlie',
  description: 'Dummy project for testing Toggl 2 Redmine.',
  status: 0
})

# Create issues.
issue_1 = Issue.create!({
  subject: 'Issue 1: Abstract apples',
  description: "Dummy issue for testing Toggl 2 Redmine.",
  author: user_admin,
  project: project_alpha,
  tracker: tracker_task
})

issue_2 = Issue.create!({
  subject: 'Issue 2: Boil bananas',
  description: "Dummy issue for testing Toggl 2 Redmine.",
  author: user_admin,
  project: project_alpha,
  tracker: tracker_task
})

issue_3 = Issue.create!({
  subject: 'Issue 3: Condition cherries',
  description: "Dummy issue for testing Toggl 2 Redmine.",
  author: user_admin,
  project: project_bravo,
  tracker: tracker_task
})

issue_4 = Issue.create!({
  subject: 'Issue 4: Dismantle dates',
  description: "Dummy issue for testing Toggl 2 Redmine.",
  author: user_admin,
  project: project_bravo,
  tracker: tracker_task
})

issue_5 = Issue.create!({
  subject: 'Issue 4: Extract essence',
  description: "Dummy issue for testing Toggl 2 Redmine.",
  author: user_admin,
  project: project_charlie,
  tracker: tracker_task
})
