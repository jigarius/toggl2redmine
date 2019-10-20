# frozen_string_literal: true

Redmine::Plugin.register :toggl2redmine do
  # Package info.
  name 'Toggl 2 Redmine'
  author 'Jigar Mehta'
  description 'Imports time entries from Toggl into Redmine.'
  version '3.1.3'
  url 'https://github.com/evolvingweb/toggl2redmine'
  author_url 'https://jigarius.com/'

  # Menu items.
  menu :application_menu,
       :toggl2redmine,
       { controller: 't2r', action: 'index' },
       caption: 'Toggl'
end

# Patches.
require 'patches/time_entry.rb'
