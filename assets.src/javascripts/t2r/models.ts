export interface TimeLogActivity {
  id: number
  name: string
  is_default?: boolean
  active?: boolean
}

export interface Issue {
  id: number
  subject: string
  path: string
  tracker: Tracker
}

export interface Project {
  id: number
  name: string
  path: string
  status: number // todo: Use enum?
}

export interface Tracker {
  id: number
  name: string
}

export interface TimeEntry {
  id: number
  hours: string
  comments: string
  activity: TimeLogActivity
  issue: Issue
  project: Project
}

export interface TogglWorkspace {
  id: number
  name: string
}

export interface TogglTimeEntry {
  key: string
  comments: string
  duration: number
  errors: string[]
  ids: number[]
  issue_id: number
  status: string // todo: Use enum?
  issue: Issue
  project: Project
}
