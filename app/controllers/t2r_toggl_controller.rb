# frozen_string_literal: true

class T2rTogglController < T2rBaseController
  include Rails.application.routes.url_helpers

  def read_time_entries
    parse_params

    time_entries = toggl_service.load_time_entries(
      start_date: params[:from],
      end_date: params[:till],
      workspaces: params[:workspaces]
    )
    groups = TogglTimeEntryGroup.group(time_entries)

    result = groups.merge(groups) do |_, group|
      item = group.as_json
      item['issue'] = nil
      item['project'] = nil

      if group.issue && user_can_view_issue?(group.issue)
        item['issue'] =
          group.issue.as_json(
            only: %i[id subject],
            include: {
              tracker: { only: %i[id name] }
            }
          )
        item['issue']['path'] = issue_path(group.issue)
      end

      if group.project && user_is_member_of?(@user, group.project)
        item['project'] =
          group.project.as_json(only: %i[id name status])
        item['project']['path'] = project_path(group.project)
      end

      item
    end

    render json: result
  rescue ActionController::ParameterMissing => e
    render json: { errors: [e.message] }, status: 400
  rescue TogglService::Error => e
    response = e.response
    render json: { errors: response.body }, status: response.code
  end

  def read_workspaces
    @workspaces = toggl_service.load_workspaces
    render json: @workspaces
  end

  private

  def parse_params
    params[:from] = Time.parse(params.require(:from))
    params[:till] = Time.parse(params.require(:till))

    params[:workspaces] =
      params.fetch(:workspaces, '').split(',').map(&:to_i)
  end
end
