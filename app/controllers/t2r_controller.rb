class T2rController < ApplicationController

  menu_item :toggl2redmine
  before_action :require_login, :validate_user

  # TODO: Check if user is allowed to log time.
  # TODO: Respond in HTML / JSON according to format requested.
  # TODO: Redirect to login only for when HTML format is requested.

  # Provides an interface for importing Toggl time entries to Redmine.
  def index
    @toggl_api_key = @user.custom_field_value(UserCustomField.find_by_name('Toggl API Key'))
    @redmine_api_key = @user.api_key
  end

  # Reads time entries from Redmine.
  def read_redmine_time_entries
    # Require 'from' parameter.
    unless params[:from]
      render :json => { :errors => "Parameter 'from' must be present." }, :status => 403
      return
    end
    from = Time.parse(params[:from])

    # Require 'till' parameter.
    unless params[:till]
      render :json => { :errors => "Parameter 'till' must be present." }, :status => 403
      return
    end
    till = Time.parse(params[:till])

    # Load time entries in range.
    @time_entries = TimeEntry.where(
      user: @user,
      spent_on: from..till
    )

    # Return time entries with associations.
    render :json => { :time_entries => @time_entries },
      :include => {
        :issue => {
          :only => [:id, :subject, :tracker_id],
          :include => {
            :tracker => {
              :only => [:id, :name]
            }
          }
        },
        :project => {
          :only => [:id, :name, :closed]
        },
        :activity => {
          :only => [:id, :name]
        },
        :user => {
          :only => [:id, :login]
        }
      }
  end

  # Reads time entries from Toggl.
  def read_toggl_time_entries
    render_403
    return
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
    if !params[:toggl_ids].present?
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
      messages = [e.message]

      # If the transaction couldn't be rolled back, raise an alert.
      unless @time_entry.id.nil?
        @time_entry.delete
        messages.push('Your database does not support transactions. Please ask your system administrator to refer to the README for "Toggle 2 Redmine".');
      end

      render :json => { :errors => messages }, :status => 400
      return
    end

    # Render response.
    render :json => { :time_entry => @time_entry }, :status => 201
  end

  # Determines the currently logged in user.
  def validate_user
    @user = User.current

    # If a user is not logged in, throw a 403.
    if @user.nil?
      render_403
      return
    end

    # Must have a Toggl API key.
    toggl_api_key = @user.custom_field_value(UserCustomField.find_by_name('Toggl API Key'))
    if toggl_api_key.nil? || toggl_api_key.empty?
      flash[:error] = 'To import time entries from Toggl, please add a Toggl API key to your account.'
      redirect_to :controller => 'my', :action => 'account'
    end
  end

end
