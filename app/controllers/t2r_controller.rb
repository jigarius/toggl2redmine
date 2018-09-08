class T2rController < ApplicationController

  menu_item :toggl2redmine
  before_action :require_login, :validate_user

  # TODO: Check if user is allowed to log time.

  # Provides an interface for importing Toggl time entries to Redmine.
  def index
    @toggl_api_key = @user.custom_field_value(UserCustomField.find_by_name('Toggl API Key'))
    @redmine_api_key = @user.api_key
  end

  # Creates time entries from request data.
  def import
    # Prepare a Redmine time entry.
    @time_entry = TimeEntry.new(params[:time_entry])
    @time_entry.user = @user
    @time_entry.project = @time_entry.issue.project if @time_entry.issue.present?
    @project = @time_entry.project

    # If project associated to the time entry could be identified.
    if !@project.nil?
      # Check if the user is a member of the project.
      if !@project.members.pluck(:user_id).include?(@user.id)
        render :json => { :errors => "You are not a member of this project." }, :status => 403
        return
      end

      # Check if the user has permission to log time on the project.
      if !@user.allowed_to?(:log_time, @time_entry.project)
        render :json => { :errors => "You are not allowed to log time on this project." }, :status => 403
        return
      end
    end

    # Toggl IDs must be present.
    if !params['toggl_ids'].present?
      render :json => { :errors => "Parameter 'toggl_ids' must be present." }, :status => 400
      return
    end

    # Abort if Toggl entries have already been imported.
    # This prevents reimports for databases which do not support transactions.
    params[:toggl_ids].each do |toggl_id|
      toggl_time_entry = TogglTimeEntry.where(toggl_id: toggl_id)
      if !toggl_time_entry.empty?
        render :json => { :errors => 'Toggl ID has already been imported.' }, :status => 400
        return
      end
    end

    begin
      # Save the Redmine time entry and map each Toggl entry to it.
      ActiveRecord::Base.transaction do
        @time_entry.save!
        params[:toggl_ids].each do |toggl_id|
          toggl_time_entry = TogglTimeEntry.new(
            time_entry: @time_entry,
            toggl_id: toggl_id
          )
        toggl_time_entry.save!
        end
      end
    rescue => e
      render :json => { :errors => e.message }, :status => 400
      return
    end

    # Render response.
    render :json => { :time_entry => @time_entry }, :status => 201
  end

  # Determines the currently logged in user.
  def validate_user
    @user = User.current

    # Must have a Toggl API key.
    toggl_api_key = @user.custom_field_value(UserCustomField.find_by_name('Toggl API Key'))
    if toggl_api_key.nil? || toggl_api_key.empty?
      flash[:error] = 'To import time entries from Toggl, please add a Toggl API key to your account.'
      redirect_to :controller => 'my', :action => 'account'
    end
  end

end
