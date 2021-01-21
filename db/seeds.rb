# frozen_string_literal: true

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
# All the above commands can be run in one line as follows:
# rake db:drop db:create db:migrate && rake redmine:plugins:migrate db:seed

# Enable Rest API.
setting = Setting.where(name: :rest_api_enabled).first
setting = Setting.new(name: :rest_api_enabled) if setting.nil?
setting.value = 1
setting.save!

# Create users.
user_admin = User.where(login: 'admin').first || User.new(login: 'admin')
user_admin.mail = 'admin@example.com'
user_admin.firstname = 'Jigarius'
user_admin.lastname = 'Caesar'
user_admin.password = 'toggl2redmine'
user_admin.must_change_passwd = false
user_admin.save!

user_test = User.create!(
  login: 'john.doe',
  mail: 'john.doe@example.com',
  firstname: 'John',
  lastname: 'Doe',
  password: 'toggl2redmine'
)

# Create issue trackers.
issue_status_open = IssueStatus.create!(
  name: 'Open',
  is_closed: false
)

issue_status_closed = IssueStatus.create!(
  name: 'Closed',
  is_closed: true
)

# Create trackers.
tracker_task = Tracker.create!(
  name: 'Task',
  default_status: issue_status_open
)

# Time tracking activities.
time_entry_activity_development = TimeEntryActivity.create!(
  name: 'Development',
  position: 1,
  is_default: true
)

time_entry_activity_other = TimeEntryActivity.create!(
  name: 'Other',
  position: 2
)

# Create issue priorities.
issue_priority_normal = IssuePriority.create!(
  name: 'Normal',
  position: 1,
  is_default: true
)

# Create projects.
project_alpha = Project.create!(
  identifier: 'alpha',
  name: 'Project alpha',
  description: 'Dummy project for testing Toggl 2 Redmine.'
)

project_bravo = Project.create!(
  identifier: 'bravo',
  name: 'Project bravo',
  description: 'Dummy project for testing Toggl 2 Redmine.'
)

project_charlie = Project.create!(
  identifier: 'charlie',
  name: 'Project charlie',
  description: 'Dummy project for testing Toggl 2 Redmine.',
  status: 0
)

# Create roles.
role_manager = Role.create!(
  name: 'Manager',
  permissions: %i[
    view_issues
    view_time_entries
    log_time
    edit_time_entries
    edit_own_time_entries
  ]
)

# Create members.
Member.create!(
  user: user_test,
  project: project_alpha,
  roles: [role_manager]
)

Member.create!(
  user: user_test,
  project: project_bravo,
  roles: [role_manager]
)

# Create issues.
# For some reason, assigning objects to issue properties results in fatal
# ActiveRecord::AssociationTypeMismatch exceptions. Thus, IDs are used.
issue1 = Issue.create!(
  subject: 'Abstract apples',
  description: 'Dummy issue for testing Toggl 2 Redmine.',
  author_id: user_admin.id,
  project_id: project_alpha.id,
  tracker_id: tracker_task.id,
  priority_id: issue_priority_normal.id
)

issue2 = Issue.create!(
  subject: 'Boil bananas',
  description: 'Dummy issue for testing Toggl 2 Redmine.',
  author_id: user_admin.id,
  project_id: project_alpha.id,
  tracker_id: tracker_task.id,
  priority_id: issue_priority_normal.id
)

Issue.create!(
  subject: 'Condition cherries',
  description: 'Dummy issue for testing Toggl 2 Redmine.',
  author_id: user_admin.id,
  project_id: project_bravo.id,
  tracker_id: tracker_task.id,
  priority_id: issue_priority_normal.id
)

Issue.create!(
  subject: 'Dismantle dates',
  description: 'Dummy issue for testing Toggl 2 Redmine.',
  author_id: user_admin.id,
  project_id: project_bravo.id,
  tracker_id: tracker_task.id,
  priority_id: issue_priority_normal.id,
  status_id: issue_status_closed.id
)

issue5 = Issue.create!(
  subject: 'Extract essence',
  description: 'Dummy issue for testing Toggl 2 Redmine.',
  author_id: user_admin.id,
  project_id: project_charlie.id,
  tracker_id: tracker_task.id,
  priority_id: issue_priority_normal.id
)

# Create time entries.
TimeEntry.create(
  project_id: issue1.project.id,
  issue_id: issue1.id,
  spent_on: '2012-11-03',
  user_id: user_test.id,
  activity_id: time_entry_activity_development.id,
  hours: '0.50',
  comments: 'Pellentesque ornare sem lacinia quam venenatis vestibulum.'
)

TimeEntry.create(
  project_id: issue1.project.id,
  issue_id: issue1.id,
  spent_on: '2012-11-03',
  user_id: user_test.id,
  activity_id: time_entry_activity_development.id,
  hours: '0.25',
  comments: 'Cras mattis consectetur purus sit amet fermentum.'
)

TimeEntry.create(
  project_id: issue2.project.id,
  issue_id: issue2.id,
  spent_on: '2012-11-03',
  user_id: user_test.id,
  activity_id: time_entry_activity_development.id,
  hours: '1.25',
  comments: 'Ut fermentum massa justo sit amet risus.'
)

TimeEntry.create(
  project_id: issue5.project.id,
  issue_id: issue5.id,
  spent_on: '2012-11-03',
  user_id: user_test.id,
  activity_id: time_entry_activity_other.id,
  hours: '2.0',
  comments: 'Fusce dapibus, tellus ac cursus commodo tortor mauris condimentum.'
)
