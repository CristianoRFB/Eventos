import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("login", "routes/login.tsx"),
  route("admin", "routes/admin.tsx"),
  route("admin/:orgId", "routes/organization.tsx"),
  route("admin/:orgId/events/:eventId", "routes/event.tsx"),
  route(
    "admin/:orgId/events/:eventId/editions/:editionId/cms",
    "routes/cms.tsx",
  ),
  route("platform", "routes/platform.tsx"),
  route("preview/:token", "routes/public.tsx", { id: "public-preview" }),
  route("_public/:slug", "routes/public.tsx", { id: "public-site" }),
] satisfies RouteConfig;
