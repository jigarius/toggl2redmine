# frozen_string_literal: true

REDMINE_URL = 'http://localhost:3000'
MAILHOG_URL = 'http://localhost:8025'

desc "SSH into a service. Defaults to 'redmine'."
task :ssh, [:service, :rails_env] do |_t, args|
  args.with_defaults(service: 'redmine', rails_env: 'development')
  sh "docker-compose exec -e RAILS_ENV='#{args.rails_env}' #{args.service} bash"
end

desc 'Execute a Rails command'
task :rails do |_t, args|
  sh "docker-compose exec redmine rails #{args.extras.join(' ')}"
end

desc 'Launch MySQL'
task :psql do |_t, args|
  args.with_defaults(
    database: 'redmine',
    user: 'redmine',
    pass: 'redmine'
  )

  sh "docker-compose exec mysql mysql -u#{args.user} -p#{u.pass} #{u.database}"
end

desc 'Prepare dev environment.'
task :prepare do
  # Redmine's Gemfile seems to try to include the plugin's Gemfile
  # but for unknown reasons, it doesn't work.
  puts 'Installing dev packages...'
  sleep(2)
  sh 'docker-compose exec redmine gem install rubocop pry'

  puts 'Preparing database...'
  sleep(2)
  sh 'docker-compose exec redmine rake db:seed'

  puts <<~RESULT
    ======
    Redmine is ready!
    ======
  RESULT

  Rake::Task[:info].invoke
end

desc 'Dev env info.'
task :info do
  puts <<~INFO
    Sample time entries exist for john.doe on Nov 03, 2012.

    USERS
    ----------------------------------------------------
    User          | Email address        | Password
    ----------------------------------------------------
    Administrator | admin@example.com    | toggl2redmine
    John Doe      | john.doe@example.com | toggl2redmine
    ----------------------------------------------------

    URLS
    ----------------------------------------------------
    Redmine         | #{REDMINE_URL}/
    Toggl 2 Redmine | #{REDMINE_URL}/toggl2redmine
    Mailhog         | #{MAILHOG_URL}/
    ----------------------------------------------------
  INFO
end

desc 'Run Rubocop.'
task :rubocop do
  sh 'docker-compose exec redmine rubocop plugins/toggl2redmine'
end
