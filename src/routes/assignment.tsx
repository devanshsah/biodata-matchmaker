import { createFileRoute } from "@tanstack/react-router";
import diagramHtml from "@/assets/withdrawal-trace.html?raw";

// TEMPORARY — for an interview assignment. Delete this file and
// src/assets/withdrawal-trace.html when it's no longer needed
// (also remove the routeTree.gen.ts entry by re-running `npm run dev`).
export const Route = createFileRoute("/assignment")({
  component: AssignmentPage,
  head: () => ({
    meta: [
      { title: "Crypto Withdrawal — System Trace" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function AssignmentPage() {
  return (
    <iframe
      title="Crypto withdrawal system trace"
      srcDoc={diagramHtml}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: "none",
      }}
    />
  );
}
