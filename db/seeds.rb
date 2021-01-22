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

require 'active_record/fixtures'

lambda {
  return unless Rails.env == 'development'

  fixture_directory = "#{Rails.root}/plugins/toggl2redmine/test/fixtures"
  fixture_set_names = Dir["#{fixture_directory}/*.yml"].map do |f|
    File.basename(f, '.yml')
  end

  ActiveRecord::FixtureSet.create_fixtures(
    fixture_directory,
    fixture_set_names
  )
}.call
