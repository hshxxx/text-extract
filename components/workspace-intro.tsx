import type { ReactNode } from "react";

type WorkspaceIntroProps = {
  title: string;
  description: string;
  actions?: ReactNode;
};

export function WorkspaceIntro({ title, description, actions }: WorkspaceIntroProps) {
  return (
    <div className="workspace-intro">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="workspace-intro-actions">{actions}</div> : null}
    </div>
  );
}
