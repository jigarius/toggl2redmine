class T2rController < ApplicationController

  def index
    @toggl_api_key = User.current.custom_field_value(UserCustomField.find_by_name('Toggl API Key'))
  end

end
