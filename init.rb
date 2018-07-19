Redmine::Plugin.register :toggl2redmine do
  # Package info.
  name 'Toggl 2 Redmine'
  author 'Jigar Mehta'
  description 'Imports time entries from Toggl into Redmine'
  version '0.9.0'
  url 'https://github.com/evolvingweb/toggl2redmine'
  author_url 'https://www.linkedin.com/in/jigarius'

  # TODO: Implement permissions.

  # Menu items.
  menu :application_menu, :toggl2redmine, { :controller => 't2r', :action => 'index' }, :caption => 'Toggl 2 Redmine'
end
