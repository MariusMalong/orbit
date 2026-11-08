'use client';

import { useState, useTransition } from 'react';
import {
  createProject,
  deleteProject,
  updateProject,
} from '@/app/actions/projects';
import { Dialog } from '@/components/dialog';
import { useProjects } from '@/components/projects-context';
import {
  buttonPrimary,
  buttonSecondary,
  fieldInput,
  iconButtonDanger,
} from '@/components/ui-classes';
import {
  MAX_PROJECT_NAME_LENGTH,
  nextProjectColor,
  PROJECT_COLOR_NAMES,
  PROJECT_COLORS,
  projectDot,
  type ProjectColor,
  type ProjectInfo,
} from '@/lib/projects';

const selectClass =
  'min-h-11 rounded-lg border border-line bg-surface px-2 text-sm text-ink ' +
  'focus:border-ink focus:outline-none focus:ring-2 focus:ring-accent/40';

/** A button that opens the list of projects: add, rename, recolour, delete. */
export function ProjectsDialog({
  triggerClassName,
}: {
  triggerClassName: string;
}) {
  const projects = useProjects();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={triggerClassName}
      >
        Projects
      </button>
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        labelledBy="projects-heading"
        wide
      >
        <h2
          id="projects-heading"
          className="font-display text-lg font-semibold"
        >
          Projects
        </h2>
        <p className="mt-1 text-sm text-muted">
          Group tasks by what they&apos;re for. A project&apos;s colour marks
          its tasks on the plan. Deleting a project keeps its tasks.
        </p>

        <ul className="mt-4 flex flex-col gap-2">
          {projects.map((project) => (
            <li key={project.id}>
              <ProjectRow project={project} />
            </li>
          ))}
        </ul>

        <NewProject used={projects.map((p) => p.color)} />

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className={buttonSecondary}
          >
            Done
          </button>
        </div>
      </Dialog>
    </>
  );
}

function ColorSelect({
  id,
  value,
  onChange,
  label,
}: {
  id: string;
  value: ProjectColor;
  onChange: (color: ProjectColor) => void;
  label: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`h-3 w-3 shrink-0 rounded-full ${projectDot(value)}`}
      />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        name="color"
        value={value}
        onChange={(e) => onChange(e.target.value as ProjectColor)}
        className={selectClass}
      >
        {PROJECT_COLORS.map((c) => (
          <option key={c} value={c}>
            {PROJECT_COLOR_NAMES[c]}
          </option>
        ))}
      </select>
    </span>
  );
}

function ProjectRow({ project }: { project: ProjectInfo }) {
  const [color, setColor] = useState(project.color);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={async (formData) => {
        setError((await updateProject(formData)) ?? '');
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="projectId" value={project.id} />
      <ColorSelect
        id={`project-color-${project.id}`}
        value={color}
        onChange={setColor}
        label={`Colour for ${project.name}`}
      />
      <label htmlFor={`project-name-${project.id}`} className="sr-only">
        Name of {project.name}
      </label>
      <input
        id={`project-name-${project.id}`}
        name="name"
        defaultValue={project.name}
        required
        maxLength={MAX_PROJECT_NAME_LENGTH}
        className={`${fieldInput} min-w-40 flex-1`}
      />
      <button type="submit" className={buttonSecondary}>
        Save<span className="sr-only"> {project.name}</span>
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const formData = new FormData();
            formData.set('projectId', project.id);
            await deleteProject(formData);
          })
        }
        aria-label={`Delete ${project.name}`}
        className={iconButtonDanger}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
        </svg>
      </button>
      {error && (
        <p role="alert" className="basis-full text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

function NewProject({ used }: { used: ProjectColor[] }) {
  const suggested = nextProjectColor(used);
  const [color, setColor] = useState<ProjectColor | null>(null);
  const [error, setError] = useState('');

  return (
    <form
      action={async (formData) => {
        const message = await createProject(formData);
        setError(message ?? '');
        if (!message) setColor(null);
      }}
      className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3"
    >
      <ColorSelect
        id="new-project-color"
        value={color ?? suggested}
        onChange={setColor}
        label="Colour for the new project"
      />
      <label htmlFor="new-project-name" className="sr-only">
        New project name
      </label>
      <input
        id="new-project-name"
        name="name"
        placeholder="New project, e.g. Thesis"
        required
        maxLength={MAX_PROJECT_NAME_LENGTH}
        className={`${fieldInput} min-w-40 flex-1`}
      />
      <button type="submit" className={buttonPrimary}>
        Add project
      </button>
      {error && (
        <p role="alert" className="basis-full text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
