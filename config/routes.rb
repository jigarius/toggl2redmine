# Plugin's routes
# See: http://guides.rubyonrails.org/routing.html

# Dashboard
get 'toggl2redmine', to: 't2r#index'

# Import
post 'toggl2redmine/import', to: 't2r_redmine#import'

# Read Redmine time entries.
get 'toggl2redmine/redmine_time_entries', to: 't2r_redmine#read_time_entries'

# Read Toggl time entries.
get 'toggl2redmine/toggl_time_entries', to: 't2r_toggl#read_time_entries'

# Read Toggl workspaces.
get 'toggl2redmine/toggl_workspaces', to: 't2r_toggl#read_workspaces'
