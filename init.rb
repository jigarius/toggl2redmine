# frozen_string_literal: true

require_relative 'lib/toggl_2_redmine'

Redmine::Plugin.register :toggl2redmine do
  # Package info.
  name 'Toggl 2 Redmine'
  author 'Jigar Mehta'
  description 'Imports time entries from Toggl into Redmine.'
  version Toggl2Redmine::VERSION
  url 'https://github.com/jigarius/toggl2redmine'
  author_url 'https://jigarius.com/'

  # Menu items.
  menu :application_menu,
       :toggl2redmine,
       { controller: 't2r_import', action: 'index' },
       caption: 'Toggl'
end

# Patches.
require 'patches/time_entry'
