class T2rController < ApplicationController

  menu_item :toggl2redmine
  before_action :require_login, :validate_user

  # TODO: Check for user permissions.

  def index
    @toggl_api_key = @user.custom_field_value(UserCustomField.find_by_name('Toggl API Key'))
    @redmine_api_key = @user.api_key
  end

  def import
    # Prepare a Redmine time entry.
    @time_entry = TimeEntry.new(params[:time_entry])
    @time_entry.user = @user
    @time_entry.project = @time_entry.issue.project if @time_entry.issue.present?

    # User must have permission to log time on the project.
    if !@time_entry.project.nil? && !@user.allowed_to?(:log_time, @time_entry.project)
      render :json => { :errors => "You are not allowed to log time on this project." }, :status => 403
      return
    end

    # Toggl IDs must be present.
    if !params['toggl_ids'].present?
      render :json => { :errors => "Parameter 'toggl_ids' must be present." }, :status => 400
      return
    end

    # Check if any of the Toggl entries has already been imported.
    # Transactions and rollbacks are not very reliable due to idiosyncrasies.
    params[:toggl_ids].each do |toggl_id|
      toggl_time_entry = TogglTimeEntry.where(toggl_id: toggl_id)
      if !toggl_time_entry.empty?
        render :json => { :errors => 'Toggl ID has already been imported.' }, :status => 400
        return
      end
    end

    # Save the Redmine time entry and map each Toggl entry to it.
    toggl_time_entries = []
    begin
        @time_entry.save!
        params[:toggl_ids].each do |toggl_id|
        toggl_time_entry = TogglTimeEntry.new(time_entry: @time_entry, toggl_id: toggl_id)
        toggl_time_entry.save!
        toggl_time_entries.push(toggl_time_entry)
        end
    rescue
      # Capture errors and delete the time entry if it was saved.
      errors = @time_entry.errors.full_messages
      @time_entry.delete unless @time_entry.id.nil?

      # Capture errors and delete all created Toggl mappings.
      toggl_time_entries.each do |toggl_time_entry|
        errors += toggl_time_entry.errors.full_messages
        toggl_time_entry.delete
      end

      # Render response.
      render :json => { :errors => errors }, :status => 400
      return
    end

    # Render response.
    render :json => { :time_entry => @time_entry }, :status => 201
  end

  def validate_user
    @user = User.current

    # Must have a Toggl API key.
    toggl_api_key = @user.custom_field_value(UserCustomField.find_by_name('Toggl API Key'))
    if toggl_api_key.nil? || toggl_api_key.empty?
      flash[:error] = 'To import time entries from Toggl, please add a Toggl API key to your account.'
      redirect_to :controller => 'my', :action => 'account'
    end

    # Must have a timezone preference.
    if @user.preference.time_zone.empty?
      flash[:error] = 'For time reports to show correctly, please configure your time zone.'
      redirect_to :controller => 'my', :action => 'account'
    end
  end

end
