class T2rController < ApplicationController

  menu_item :toggl2redmine
  before_action :require_login, :require_toggl_api_key

  # TODO: Check for user permissions.

  def index
    @toggl_api_key = User.current.custom_field_value(UserCustomField.find_by_name('Toggl API Key'))
    @redmine_api_key = User.current.api_key
  end

  def import
    # Prepare a Redmine time entry.
    @time_entry = TimeEntry.new(params[:time_entry])
    @time_entry.user = User.current
    @time_entry.project = @time_entry.issue.project if @time_entry.issue.present?

    # User must have permission to log time on the project.
    if @time_entry.project && !User.current.allowed_to?(:log_time, @time_entry.project)
      render :json => { :errors => "You are not a member of this project" }, :status => 403
      return
    end

    # Toggl IDs must be present.
    if !params['toggl_ids'].present?
      render :json => { :errors => "Parameter 'toggl_ids' must be present" }, :status => 400
      return
    end

    # Save the Redmine time entry and map each Toggl entry to it.
    begin
      TimeEntry.transaction do
        @time_entry.save!
        params[:toggl_ids].each do |toggl_id|
          @toggl_time_entry = TogglTimeEntry.create(time_entry: @time_entry, toggl_id: toggl_id)
          @toggl_time_entry.save!
        end
      end
      render :json => { :time_entry => @time_entry }, :status => 201
    rescue
      errors = @time_entry.errors.full_messages
      errors += @toggl_time_entry.errors.full_messages if defined? @toggl_time_entry
      render :json => { :errors => errors }, :status => 400
    end
  end

  def require_toggl_api_key
    toggl_api_key = User.current.custom_field_value(UserCustomField.find_by_name('Toggl API Key'))
    if toggl_api_key.nil? || toggl_api_key.empty?
      flash[:error] = 'To import time entries from Toggl, please add a Toggl API key to your account.'
      redirect_to :controller => 'my', :action => 'account'
    end
  end

end
