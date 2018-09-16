# Plugin's routes
# See: http://guides.rubyonrails.org/routing.html

# Dashboard
get 'toggl2redmine', :to => 't2r#index'

# Import
post 'toggl2redmine/import', :to => 't2r#import'

# Read time entries
get 'toggl2redmine/redmine_time_entries', :to => 't2r#read_redmine_time_entries'
get 'toggl2redmine/toggl_time_entries', :to => 't2r#read_toggl_time_entries'
