REDMINE_URL = 'http://localhost:3000'
MAILHOG_URL = 'http://localhost:8025'

desc "SSH into a service. Defaults to 'redmine'."
task :ssh, [:service] do |_t, args|
  args.with_defaults(service: 'redmine')
  sh "docker-compose exec #{args[:service]} bash"
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
    pass: 'redmine',
  )

  sh "docker-compose exec mysql mysql -u#{args.user} -p#{u.pass} #{u.database}"
end

desc 'Prepare dev environment.'
task :prepare do
  puts 'Preparing database...'
  sleep(2)
  sh 'docker-compose exec redmine rake db:seed'

  puts <<~RESULT

    ======
    Redmine is ready!
    ======

    You can login with the following credentials:

    Username: admin@example.com
    Password: toggl2redmine

    Log in to Redmine at #{REDMINE_URL}/login
  RESULT
end

desc 'Dev env info.'
task :info do
  puts "Redmine URL: #{REDMINE_URL}/"
  puts "Mailhog URL: #{MAILHOG_URL}/"
end
