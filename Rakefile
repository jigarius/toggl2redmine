# frozen_string_literal: true

REDMINE_URL = 'http://localhost:3000'
MAILHOG_URL = 'http://localhost:8025'

desc "SSH into a service. Defaults to 'redmine'."
task :ssh, [:service] do |_t, args|
  args.with_defaults(
    service: 'redmine',
    rails_env: ENV.fetch('RAILS_ENV', 'development')
  )
  sh "docker compose exec -e RAILS_ENV=#{args.rails_env} #{args.service} bash"
end

desc 'Execute a Rails command'
task :rails do |_t, args|
  sh "docker compose exec redmine rails #{args.extras.join(' ')}"
end

desc 'Launch MySQL'
task :mysql do |_t, args|
  args.with_defaults(
    user: 'root',
    pass: 'root',
    rails_env: ENV.fetch('RAILS_ENV', 'development')
  )
  sh "docker compose exec mysql mysql -u#{args.user} -p#{args.pass} redmine_#{args.rails_env}"
end

desc 'Reset the database.'
task :reset do
  rails_env = ENV.fetch('RAILS_ENV') do
    abort('Env var RAILS_ENV cannot be empty')
  end

  commands = [
    'db:drop',
    'db:create',
    'db:migrate',
    'redmine:plugins:migrate'
  ]

  commands << 'db:seed' if rails_env == 'development'

  # If all commands are sent at once, redmine:plugins:migrate fails.
  # Hence, the commands are being sent separately.
  commands.each do |command|
    sh "docker compose exec -e RAILS_ENV=#{rails_env} redmine rake #{command}"
  end

  puts "The env '#{rails_env}' has been reset."
end

desc 'Provision the environment.'
task :provision do
  puts 'Installing dev packages...'
  sleep(2)
  sh 'docker compose exec redmine bundle install --with default development test'

  puts 'Preparing database...'
  sleep(2)
  sh 'docker compose exec redmine rake db:seed'

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
    Login  | Email address      | Password
    ----------------------------------------------------
    admin  | admin@example.com  | admin
    jsmith | jsmith@example.com | jsmith
    ----------------------------------------------------

    URLS
    ----------------------------------------------------
    Redmine         | #{REDMINE_URL}/
    Toggl 2 Redmine | #{REDMINE_URL}/toggl2redmine
    Mailhog         | #{MAILHOG_URL}/
    ----------------------------------------------------
  INFO
end

desc 'Lint with Rubocop.'
task :lint do
  sh 'docker compose exec redmine rubocop -c plugins/toggl2redmine/.rubocop.yml plugins/toggl2redmine'
end

desc 'Run all tests or a specific test.'
task :test do
  file = ENV.fetch('TEST', nil)
  type = ENV.fetch('TYPE', nil)
  type = type ? ":#{type}" : nil

  command =
    if file
      "test TEST=plugins/toggl2redmine/#{file}"
    else
      "redmine:plugins:test#{type} NAME=toggl2redmine"
    end

  sh "docker compose exec -e RAILS_ENV=test redmine rake #{command}"
end

desc 'Run tsc in watch mode to compile TypeScript.'
task :watch do
  sh "docker compose exec -w /app/assets.src/javascripts node npx tsc -w"
end
