import type { ReactNode } from "react";

type WorkspaceLayoutProps = {
  topBar: ReactNode;
  leftSidebar: ReactNode;
  centerStage: ReactNode;
  rightSidebar: ReactNode;
  statusBar: ReactNode;
};

export function WorkspaceLayout({
  topBar,
  leftSidebar,
  centerStage,
  rightSidebar,
  statusBar,
}: WorkspaceLayoutProps) {
  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex max-w-[1780px] flex-col gap-5">
        {topBar}
        <div className="grid min-h-0 gap-5 xl:grid-cols-[17rem_minmax(0,1fr)_23rem]">
          <aside className="min-w-0">{leftSidebar}</aside>
          <main className="min-w-0">{centerStage}</main>
          <aside className="min-w-0">{rightSidebar}</aside>
        </div>
        {statusBar}
      </div>
    </div>
  );
}
