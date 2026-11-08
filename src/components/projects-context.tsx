'use client';

import { createContext, useContext } from 'react';
import type { ProjectInfo } from '@/lib/projects';

// The user's projects, for the forms that pick one (quick add, edit task)
// and the Projects dialog, wherever they sit on the page.

const ProjectsContext = createContext<ProjectInfo[]>([]);

export function ProjectsProvider({
  projects,
  children,
}: {
  projects: ProjectInfo[];
  children: React.ReactNode;
}) {
  return (
    <ProjectsContext.Provider value={projects}>
      {children}
    </ProjectsContext.Provider>
  );
}

export const useProjects = () => useContext(ProjectsContext);

/** A "Project" select for a task form. Hidden when there are no projects. */
export function ProjectSelect({
  id,
  defaultValue,
  className,
  labelClassName,
  hideLabel = false,
}: {
  id: string;
  defaultValue?: string | null;
  className: string;
  labelClassName?: string;
  hideLabel?: boolean;
}) {
  const projects = useProjects();
  if (projects.length === 0) return null;

  return (
    <label htmlFor={id} className={labelClassName}>
      <span className={hideLabel ? 'sr-only' : undefined}>Project</span>
      <select
        id={id}
        name="projectId"
        defaultValue={defaultValue ?? ''}
        className={className}
      >
        <option value="">No project</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
