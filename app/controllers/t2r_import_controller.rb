# frozen_string_literal: true

# Toggl2Redmine Import controller.
class T2rImportController < T2rBaseController
  menu_item :toggl2redmine

  class ImportError < StandardError; end

  class MembershipError < StandardError; end

  class PermissionError < StandardError; end

  class DuplicateImportError < StandardError; end

  def index
    @translations = translation_hash(
      't2r.error.ajax_load',
      't2r.error.list_empty'
    )
  end

  def import
    parse_params
    import_check_permissions

    # Save the Redmine time entry and map Toggl time entries to it.
    ActiveRecord::Base.transaction do
      @time_entry.save!
      params[:toggl_ids].each do |toggl_id|
        TogglMapping.create!(time_entry: @time_entry, toggl_id: toggl_id)
      end
    end

    render json: true, status: 201
  rescue ActionController::ParameterMissing,
         ActiveRecord::RecordInvalid,
         DuplicateImportError => e
    render json: { errors: [e.message] }, status: 400
  rescue MembershipError,
         PermissionError => e
    render json: { errors: [e.message] }, status: 403
  rescue ActiveRecord::ActiveRecordError => e
    messages = [e.message]

    # If the transaction couldn't be rolled back, raise an alert.
    if @time_entry.id
      @time_entry.delete
      messages << I18n.t('t2r.text_db_transaction_warning')
    end

    render json: { errors: messages }, status: 503
  end

  private

  # Parses request parameters for "import" action.
  #
  # - Prepares a @time_entry object
  # - Prepares a @toggl_ids array
  def parse_params
    params[:toggl_ids]&.keep_if { |id| id.respond_to?(:to_i) && id.to_i.positive? }
    @toggl_ids = params.require(:toggl_ids)

    # Abort if Toggl entries have already been imported.
    # This prevents re-imports for DBs without transaction support.
    if TogglMapping.where(toggl_id: params[:toggl_ids]).count.positive?
      raise DuplicateImportError, 'Toggl ID has already been imported.'
    end

    @time_entry = TimeEntry.new do |te|
      attributes = params.require(:time_entry)
        .permit(
          :activity_id,
          :comments,
          :hours,
          :issue_id,
          :spent_on
        )
      te.assign_attributes(attributes)
      te.user = @user
      te.project = te&.issue&.project || Project.find_by_id(params.dig(:project_info, :id))
      te.validate!
    end
  end

  def import_check_permissions
    return if @user.admin? || @time_entry.project.nil?

    unless user_is_member_of?(@user, @time_entry.project)
      raise MembershipError, 'You are not a member of this project.'
    end

    return if @user.allowed_to?(:log_time, @time_entry.project)

    raise PermissionError, 'You are not allowed to log time on this project.'
  end

  def translation_hash(*keys)
    result = {}
    keys.each { |k| result[k] = I18n.t(k) }
    result
  end
end
