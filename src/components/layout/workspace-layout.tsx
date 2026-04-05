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
    <div className="h-screen overflow-hidden p-3 sm:p-4">
      <div className="mx-auto grid h-full max-w-[1960px] grid-rows-[3.6rem_minmax(0,1fr)_2.7rem] gap-3">
        <div className="min-h-0">{topBar}</div>
        <div className="grid min-h-0 gap-3 xl:grid-cols-[15rem_minmax(0,1fr)_22rem]">
          <aside className="min-h-0 min-w-0 overflow-hidden">{leftSidebar}</aside>
          <main className="min-h-0 min-w-0 overflow-hidden">{centerStage}</main>
          <aside className="min-h-0 min-w-0 overflow-hidden">{rightSidebar}</aside>
        </div>
        <div className="min-h-0">{statusBar}</div>
      </div>
    </div>
  );
}
