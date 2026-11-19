import { createFileRoute } from "@tanstack/react-router";
import FitApp from "@/fit/FitApp";

export const Route = createFileRoute("/fit")({
  component: FitApp,
  head: () => ({
    meta: [
      { title: "DEVANSH.OS" },
      { name: "robots", content: "noindex" },
    ],
  }),
});
