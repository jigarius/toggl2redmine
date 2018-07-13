class T2rController < ApplicationController

  menu_item :toggl2redmine

  def index
    @toggl_api_key = User.current.custom_field_value(UserCustomField.find_by_name('Toggl API Key'))
    @redmine_api_key = User.current.api_key
    @redmine_url = request.base_url
  end

end
