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
task :mysql, [:user, :pass] do |_t, args|
  args.with_defaults(user: 'root', pass: 'root')
  sh "docker-compose exec mysql mysql -u#{args.user} -p#{args.pass}"
end

desc 'Reset the database.'
task :reset, [:rails_env] do |_t, args|
  abort('Argument rails_env cannot be empty') unless args.rails_env

  commands = [
    'db:drop',
    'db:create',
    'db:migrate',
    'redmine:plugins:migrate',
    'redmine:load_default_data'
  ]

  commands << 'db:seed' if args.rails_env == 'development'

  # If all commands are sent at once, redmine:plugins:migrate fails.
  # Hence, the commands are being sent separately.
  commands.each do |command|
    sh "docker-compose exec -e RAILS_ENV='#{args.rails_env}' redmine rake #{command}"
  end

  puts "The env '#{args.rails_env}' has been reset."
end

desc 'Prepare dev environment.'
task :prepare do
  puts 'Installing dev packages...'
  sleep(2)
  sh 'docker-compose exec redmine bundle install --with default development test'

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
    Login    | Email address        | Password
    ----------------------------------------------------
    admin    | admin@example.com    | toggl2redmine
    john.doe | john.doe@example.com | toggl2redmine
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

desc 'Run tests.'
task :test do
  sh "docker-compose exec -e RAILS_ENV='test' redmine rake redmine:plugins:test NAME=toggl2redmine"
end
