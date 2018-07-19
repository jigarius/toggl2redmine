# Plugin's routes
# See: http://guides.rubyonrails.org/routing.html

# Index
get 'toggl2redmine', :to => 't2r#index'

# Import
post 'toggl2redmine/import', :to => 't2r#import'
