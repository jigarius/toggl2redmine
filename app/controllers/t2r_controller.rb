class T2rController < ApplicationController

  def index
    @toggl_api_key = User.current.custom_field_value(UserCustomField.find_by_name('Toggl API Key'))
    @redmine_api_key = User.current.api_key
  end

end
